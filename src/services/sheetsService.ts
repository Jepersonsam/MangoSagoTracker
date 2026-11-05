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
      let unitPrice = parseNumber(row[2]);
      let qty = parseNumber(row[3]);
      let totalAmount = parseNumber(row[4]);
      const sisaQty = row[6] ? row[6].trim() : '';

      // Skip subtotal rows or blank item rows
      if (!item || !tanggal || item.toLowerCase().includes('total')) {
        continue;
      }

      if (qty <= 0 && totalAmount > 0) qty = 1;
      if (unitPrice <= 0 && totalAmount > 0 && qty > 0) {
        unitPrice = Math.round(totalAmount / qty);
      }

      expenses.push({
        id: `exp-${i}-${item.replace(/\s+/g, '_')}`,
        tanggal,
        item,
        unitPrice,
        qty,
        totalAmount,
        sisaQty: sisaQty || '0',
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
  {
    "id": "1",
    "tanggal": "26 Oct 26",
    "namaPemesan": "Della",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "2",
    "tanggal": "26 Oct 26",
    "namaPemesan": "Milla",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "Cash",
    "batch": null
  },
  {
    "id": "3",
    "tanggal": "26 Oct 26",
    "namaPemesan": "Citra",
    "qty": 3,
    "amount": 63000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "4",
    "tanggal": "26 Oct 26",
    "namaPemesan": "Anggreta",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "5",
    "tanggal": "26 Oct 26",
    "namaPemesan": "Andrew Doloksaribu",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "6",
    "tanggal": "26 Oct 26",
    "namaPemesan": "Hayu",
    "qty": 5,
    "amount": 100000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "7",
    "tanggal": "26 Oct 26",
    "namaPemesan": "Caca",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "8",
    "tanggal": "27 Oct 26",
    "namaPemesan": "Finance Dhost",
    "qty": 6,
    "amount": 126000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "9",
    "tanggal": "27 Oct 26",
    "namaPemesan": "SMT Dhost",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "10",
    "tanggal": "27 Oct 26",
    "namaPemesan": "Sales Dhost",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "11",
    "tanggal": "27 Oct 26",
    "namaPemesan": "Ellen",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "12",
    "tanggal": "27 Oct 26",
    "namaPemesan": "Bg Barth",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "13",
    "tanggal": "27 Oct 26",
    "namaPemesan": "Tuti",
    "qty": 3,
    "amount": 63000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "14",
    "tanggal": "27 Oct 26",
    "namaPemesan": "Bayu",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "15",
    "tanggal": "27 Oct 26",
    "namaPemesan": "El",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "16",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Pak Dex Dhost",
    "qty": 5,
    "amount": 105000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "17",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Pak Ismart Dhost",
    "qty": 10,
    "amount": 210000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "18",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Oslo",
    "qty": 1,
    "amount": 21000,
    "status": "Not Paid",
    "note": "Sudah diterima",
    "pembayaran": "-",
    "batch": null
  },
  {
    "id": "19",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Mba Tari",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Belum diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "20",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Ci Santina Dhost",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "21",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Sasa",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "22",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Farid",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "23",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Mba Atty",
    "qty": 1,
    "amount": 21000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "24",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Anggreta",
    "qty": 3,
    "amount": 63000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "25",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Renold",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "26",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Teman Ellen",
    "qty": 4,
    "amount": 84000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "27",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Ka Oik",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "28",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Ka Citra",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "29",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Mba Juni Dhost",
    "qty": 3,
    "amount": 63000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "30",
    "tanggal": "3 Nov 26",
    "namaPemesan": "Tian",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "31",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Ka Niken",
    "qty": 1,
    "amount": 21000,
    "status": "Not Paid",
    "note": "Belum diterima",
    "pembayaran": "-",
    "batch": null
  },
  {
    "id": "32",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Ka Nancy",
    "qty": 5,
    "amount": 105000,
    "status": "Not Paid",
    "note": "Belum diterima",
    "pembayaran": "-",
    "batch": null
  },
  {
    "id": "33",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Mba Pipit",
    "qty": 1,
    "amount": 21000,
    "status": "Not Paid",
    "note": "Belum diterima",
    "pembayaran": "-",
    "batch": null
  },
  {
    "id": "34",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Tata",
    "qty": 1,
    "amount": 21000,
    "status": "Not Paid",
    "note": "Belum diterima",
    "pembayaran": "-",
    "batch": null
  },
  {
    "id": "35",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Oslo",
    "qty": 7,
    "amount": 147000,
    "status": "Not Paid",
    "note": "Sudah diterima",
    "pembayaran": "-",
    "batch": null
  },
  {
    "id": "36",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Ka Lugina",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "37",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Iga",
    "qty": 2,
    "amount": 42000,
    "status": "Paid",
    "note": "Sudah diterima",
    "pembayaran": "BCA",
    "batch": null
  },
  {
    "id": "38",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Ka Oik",
    "qty": 2,
    "amount": 42000,
    "status": "Not Paid",
    "note": "Belum diterima",
    "pembayaran": "-",
    "batch": null
  },
  {
    "id": "39",
    "tanggal": "5 Nov 26",
    "namaPemesan": "Ci Santina Dhost",
    "qty": 2,
    "amount": 42000,
    "status": "Not Paid",
    "note": "Belum diterima",
    "pembayaran": "-",
    "batch": null
  }
];
}

