import Papa from 'papaparse';
import { OrderItem, ExpenseItem, CashflowItem, BatchSummary, DashboardMetrics } from '../types';

export const SPREADSHEET_ID = '1CyxgDHZAuE5iH5jB7YbHCEuJ9awKmNhJ0-IzV4BGvY4';

export const GIDS = {
  ORDERS: '351713628',
  EXPENSES: '784188198',
  CASHFLOW: '272779280',
  PROFIT_ANALYSIS: '0',
};

// Helper: parse Indonesian currency or standard number strings e.g. "21,000", "-33,000", " 150,000 "
export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  
  const str = String(val).trim();
  if (!str) return 0;
  
  // Clean currency symbols, spaces, quotes
  const isNegative = str.includes('-') || (str.startsWith('(') && str.endsWith(')'));
  const cleanStr = str.replace(/[^\d.,]/g, '').replace(/,/g, '');
  const num = parseFloat(cleanStr);
  
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : Math.abs(num);
}

export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(absVal);
  return isNegative ? `-${formatted}` : formatted;
}

export function determineCategory(item: string): 'Bahan Baku' | 'Kemasan' | 'Operasional' {
  const lower = item.toLowerCase();
  if (
    lower.includes('cup') ||
    lower.includes('plastik') ||
    lower.includes('sendok') ||
    lower.includes('thinwall') ||
    lower.includes('stiker') ||
    lower.includes('kemasan') ||
    lower.includes('kresek')
  ) {
    return 'Kemasan';
  }
  if (
    lower.includes('gas') ||
    lower.includes('air') ||
    lower.includes('ongkir') ||
    lower.includes('listrik') ||
    lower.includes('bensin')
  ) {
    return 'Operasional';
  }
  return 'Bahan Baku';
}

// Fetch CSV from Google Sheets with fallbacks
async function fetchSheetCsv(sheetId: string, gid: string): Promise<string> {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${Date.now()}`;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_t=${Date.now()}`;

  try {
    const res = await fetch(gvizUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`GViz fetch failed for GID ${gid}, trying export URL...`, err);
    const res = await fetch(exportUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }
}

// Parse Orders / Penjualan (GID: 351713628)
export async function fetchOrders(sheetId = SPREADSHEET_ID): Promise<OrderItem[]> {
  try {
    const csvText = await fetchSheetCsv(sheetId, GIDS.ORDERS);
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
    const rows = parsed.data;

    const orders: OrderItem[] = [];
    // Row 0 is header: Tanggal Pesanan, Nama Pemesan, Qty, Amount, Paid/Not Paid, Note, Pembayaran, Column 1 (Batch)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const tanggal = (row[0] || '').trim();
      const namaPemesan = (row[1] || '').trim();
      const qty = parseNumber(row[2]);
      const amount = parseNumber(row[3]);
      const statusRaw = (row[4] || '').trim();
      const note = (row[5] || '').trim();
      const pembayaran = (row[6] || '').trim();
      const batchRaw = (row[7] || '').trim();

      // Skip summary / total rows or empty rows
      if (!namaPemesan || namaPemesan.toLowerCase().includes('total') || isNaN(qty) || qty <= 0) {
        continue;
      }

      const status = statusRaw.toLowerCase().includes('paid') && !statusRaw.toLowerCase().includes('not')
        ? 'Paid'
        : 'Not Paid';

      // Check if batch is an actual text like "Pagi" or "Malam", not a summary number like "15" or "17"
      const isActualBatch = batchRaw && isNaN(Number(batchRaw)) && !batchRaw.includes(',');
      const batch = isActualBatch ? batchRaw : undefined;

      orders.push({
        id: `ord-${i}-${namaPemesan.replace(/\s+/g, '_')}`,
        tanggal,
        namaPemesan,
        qty,
        amount,
        status,
        note,
        pembayaran: pembayaran || (status === 'Paid' ? 'BCA' : '-'),
        batch,
      });
    }

    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return getFallbackOrders();
  }
}