function getFallbackExpenses(): ExpenseItem[] {
  return [
  {
    "id": "1",
    "tanggal": "25 Oct 26",
    "item": "Gula Pasir",
    "unitPrice": 18,
    "qty": 1000,
    "totalAmount": 17500,
    "sisaQty": "0.21",
    "category": "Bahan Baku",
    "rowIndex": 2
  },
  {
    "id": "2",
    "tanggal": "25 Oct 26",
    "item": "Kental Manis Carnation",
    "unitPrice": 1308,
    "qty": 6,
    "totalAmount": 7850,
    "sisaQty": "4",
    "category": "Bahan Baku",
    "rowIndex": 3
  },
  {
    "id": "3",
    "tanggal": "25 Oct 26",
    "item": "Plastik 20x40",
    "unitPrice": 571,
    "qty": 28,
    "totalAmount": 15996,
    "sisaQty": "11",
    "category": "Kemasan",
    "rowIndex": 4
  },
  {
    "id": "4",
    "tanggal": "25 Oct 26",
    "item": "Plastik 15x33",
    "unitPrice": 381,
    "qty": 42,
    "totalAmount": 15996,
    "sisaQty": "23",
    "category": "Kemasan",
    "rowIndex": 5
  },
  {
    "id": "5",
    "tanggal": "25 Oct 26",
    "item": "Sendok Plastik HItam",
    "unitPrice": 443,
    "qty": 50,
    "totalAmount": 22161,
    "sisaQty": "21",
    "category": "Kemasan",
    "rowIndex": 6
  },
  {
    "id": "6",
    "tanggal": "26 Oct 26",
    "item": "Stiker Bulat",
    "unitPrice": 98,
    "qty": 98,
    "totalAmount": 9604,
    "sisaQty": "2",
    "category": "Kemasan",
    "rowIndex": 8
  },
  {
    "id": "7",
    "tanggal": "26 Oct 26",
    "item": "Stiker Panjang",
    "unitPrice": 286,
    "qty": 49,
    "totalAmount": 14014,
    "sisaQty": "49",
    "category": "Kemasan",
    "rowIndex": 9
  },
  {
    "id": "8",
    "tanggal": "26 Oct 26",
    "item": "Stiker Kotak",
    "unitPrice": 110,
    "qty": 33,
    "totalAmount": 3630,
    "sisaQty": "33",
    "category": "Kemasan",
    "rowIndex": 10
  },
  {
    "id": "9",
    "tanggal": "1 Nov 26",
    "item": "Nutrijell",
    "unitPrice": 4583,
    "qty": 12,
    "totalAmount": 55000,
    "sisaQty": "4",
    "category": "Bahan Baku",
    "rowIndex": 12
  },
  {
    "id": "10",
    "tanggal": "1 Nov 26",
    "item": "Cup",
    "unitPrice": 636,
    "qty": 50,
    "totalAmount": 31822,
    "sisaQty": "4",
    "category": "Kemasan",
    "rowIndex": 13
  },
  {
    "id": "11",
    "tanggal": "1 Nov 26",
    "item": "Gula",
    "unitPrice": 18,
    "qty": 1000,
    "totalAmount": 17500,
    "sisaQty": "750",
    "category": "Bahan Baku",
    "rowIndex": 14
  },
  {
    "id": "12",
    "tanggal": "1 Nov 26",
    "item": "Mangga harum Manis",
    "unitPrice": 5199,
    "qty": 16,
    "totalAmount": 83191,
    "sisaQty": "8",
    "category": "Bahan Baku",
    "rowIndex": 15
  },
  {
    "id": "13",
    "tanggal": "2 Nov 26",
    "item": "Kabel Ties",
    "unitPrice": 0,
    "qty": 100,
    "totalAmount": 0,
    "sisaQty": "83",
    "category": "Kemasan",
    "rowIndex": 16
  },
  {
    "id": "14",
    "tanggal": "2 Nov 26",
    "item": "Paper Leakproof",
    "unitPrice": 0,
    "qty": 100,
    "totalAmount": 0,
    "sisaQty": "58",
    "category": "Kemasan",
    "rowIndex": 17
  },
  {
    "id": "15",
    "tanggal": "4 Nov 26",
    "item": "Mangga Golek",
    "unitPrice": 2778,
    "qty": 9,
    "totalAmount": 25000,
    "sisaQty": "0",
    "category": "Bahan Baku",
    "rowIndex": 19
  },
  {
    "id": "16",
    "tanggal": "4 Nov 26",
    "item": "Evaporasi",
    "unitPrice": 19900,
    "qty": 2,
    "totalAmount": 39800,
    "sisaQty": "1",
    "category": "Bahan Baku",
    "rowIndex": 20
  },
  {
    "id": "17",
    "tanggal": "4 Nov 26",
    "item": "Sagu Mutiara",
    "unitPrice": 20,
    "qty": 250,
    "totalAmount": 10000,
    "sisaQty": "150",
    "category": "Bahan Baku",
    "rowIndex": 21
  },
  {
    "id": "18",
    "tanggal": "4 Nov 26",
    "item": "Natadecoco",
    "unitPrice": 23800,
    "qty": 1,
    "totalAmount": 23800,
    "sisaQty": "0",
    "category": "Bahan Baku",
    "rowIndex": 22
  }
];
}

function getFallbackCashflow(): CashflowItem[] {
  return [
  {
    "id": "cf-1",
    "tanggal": "25 Oct 26",
    "transaksi": "Mangga",
    "debit": 0,
    "kredit": 33000,
    "balance": -33000,
    "tipe": "Keluar"
  },
  {
    "id": "cf-2",
    "tanggal": "25 Oct 26",
    "transaksi": "Susu Evaporasi",
    "debit": 0,
    "kredit": 96000,
    "balance": -129000,
    "tipe": "Keluar"
  },
  {
    "id": "cf-3",
    "tanggal": "25 Oct 26",
    "transaksi": "Susu SKM",
    "debit": 0,
    "kredit": 7850,
    "balance": -136850,
    "tipe": "Keluar"
  },
  {
    "id": "cf-4",
    "tanggal": "25 Oct 26",
    "transaksi": "Jelly Mangga",
    "debit": 0,
    "kredit": 30690,
    "balance": -167540,
    "tipe": "Keluar"
  },
  {
    "id": "cf-5",
    "tanggal": "25 Oct 26",
    "transaksi": "Sagu Mutiara",
    "debit": 0,
    "kredit": 17000,
    "balance": -184540,
    "tipe": "Keluar"
  },
  {
    "id": "cf-6",
    "tanggal": "25 Oct 26",
    "transaksi": "Gula",
    "debit": 0,
    "kredit": 17500,
    "balance": -202040,
    "tipe": "Keluar"
  },
  {
    "id": "cf-7",
    "tanggal": "25 Oct 26",
    "transaksi": "Nata De Coco",
    "debit": 0,
    "kredit": 19600,
    "balance": -221640,
    "tipe": "Keluar"
  },
  {
    "id": "cf-8",
    "tanggal": "25 Oct 26",
    "transaksi": "Cup",
    "debit": 0,
    "kredit": 12904,
    "balance": -234544,
    "tipe": "Keluar"
  },
  {
    "id": "cf-9",
    "tanggal": "25 Oct 26",
    "transaksi": "Plastik",
    "debit": 0,
    "kredit": 31992,
    "balance": -266536,
    "tipe": "Keluar"
  },
  {
    "id": "cf-10",
    "tanggal": "25 Oct 26",
    "transaksi": "Sendok",
    "debit": 0,
    "kredit": 37661,
    "balance": -304197,
    "tipe": "Keluar"
  },
  {
    "id": "cf-11",
    "tanggal": "26 Oct 26",
    "transaksi": "Mila",
    "debit": 21000,
    "kredit": 0,
    "balance": -283197,
    "tipe": "Masuk"
  },
  {
    "id": "cf-12",
    "tanggal": "26 Oct 26",
    "transaksi": "Citra",
    "debit": 63000,
    "kredit": 0,
    "balance": -220197,
    "tipe": "Masuk"
  },
  {
    "id": "cf-13",
    "tanggal": "26 Oct 26",
    "transaksi": "Andrew",
    "debit": 42000,
    "kredit": 0,
    "balance": -178197,
    "tipe": "Masuk"
  },
  {
    "id": "cf-14",
    "tanggal": "26 Oct 26",
    "transaksi": "Hayu",
    "debit": 100000,
    "kredit": 0,
    "balance": -78197,
    "tipe": "Masuk"
  },
  {
    "id": "cf-15",
    "tanggal": "26 Oct 26",
    "transaksi": "Caca",
    "debit": 21000,
    "kredit": 0,
    "balance": -57197,
    "tipe": "Masuk"
  },
  {
    "id": "cf-16",
    "tanggal": "26 Oct 26",
    "transaksi": "Della",
    "debit": 21000,
    "kredit": 0,
    "balance": -36197,
    "tipe": "Masuk"
  },
  {
    "id": "cf-17",
    "tanggal": "26 Oct 26",
    "transaksi": "Anggreta",
    "debit": 42000,
    "kredit": 0,
    "balance": 5803,
    "tipe": "Masuk"
  },
  {
    "id": "cf-18",
    "tanggal": "26 Oct 26",
    "transaksi": "Thinwall",
    "debit": 0,
    "kredit": 17580,
    "balance": -11777,
    "tipe": "Keluar"
  },
  {
    "id": "cf-19",
    "tanggal": "26 Oct 26",
    "transaksi": "Mangga Golek",
    "debit": 0,
    "kredit": 18000,
    "balance": -29777,
    "tipe": "Keluar"
  },
  {
    "id": "cf-20",
    "tanggal": "26 Oct 26",
    "transaksi": "Mangga Harum Manis",
    "debit": 0,
    "kredit": 14000,
    "balance": -43777,
    "tipe": "Keluar"
  },
  {
    "id": "cf-21",
    "tanggal": "26 Oct 26",
    "transaksi": "Nata Coco",
    "debit": 0,
    "kredit": 19600,
    "balance": -63377,
    "tipe": "Keluar"
  },
  {
    "id": "cf-22",
    "tanggal": "26 Oct 26",
    "transaksi": "Sagu Mutiara",
    "debit": 0,
    "kredit": 10000,
    "balance": -73377,
    "tipe": "Keluar"
  },
  {
    "id": "cf-23",
    "tanggal": "26 Oct 26",
    "transaksi": "Nutrijell Mangga",
    "debit": 0,
    "kredit": 4000,
    "balance": -77377,
    "tipe": "Keluar"
  },
  {
    "id": "cf-24",
    "tanggal": "26 Oct 26",
    "transaksi": "Gas",
    "debit": 0,
    "kredit": 10000,
    "balance": -87377,
    "tipe": "Keluar"
  },
  {
    "id": "cf-25",
    "tanggal": "26 Oct 26",
    "transaksi": "Air Minum",
    "debit": 0,
    "kredit": 10000,
    "balance": -97377,
    "tipe": "Keluar"
  },
  {
    "id": "cf-26",
    "tanggal": "26 Oct 26",
    "transaksi": "Stiker",
    "debit": 0,
    "kredit": 27248,
    "balance": -124625,
    "tipe": "Keluar"
  },
  {
    "id": "cf-27",
    "tanggal": "27 Oct 26",
    "transaksi": "Finance Dhost",
    "debit": 126000,
    "kredit": 0,
    "balance": 1375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-28",
    "tanggal": "27 Oct 26",
    "transaksi": "SMT Dhost",
    "debit": 42000,
    "kredit": 0,
    "balance": 43375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-29",
    "tanggal": "27 Oct 26",
    "transaksi": "Sales Dhost",
    "debit": 42000,
    "kredit": 0,
    "balance": 85375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-30",
    "tanggal": "27 Oct 26",
    "transaksi": "Ellen",
    "debit": 21000,
    "kredit": 0,
    "balance": 106375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-31",
    "tanggal": "27 Oct 26",
    "transaksi": "Bg Barth",
    "debit": 21000,
    "kredit": 0,
    "balance": 127375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-32",
    "tanggal": "27 Oct 26",
    "transaksi": "Tuti",
    "debit": 63000,
    "kredit": 0,
    "balance": 190375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-33",
    "tanggal": "27 Oct 26",
    "transaksi": "Bayu",
    "debit": 21000,
    "kredit": 0,
    "balance": 211375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-34",
    "tanggal": "27 Oct 26",
    "transaksi": "El",
    "debit": 21000,
    "kredit": 0,
    "balance": 232375,
    "tipe": "Masuk"
  },
  {
    "id": "cf-35",
    "tanggal": "1 Nov 26",
    "transaksi": "Nutrijell Mangga",
    "debit": 0,
    "kredit": 55000,
    "balance": 177375,
    "tipe": "Keluar"
  },
  {
    "id": "cf-36",
    "tanggal": "1 Nov 26",
    "transaksi": "Sagu Mutiara",
    "debit": 0,
    "kredit": 20000,
    "balance": 157375,
    "tipe": "Keluar"
  },
  {
    "id": "cf-37",
    "tanggal": "1 Nov 26",
    "transaksi": "Mangga Harum Manis + Golek",
    "debit": 0,
    "kredit": 21000,
    "balance": 136375,
    "tipe": "Keluar"
  },
  {
    "id": "cf-38",
    "tanggal": "1 Nov 26",
    "transaksi": "Mangga Harum Manis",
    "debit": 0,
    "kredit": 83191,
    "balance": 53184,
    "tipe": "Keluar"
  },
  {
    "id": "cf-39",
    "tanggal": "1 Nov 26",
    "transaksi": "Mangga Golek",
    "debit": 0,
    "kredit": 46000,
    "balance": 7184,
    "tipe": "Keluar"
  },
  {
    "id": "cf-40",
    "tanggal": "1 Nov 26",
    "transaksi": "Susu Evaporasi",
    "debit": 0,
    "kredit": 139300,
    "balance": -132116,
    "tipe": "Keluar"
  },
  {
    "id": "cf-41",
    "tanggal": "1 Nov 26",
    "transaksi": "Gula",
    "debit": 0,
    "kredit": 17500,
    "balance": -149616,
    "tipe": "Keluar"
  },
  {
    "id": "cf-42",
    "tanggal": "2 Nov 26",
    "transaksi": "Nata De Coco",
    "debit": 0,
    "kredit": 39200,
    "balance": -188816,
    "tipe": "Keluar"
  },
  {
    "id": "cf-43",
    "tanggal": "2 Nov 26",
    "transaksi": "Aqua",
    "debit": 0,
    "kredit": 25000,
    "balance": -213816,
    "tipe": "Keluar"
  },
  {
    "id": "cf-44",
    "tanggal": "3 Nov 26",
    "transaksi": "Renold",
    "debit": 42000,
    "kredit": 0,
    "balance": -171816,
    "tipe": "Masuk"
  },
  {
    "id": "cf-45",
    "tanggal": "3 Nov 26",
    "transaksi": "Farid",
    "debit": 21000,
    "kredit": 0,
    "balance": -150816,
    "tipe": "Masuk"
  },
  {
    "id": "cf-46",
    "tanggal": "3 Nov 26",
    "transaksi": "Pak Dex Dhost",
    "debit": 105000,
    "kredit": 0,
    "balance": -45816,
    "tipe": "Masuk"
  },
  {
    "id": "cf-47",
    "tanggal": "3 Nov 26",
    "transaksi": "Pak Ismart Dhost",
    "debit": 210000,
    "kredit": 0,
    "balance": 164184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-48",
    "tanggal": "3 Nov 26",
    "transaksi": "Oslo",
    "debit": 0,
    "kredit": 0,
    "balance": 164184,
    "tipe": "Keluar"
  },
  {
    "id": "cf-49",
    "tanggal": "3 Nov 26",
    "transaksi": "Mba Tari",
    "debit": 21000,
    "kredit": 0,
    "balance": 185184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-50",
    "tanggal": "3 Nov 26",
    "transaksi": "Ci Santina Dhost",
    "debit": 42000,
    "kredit": 0,
    "balance": 227184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-51",
    "tanggal": "3 Nov 26",
    "transaksi": "Sasa",
    "debit": 21000,
    "kredit": 0,
    "balance": 248184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-52",
    "tanggal": "3 Nov 26",
    "transaksi": "Mba Atty",
    "debit": 21000,
    "kredit": 0,
    "balance": 269184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-53",
    "tanggal": "3 Nov 26",
    "transaksi": "Anggreta",
    "debit": 63000,
    "kredit": 0,
    "balance": 332184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-54",
    "tanggal": "3 Nov 26",
    "transaksi": "Teman Ellen",
    "debit": 84000,
    "kredit": 0,
    "balance": 416184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-55",
    "tanggal": "3 Nov 26",
    "transaksi": "Ka Oik",
    "debit": 42000,
    "kredit": 0,
    "balance": 458184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-56",
    "tanggal": "3 Nov 26",
    "transaksi": "Ka Citra",
    "debit": 42000,
    "kredit": 0,
    "balance": 500184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-57",
    "tanggal": "3 Nov 26",
    "transaksi": "Mba Juni Dhost",
    "debit": 63000,
    "kredit": 0,
    "balance": 563184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-58",
    "tanggal": "3 Nov 26",
    "transaksi": "Tian",
    "debit": 42000,
    "kredit": 0,
    "balance": 605184,
    "tipe": "Masuk"
  },
  {
    "id": "cf-59",
    "tanggal": "3 Nov 26",
    "transaksi": "Evaporasi",
    "debit": 0,
    "kredit": 39800,
    "balance": 565384,
    "tipe": "Keluar"
  },
  {
    "id": "cf-60",
    "tanggal": "3 Nov 26",
    "transaksi": "Nata De Coco",
    "debit": 0,
    "kredit": 23800,
    "balance": 541584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-61",
    "tanggal": "4 Nov 26",
    "transaksi": "Mangga Golek",
    "debit": 0,
    "kredit": 25000,
    "balance": 516584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-62",
    "tanggal": "4 Nov 26",
    "transaksi": "Sagu Mutiara",
    "debit": 0,
    "kredit": 10000,
    "balance": 506584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-63",
    "tanggal": "5 Nov 26",
    "transaksi": "Ka Niken",
    "debit": 0,
    "kredit": 0,
    "balance": 506584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-64",
    "tanggal": "5 Nov 26",
    "transaksi": "Ka Nancy",
    "debit": 0,
    "kredit": 0,
    "balance": 506584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-65",
    "tanggal": "5 Nov 26",
    "transaksi": "Mba Pipit",
    "debit": 0,
    "kredit": 0,
    "balance": 506584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-66",
    "tanggal": "5 Nov 26",
    "transaksi": "Tata",
    "debit": 0,
    "kredit": 0,
    "balance": 506584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-67",
    "tanggal": "5 Nov 26",
    "transaksi": "Oslo",
    "debit": 0,
    "kredit": 0,
    "balance": 506584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-68",
    "tanggal": "5 Nov 26",
    "transaksi": "Ka Lugina",
    "debit": 42000,
    "kredit": 0,
    "balance": 548584,
    "tipe": "Masuk"
  },
  {
    "id": "cf-69",
    "tanggal": "5 Nov 26",
    "transaksi": "Iga",
    "debit": 42000,
    "kredit": 0,
    "balance": 590584,
    "tipe": "Masuk"
  },
  {
    "id": "cf-70",
    "tanggal": "5 Nov 26",
    "transaksi": "Ka Oik",
    "debit": 0,
    "kredit": 0,
    "balance": 590584,
    "tipe": "Keluar"
  },
  {
    "id": "cf-71",
    "tanggal": "5 Nov 26",
    "transaksi": "Ci Santina Dhost",
    "debit": 0,
    "kredit": 0,
    "balance": 590584,
    "tipe": "Keluar"
  }
];
}