// Parse Expenses / Pembelian Bahan & Kemasan (GID: 784188198)
export async function fetchExpenses(sheetId = SPREADSHEET_ID): Promise<ExpenseItem[]> {
  try {
    const csvText = await fetchSheetCsv(sheetId, GIDS.EXPENSES);
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
    const rows = parsed.data;

    const expenses: ExpenseItem[] = [];
    // Header: Tanggal Pembelian, Item, Unit Price, Qty, Total Amount, Sisa Qty
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const tanggal = (row[0] || '').trim();
      const item = (row[1] || '').trim();
      const unitPrice = parseNumber(row[2]);
      const qty = parseNumber(row[3]);
      const totalAmount = parseNumber(row[4]);
      const sisaQty = row[6] ? row[6].trim() : '';

      // Skip subtotal rows or blank item rows
      if (!item || item.toLowerCase().includes('total') || totalAmount <= 0) {
        continue;
      }

      expenses.push({
        id: `exp-${i}-${item.replace(/\s+/g, '_')}`,
        tanggal,
        item,
        unitPrice,
        qty,
        totalAmount,
        sisaQty: sisaQty || '-',
        category: determineCategory(item),
        rowIndex: i + 1,
      });
    }

    return expenses;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return getFallbackExpenses();
  }
}

// Parse Cashflow / Buku Kas (GID: 272779280)
export async function fetchCashflow(sheetId = SPREADSHEET_ID): Promise<CashflowItem[]> {
  try {
    const csvText = await fetchSheetCsv(sheetId, GIDS.CASHFLOW);
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
    const rows = parsed.data;

    const cashflows: CashflowItem[] = [];
    // Look for header row that has "Tanggal" and "Transaksi"
    let headerIndex = -1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (rows[i] && rows[i].some(col => String(col).toLowerCase().includes('transaksi'))) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) headerIndex = 1;

    let colTanggal = 0;
    let colTransaksi = 1;
    let colDebit = 2;
    let colKredit = 3;
    let colBalance = 4;

    if (headerIndex !== -1 && rows[headerIndex]) {
      const headerRow = rows[headerIndex].map((c) => String(c).trim().toLowerCase());
      headerRow.forEach((name, idx) => {
        if (name.includes('tanggal') || name.includes('tgl') || name.includes('date')) colTanggal = idx;
        else if (name.includes('transaksi') || name.includes('keterangan') || name.includes('item') || name.includes('desc')) colTransaksi = idx;
        else if (name === 'dr' || name.includes('debit') || name.includes('masuk')) colDebit = idx;
        else if (name === 'cr' || name.includes('kredit') || name.includes('keluar')) colKredit = idx;
        else if (name.includes('balance') || name.includes('saldo')) colBalance = idx;
      });
    }

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const tanggal = (row[colTanggal] || '').trim();
      const transaksi = (row[colTransaksi] || '').trim();
      const debitRaw = row[colDebit];
      const kreditRaw = row[colKredit];
      const balanceRaw = row[colBalance];

      if (!tanggal && !transaksi) continue;
      if (!transaksi) continue;

      // In the spreadsheet, Cr is formatted as a negative number e.g. "-33,000"
      // We take Math.abs so kredit is recorded as the positive magnitude of the expense
      const debit = Math.abs(parseNumber(debitRaw));
      const kredit = Math.abs(parseNumber(kreditRaw));
      const balance = parseNumber(balanceRaw);

      cashflows.push({
        id: `cf-${i}`,
        tanggal,
        transaksi,
        debit: debit > 0 ? debit : 0,
        kredit: kredit > 0 ? kredit : 0,
        balance,
        tipe: debit > 0 ? 'Masuk' : 'Keluar',
      });
    }

    return cashflows;
  } catch (error) {
    console.error('Error fetching cashflow:', error);
    return getFallbackCashflow();
  }
}

// Post updated order status to Google Sheets via Google Apps Script Web App
export async function postOrderStatusToSheet(order: OrderItem): Promise<boolean> {
  const url = localStorage.getItem('mango_apps_script_url');
  if (!url || !url.startsWith('http')) return false;

  const params = new URLSearchParams({
    type: 'update_status',
    tanggal: order.tanggal,
    namaPemesan: order.namaPemesan,
    status: order.status,
    pembayaran: order.pembayaran || '',
    note: order.note || '',
  });

  const fullUrl = `${url}?${params.toString()}`;

  try {
    await fetch(fullUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        type: 'update_status',
        tanggal: order.tanggal,
        namaPemesan: order.namaPemesan,
        status: order.status,
        pembayaran: order.pembayaran,
        note: order.note || '',
      }),
    });
    return true;
  } catch (err) {
    console.error('Failed to update order status in sheet:', err);
    return false;
  }
}

// Post data to Google Sheets via Google Apps Script Web App
export async function postOrderToSheet(order: OrderItem): Promise<boolean> {
  const url = localStorage.getItem('mango_apps_script_url');
  if (!url || !url.startsWith('http')) return false;

  const params = new URLSearchParams({
    type: 'order',
    tanggal: order.tanggal,
    namaPemesan: order.namaPemesan,
    qty: String(order.qty),
    amount: String(order.amount),
    status: order.status,
    note: order.note || '',
    pembayaran: order.pembayaran || '',
    batch: order.batch || '',
  });

  const fullUrl = `${url}?${params.toString()}`;

  try {
    await fetch(fullUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        type: 'order',
        tanggal: order.tanggal,
        namaPemesan: order.namaPemesan,
        qty: order.qty,
        amount: order.amount,
        status: order.status,
        note: order.note,
        pembayaran: order.pembayaran,
        batch: order.batch || '',
      }),
    });
    return true;
  } catch (err) {
    console.error('Failed to post order to sheet:', err);
    return false;
  }
}

export async function postExpenseToSheet(expense: ExpenseItem): Promise<boolean> {
  const url = localStorage.getItem('mango_apps_script_url');
  if (!url || !url.startsWith('http')) return false;

  const params = new URLSearchParams({
    type: 'expense',
    tanggal: expense.tanggal,
    item: expense.item,
    unitPrice: String(expense.unitPrice),
    qty: String(expense.qty),
    totalAmount: String(expense.totalAmount),
    sisaQty: String(expense.sisaQty || ''),
  });

  const fullUrl = `${url}?${params.toString()}`;

  try {
    await fetch(fullUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        type: 'expense',
        tanggal: expense.tanggal,
        item: expense.item,
        unitPrice: expense.unitPrice,
        qty: expense.qty,
        totalAmount: expense.totalAmount,
        sisaQty: expense.sisaQty || '',
      }),
    });
    return true;
  } catch (err) {
    console.error('Failed to post expense to sheet:', err);
    return false;
  }
}

// Post multiple expenses (batch) to Google Sheets
export async function postExpensesBatchToSheet(expenses: ExpenseItem[]): Promise<boolean> {
  const url = localStorage.getItem('mango_apps_script_url');
  if (!url || !url.startsWith('http') || expenses.length === 0) return false;

  try {
    // Also send as batch payload
    const batchPayload = {
      type: 'expenses_batch',
      items: expenses.map((exp) => ({
        tanggal: exp.tanggal,
        item: exp.item,
        unitPrice: exp.unitPrice,
        qty: exp.qty,
        totalAmount: exp.totalAmount,
        sisaQty: exp.sisaQty || '',
        category: exp.category,
      })),
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(batchPayload),
    });

    // Also post sequentially to guarantee backward compatibility with existing deployments
    for (const exp of expenses) {
      await postExpenseToSheet(exp);
    }
    return true;
  } catch (err) {
    console.error('Failed to post expenses batch to sheet:', err);
    return false;
  }
}

// Update Sisa Qty of an expense item in Google Sheets
export async function postExpenseSisaQtyToSheet(expense: ExpenseItem, newSisaQty: string | number): Promise<boolean> {
  const url = localStorage.getItem('mango_apps_script_url');
  if (!url || !url.startsWith('http')) return false;

  const sisaStr = String(newSisaQty).trim();
  const rowIndexStr = expense.rowIndex ? String(expense.rowIndex) : '';

  const params = new URLSearchParams({
    type: 'update_expense_sisa',
    tanggal: expense.tanggal,
    item: expense.item,
    sisaQty: sisaStr,
    rowIndex: rowIndexStr,
  });

  const fullUrl = `${url}?${params.toString()}`;

  try {
    await fetch(fullUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        type: 'update_expense_sisa',
        tanggal: expense.tanggal,
        item: expense.item,
        sisaQty: sisaStr,
        rowIndex: rowIndexStr,
      }),
    });
    return true;
  } catch (err) {
    console.error('Failed to update expense sisa qty in sheet:', err);
    return false;
  }
}

// Calculate Dashboard Metrics
export function calculateMetrics(
  orders: OrderItem[],
  expenses: ExpenseItem[],
  cashflow: CashflowItem[]
): DashboardMetrics {
  const totalRevenue = orders.reduce((sum, ord) => sum + ord.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalCupsSold = orders.reduce((sum, ord) => sum + ord.qty, 0);
  const totalOrders = orders.length;

  const paidAmount = orders
    .filter(ord => ord.status === 'Paid')
    .reduce((sum, ord) => sum + ord.amount, 0);

  const unpaidOrders = orders.filter(ord => ord.status === 'Not Paid');
  const unpaidAmount = unpaidOrders.reduce((sum, ord) => sum + ord.amount, 0);
  const unpaidOrdersCount = unpaidOrders.length;

  const currentBalance = cashflow.length > 0 ? cashflow[cashflow.length - 1].balance : 232375;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    totalCupsSold,
    totalOrders,
    paidAmount,
    unpaidAmount,
    unpaidOrdersCount,
    currentBalance,
  };
}

// Fallback data mirroring the exact spreadsheet snapshot
function getFallbackOrders(): OrderItem[] {
  return [
    { id: '1', tanggal: '26 Oct 26', namaPemesan: 'Della', qty: 1, amount: 21000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '2', tanggal: '26 Oct 26', namaPemesan: 'Milla', qty: 1, amount: 21000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'Cash' },
    { id: '3', tanggal: '26 Oct 26', namaPemesan: 'Citra', qty: 3, amount: 63000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '4', tanggal: '26 Oct 26', namaPemesan: 'Anggreta', qty: 2, amount: 42000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '5', tanggal: '26 Oct 26', namaPemesan: 'Andrew Doloksaribu', qty: 2, amount: 42000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '6', tanggal: '26 Oct 26', namaPemesan: 'Hayu', qty: 5, amount: 100000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '7', tanggal: '26 Oct 26', namaPemesan: 'Caca', qty: 1, amount: 21000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '8', tanggal: '27 Oct 26', namaPemesan: 'Finance Dhost', qty: 6, amount: 126000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '9', tanggal: '27 Oct 26', namaPemesan: 'SMT Dhost', qty: 2, amount: 42000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '10', tanggal: '27 Oct 26', namaPemesan: 'Sales Dhost', qty: 2, amount: 42000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '11', tanggal: '27 Oct 26', namaPemesan: 'Ellen', qty: 1, amount: 21000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '12', tanggal: '27 Oct 26', namaPemesan: 'Bg Barth', qty: 1, amount: 21000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '13', tanggal: '27 Oct 26', namaPemesan: 'Tuti', qty: 3, amount: 63000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '14', tanggal: '27 Oct 26', namaPemesan: 'Bayu', qty: 1, amount: 21000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '15', tanggal: '27 Oct 26', namaPemesan: 'El', qty: 1, amount: 21000, status: 'Paid', note: 'Sudah diterima', pembayaran: 'BCA' },
    { id: '16', tanggal: '3 Nov 26', namaPemesan: 'Pak Dex Dhost', qty: 5, amount: 105000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '17', tanggal: '3 Nov 26', namaPemesan: 'Pak Ismart Dhost', qty: 10, amount: 210000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '18', tanggal: '3 Nov 26', namaPemesan: 'Oslo', qty: 1, amount: 21000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '19', tanggal: '3 Nov 26', namaPemesan: 'Mba Tari', qty: 2, amount: 42000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '20', tanggal: '3 Nov 26', namaPemesan: 'Ci Santina Dhost', qty: 2, amount: 42000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '21', tanggal: '3 Nov 26', namaPemesan: 'Sasa', qty: 1, amount: 21000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '22', tanggal: '3 Nov 26', namaPemesan: 'Farid', qty: 1, amount: 21000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '23', tanggal: '3 Nov 26', namaPemesan: 'Mba Atty', qty: 1, amount: 21000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '24', tanggal: '3 Nov 26', namaPemesan: 'Anggreta', qty: 3, amount: 63000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Malam' },
    { id: '25', tanggal: '3 Nov 26', namaPemesan: 'Renold', qty: 2, amount: 42000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '26', tanggal: '3 Nov 26', namaPemesan: 'Teman Ellen', qty: 4, amount: 84000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '27', tanggal: '3 Nov 26', namaPemesan: 'Ka Oik', qty: 2, amount: 21000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '28', tanggal: '3 Nov 26', namaPemesan: 'Ka Citra', qty: 2, amount: 42000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '29', tanggal: '3 Nov 26', namaPemesan: 'Mba Juni Dhost', qty: 3, amount: 63000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-', batch: 'Pagi' },
    { id: '30', tanggal: '5 Nov 26', namaPemesan: 'Ka Niken', qty: 1, amount: 21000, status: 'Not Paid', note: 'Belum diterima', pembayaran: '-' },
  ];
}

function getFallbackExpenses(): ExpenseItem[] {
  return [
    { id: '1', tanggal: '25 Oct 26', item: 'Evaporasi Carnation', unitPrice: 19200, qty: 5, totalAmount: 96000, sisaQty: '1', category: 'Bahan Baku' },
    { id: '2', tanggal: '25 Oct 26', item: 'Gula Pasir', unitPrice: 18, qty: 1000, totalAmount: 17500, sisaQty: '0.75', category: 'Bahan Baku' },
    { id: '3', tanggal: '25 Oct 26', item: 'Kental Manis Carnation', unitPrice: 1308, qty: 6, totalAmount: 7850, sisaQty: '5', category: 'Bahan Baku' },
    { id: '4', tanggal: '25 Oct 26', item: 'Nutrijell', unitPrice: 5115, qty: 6, totalAmount: 30690, sisaQty: '1', category: 'Bahan Baku' },
    { id: '5', tanggal: '25 Oct 26', item: 'Mangga Golek', unitPrice: 3600, qty: 5, totalAmount: 18000, sisaQty: '0', category: 'Bahan Baku' },
    { id: '6', tanggal: '25 Oct 26', item: 'Mangga Harum Manis', unitPrice: 3750, qty: 4, totalAmount: 15000, sisaQty: '1', category: 'Bahan Baku' },
    { id: '7', tanggal: '25 Oct 26', item: 'Sagu Mutiara', unitPrice: 17000, qty: 1, totalAmount: 17000, sisaQty: '0', category: 'Bahan Baku' },
    { id: '8', tanggal: '25 Oct 26', item: 'Nata Coco', unitPrice: 19600, qty: 1, totalAmount: 19600, sisaQty: '0', category: 'Bahan Baku' },
    { id: '9', tanggal: '25 Oct 26', item: 'Plastik 20x40', unitPrice: 571, qty: 28, totalAmount: 15996, sisaQty: '26', category: 'Kemasan' },
    { id: '10', tanggal: '25 Oct 26', item: 'Plastik 15x33', unitPrice: 381, qty: 42, totalAmount: 15996, sisaQty: '33', category: 'Kemasan' },
    { id: '11', tanggal: '25 Oct 26', item: 'Sendok Plastik Putih', unitPrice: 310, qty: 50, totalAmount: 15500, sisaQty: '18', category: 'Kemasan' },
    { id: '12', tanggal: '25 Oct 26', item: 'Sendok Plastik HItam', unitPrice: 443, qty: 50, totalAmount: 22161, sisaQty: '50', category: 'Kemasan' },
    { id: '13', tanggal: '25 Oct 26', item: 'Thinwall', unitPrice: 516, qty: 25, totalAmount: 12904, sisaQty: '0', category: 'Kemasan' },
    { id: '14', tanggal: '26 Oct 26', item: 'Cup 25 pcs', unitPrice: 703, qty: 25, totalAmount: 17580, sisaQty: '18', category: 'Kemasan' },
    { id: '15', tanggal: '26 Oct 26', item: 'Mangga Golek', unitPrice: 18000, qty: 1, totalAmount: 18000, sisaQty: '0', category: 'Bahan Baku' },
    { id: '16', tanggal: '26 Oct 26', item: 'Mangga Harum Manis', unitPrice: 14000, qty: 1, totalAmount: 14000, sisaQty: '0', category: 'Bahan Baku' },
    { id: '17', tanggal: '26 Oct 26', item: 'Nata Coco', unitPrice: 19600, qty: 1, totalAmount: 19600, sisaQty: '0', category: 'Bahan Baku' },
    { id: '18', tanggal: '26 Oct 26', item: 'Sagu Mutiara', unitPrice: 40, qty: 250, totalAmount: 10000, sisaQty: '125', category: 'Bahan Baku' },
    { id: '19', tanggal: '26 Oct 26', item: 'Nutrijell Mangga', unitPrice: 4000, qty: 1, totalAmount: 4000, sisaQty: '1', category: 'Bahan Baku' },
    { id: '20', tanggal: '26 Oct 26', item: 'Gas', unitPrice: 5000, qty: 2, totalAmount: 10000, sisaQty: '0', category: 'Operasional' },
    { id: '21', tanggal: '26 Oct 26', item: 'Air', unitPrice: 5000, qty: 2, totalAmount: 10000, sisaQty: '0', category: 'Operasional' },
    { id: '22', tanggal: '26 Oct 26', item: 'Stiker Bulat', unitPrice: 98, qty: 98, totalAmount: 9604, sisaQty: '66', category: 'Kemasan' },
    { id: '23', tanggal: '26 Oct 26', item: 'Stiker Panjang', unitPrice: 286, qty: 49, totalAmount: 14014, sisaQty: '49', category: 'Kemasan' },
    { id: '24', tanggal: '26 Oct 26', item: 'Stiker Kotak', unitPrice: 110, qty: 33, totalAmount: 3630, sisaQty: '33', category: 'Kemasan' },
  ];
}

function getFallbackCashflow(): CashflowItem[] {
  return [
    { id: 'cf-1', tanggal: '25 Oct 26', transaksi: 'Mangga', debit: 0, kredit: 33000, balance: -33000, tipe: 'Keluar' },
    { id: 'cf-2', tanggal: '25 Oct 26', transaksi: 'Susu Evaporasi', debit: 0, kredit: 96000, balance: -129000, tipe: 'Keluar' },
    { id: 'cf-3', tanggal: '25 Oct 26', transaksi: 'Susu SKM', debit: 0, kredit: 7850, balance: -136850, tipe: 'Keluar' },
    { id: 'cf-4', tanggal: '25 Oct 26', transaksi: 'Jelly Mangga', debit: 0, kredit: 30690, balance: -167540, tipe: 'Keluar' },
    { id: 'cf-5', tanggal: '26 Oct 26', transaksi: 'Mila', debit: 21000, kredit: 0, balance: -283197, tipe: 'Masuk' },
    { id: 'cf-6', tanggal: '26 Oct 26', transaksi: 'Citra', debit: 63000, kredit: 0, balance: -220197, tipe: 'Masuk' },
    { id: 'cf-7', tanggal: '26 Oct 26', transaksi: 'Andrew', debit: 42000, kredit: 0, balance: -178197, tipe: 'Masuk' },
    { id: 'cf-8', tanggal: '26 Oct 26', transaksi: 'Hayu', debit: 100000, kredit: 0, balance: -78197, tipe: 'Masuk' },
    { id: 'cf-9', tanggal: '27 Oct 26', transaksi: 'Finance Dhost', debit: 126000, kredit: 0, balance: 1375, tipe: 'Masuk' },
    { id: 'cf-10', tanggal: '27 Oct 26', transaksi: 'SMT Dhost', debit: 42000, kredit: 0, balance: 43375, tipe: 'Masuk' },
    { id: 'cf-11', tanggal: '27 Oct 26', transaksi: 'Sales Dhost', debit: 42000, kredit: 0, balance: 85375, tipe: 'Masuk' },
    { id: 'cf-12', tanggal: '27 Oct 26', transaksi: 'Ellen', debit: 21000, kredit: 0, balance: 106375, tipe: 'Masuk' },
    { id: 'cf-13', tanggal: '27 Oct 26', transaksi: 'Bg Barth', debit: 21000, kredit: 0, balance: 127375, tipe: 'Masuk' },
    { id: 'cf-14', tanggal: '27 Oct 26', transaksi: 'Tuti', debit: 63000, kredit: 0, balance: 190375, tipe: 'Masuk' },
    { id: 'cf-15', tanggal: '27 Oct 26', transaksi: 'Bayu', debit: 21000, kredit: 0, balance: 211375, tipe: 'Masuk' },
    { id: 'cf-16', tanggal: '27 Oct 26', transaksi: 'El', debit: 21000, kredit: 0, balance: 232375, tipe: 'Masuk' },
  ];
}

