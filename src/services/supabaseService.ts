import { OrderItem, ExpenseItem, CashflowItem, AuditLog, ExpenseCategory } from '../types';
import { getSupabaseClient } from './supabaseClient';

export interface SupabaseOrderRow {
  id: string;
  tanggal: string;
  nama_pemesan: string;
  qty: number;
  amount: number;
  status: string;
  note: string;
  pembayaran: string;
  batch?: string | null;
  created_at?: string;
}

export interface SupabaseExpenseRow {
  id: string;
  tanggal: string;
  item: string;
  unit_price: number;
  qty: number;
  total_amount: number;
  sisa_qty?: string | number | null;
  category: string;
  row_index?: number | null;
  created_at?: string;
}

export interface SupabaseCashflowRow {
  id: string;
  tanggal: string;
  transaksi: string;
  debit: number;
  kredit: number;
  balance: number;
  tipe: string;
  created_at?: string;
}

export interface SupabaseAuditLogRow {
  id: string;
  timestamp: string;
  formatted_date: string;
  user_name: string;
  user_role: string;
  action: string;
  category: string;
  description: string;
  details?: string | null;
  created_at?: string;
}

// ------------------- Orders -------------------

export async function fetchOrdersFromSupabase(): Promise<OrderItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch orders error:', error);
    throw error;
  }

  return (data || []).map((row: SupabaseOrderRow) => ({
    id: String(row.id),
    tanggal: row.tanggal || '',
    namaPemesan: row.nama_pemesan || '',
    qty: Number(row.qty) || 0,
    amount: Number(row.amount) || 0,
    status: (row.status || 'Not Paid') as 'Paid' | 'Not Paid',
    note: row.note || '',
    pembayaran: row.pembayaran || '',
    batch: row.batch || undefined,
  }));
}

export async function createOrderInSupabase(order: OrderItem): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const payload: Partial<SupabaseOrderRow> = {
    tanggal: order.tanggal,
    nama_pemesan: order.namaPemesan,
    qty: order.qty,
    amount: order.amount,
    status: order.status,
    note: order.note || '',
    pembayaran: order.pembayaran || '',
    batch: order.batch || null,
  };

  const { error } = await supabase.from('orders').insert([payload]);
  if (error) {
    console.error('Supabase create order error:', error);
    return false;
  }

  // Jika pesanan langsung berstatus Paid, catat pemasukan otomatis di cashflows
  if (order.status === 'Paid') {
    try {
      await supabase.from('cashflows').insert([{
        tanggal: order.tanggal,
        transaksi: `Penjualan: ${order.namaPemesan} (${order.qty} cup)`,
        debit: order.amount,
        kredit: 0,
        balance: 0,
        tipe: 'Masuk',
      }]);
    } catch (cfErr) {
      console.warn('Could not auto-insert order cashflow:', cfErr);
    }
  }

  return true;
}

export async function updateOrderStatusInSupabase(
  orderId: string,
  status: string,
  pembayaran?: string,
  orderDetail?: OrderItem
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const updates: Partial<SupabaseOrderRow> = { status };
  if (pembayaran !== undefined) {
    updates.pembayaran = pembayaran;
  }

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  if (error) {
    console.error('Supabase update order status error:', error);
    return false;
  }

  // Sinkronisasi Buku Kas (Cashflows): HANYA mencatat jika pesanan lunas (Paid)
  if (status === 'Paid' && orderDetail) {
    try {
      const { data: existing } = await supabase
        .from('cashflows')
        .select('id')
        .or(`transaksi.eq.Penjualan: ${orderDetail.namaPemesan} (${orderDetail.qty} cup),transaksi.eq.Pelunasan: ${orderDetail.namaPemesan} (${orderDetail.qty} cup)`);

      if (!existing || existing.length === 0) {
        await supabase.from('cashflows').insert([{
          tanggal: orderDetail.tanggal,
          transaksi: `Penjualan: ${orderDetail.namaPemesan} (${orderDetail.qty} cup)`,
          debit: orderDetail.amount,
          kredit: 0,
          balance: 0,
          tipe: 'Masuk',
        }]);
      }
    } catch (cfErr) {
      console.warn('Could not auto-insert order cashflow:', cfErr);
    }
  } else if (status === 'Not Paid' && orderDetail) {
    // JIKA STATUS DIUBAH MENJADI NOT PAID / BELUM LUNAS, HAPUS DARI BUKU KAS
    try {
      await supabase
        .from('cashflows')
        .delete()
        .or(`transaksi.ilike.%Penjualan: ${orderDetail.namaPemesan} %,transaksi.ilike.%Pelunasan: ${orderDetail.namaPemesan} %`);
    } catch (cfErr) {
      console.warn('Could not auto-delete unpaid order cashflow:', cfErr);
    }
  }

  return true;
}

export async function updateOrderInSupabase(order: OrderItem): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const updates: Partial<SupabaseOrderRow> = {
    tanggal: order.tanggal,
    nama_pemesan: order.namaPemesan,
    qty: order.qty,
    amount: order.amount,
    status: order.status,
    note: order.note || '',
    pembayaran: order.pembayaran || '-',
    batch: order.batch || null,
  };

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', order.id);

  if (error) {
    console.error('Supabase update full order error:', error);
    return false;
  }

  // Sinkronisasi Buku Kas berdasarkan status lunas
  if (order.status === 'Paid') {
    try {
      const { data: existing } = await supabase
        .from('cashflows')
        .select('id')
        .or(`transaksi.ilike.%Penjualan: ${order.namaPemesan} %,transaksi.ilike.%Pelunasan: ${order.namaPemesan} %`);

      if (existing && existing.length > 0) {
        await supabase
          .from('cashflows')
          .update({
            tanggal: order.tanggal,
            transaksi: `Penjualan: ${order.namaPemesan} (${order.qty} cup)`,
            debit: order.amount,
          })
          .eq('id', existing[0].id);
      } else {
        await supabase.from('cashflows').insert([{
          tanggal: order.tanggal,
          transaksi: `Penjualan: ${order.namaPemesan} (${order.qty} cup)`,
          debit: order.amount,
          kredit: 0,
          balance: 0,
          tipe: 'Masuk',
        }]);
      }
    } catch (cfErr) {
      console.warn('Could not sync cashflow on edit order:', cfErr);
    }
  } else {
    // Jika berstatus Not Paid (Belum Lunas), pastikan tidak ada di buku kas
    try {
      await supabase
        .from('cashflows')
        .delete()
        .or(`transaksi.ilike.%Penjualan: ${order.namaPemesan} %,transaksi.ilike.%Pelunasan: ${order.namaPemesan} %`);
    } catch (cfErr) {
      console.warn('Could not remove unpaid cashflow on edit order:', cfErr);
    }
  }

  return true;
}

export async function deleteOrderInSupabase(orderId: string, orderDetail?: Partial<OrderItem>): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  // Clean up associated cashflow if matching
  if (orderDetail?.namaPemesan) {
    try {
      await supabase
        .from('cashflows')
        .delete()
        .or(`transaksi.ilike.%Penjualan: ${orderDetail.namaPemesan} %,transaksi.ilike.%Pelunasan: ${orderDetail.namaPemesan} %`);
    } catch (cfErr) {
      console.warn('Could not auto-delete order cashflow:', cfErr);
    }
  }

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) {
    console.error('Supabase delete order error:', error);
    return false;
  }
  return true;
}

// ------------------- Expenses -------------------

export async function fetchExpensesFromSupabase(): Promise<ExpenseItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch expenses error:', error);
    throw error;
  }

  return (data || []).map((row: SupabaseExpenseRow) => ({
    id: String(row.id),
    tanggal: row.tanggal || '',
    item: row.item || '',
    unitPrice: Number(row.unit_price) || 0,
    qty: Number(row.qty) || 0,
    totalAmount: Number(row.total_amount) || 0,
    sisaQty: row.sisa_qty !== null && row.sisa_qty !== undefined ? String(row.sisa_qty) : '0',
    category: (row.category || 'Bahan Baku') as ExpenseCategory,
    rowIndex: row.row_index || undefined,
  }));
}

export async function createExpenseInSupabase(expense: ExpenseItem): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const payload: Partial<SupabaseExpenseRow> = {
    tanggal: expense.tanggal,
    item: expense.item,
    unit_price: expense.unitPrice,
    qty: expense.qty,
    total_amount: expense.totalAmount,
    sisa_qty: expense.sisaQty !== undefined && expense.sisaQty !== null ? String(expense.sisaQty) : '0',
    category: expense.category,
    row_index: expense.rowIndex || null,
  };

  const { error } = await supabase.from('expenses').insert([payload]);
  if (error) {
    console.error('Supabase create expense error:', error);
    return false;
  }

  // Catat otomatis pengeluaran ke buku kas (cashflows)
  if (expense.totalAmount > 0) {
    try {
      await supabase.from('cashflows').insert([{
        tanggal: expense.tanggal,
        transaksi: `Belanja: ${expense.item}`,
        debit: 0,
        kredit: expense.totalAmount,
        balance: 0,
        tipe: 'Keluar',
      }]);
    } catch (cfErr) {
      console.warn('Could not auto-insert expense cashflow:', cfErr);
    }
  }

  return true;
}

export async function createBatchExpensesInSupabase(expenses: ExpenseItem[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || expenses.length === 0) return false;

  const payloads: Partial<SupabaseExpenseRow>[] = expenses.map((expense) => ({
    tanggal: expense.tanggal,
    item: expense.item,
    unit_price: expense.unitPrice,
    qty: expense.qty,
    total_amount: expense.totalAmount,
    sisa_qty: expense.sisaQty !== undefined && expense.sisaQty !== null ? String(expense.sisaQty) : '0',
    category: expense.category,
    row_index: expense.rowIndex || null,
  }));

  const { error } = await supabase.from('expenses').insert(payloads);
  if (error) {
    console.error('Supabase create batch expenses error:', error);
    return false;
  }

  // Catat otomatis pengeluaran sekaligus ke buku kas
  const cfPayloads = expenses
    .filter((e) => e.totalAmount > 0)
    .map((e) => ({
      tanggal: e.tanggal,
      transaksi: `Belanja: ${e.item}`,
      debit: 0,
      kredit: e.totalAmount,
      balance: 0,
      tipe: 'Keluar',
    }));

  if (cfPayloads.length > 0) {
    try {
      await supabase.from('cashflows').insert(cfPayloads);
    } catch (cfErr) {
      console.warn('Could not auto-insert batch expenses cashflows:', cfErr);
    }
  }

  return true;
}

export async function updateExpenseSisaInSupabase(
  expenseId: string,
  newSisaQty: string | number
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('expenses')
    .update({ sisa_qty: String(newSisaQty) })
    .eq('id', expenseId);

  if (error) {
    console.error('Supabase update expense sisa error:', error);
    return false;
  }
  return true;
}

export async function updateExpenseInSupabase(expense: ExpenseItem): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const updates: Partial<SupabaseExpenseRow> = {
    tanggal: expense.tanggal,
    item: expense.item,
    unit_price: expense.unitPrice,
    qty: expense.qty,
    total_amount: expense.totalAmount,
    sisa_qty: expense.sisaQty !== undefined && expense.sisaQty !== null ? String(expense.sisaQty) : '0',
    category: expense.category,
  };

  const { error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', expense.id);

  if (error) {
    console.error('Supabase update full expense error:', error);
    return false;
  }
  return true;
}

export async function deleteExpenseInSupabase(expenseId: string, expenseDetail?: Partial<ExpenseItem>): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  // Clean up associated cashflow if matching
  if (expenseDetail?.item) {
    try {
      await supabase
        .from('cashflows')
        .delete()
        .ilike('transaksi', `%${expenseDetail.item}%`);
    } catch (cfErr) {
      console.warn('Could not auto-delete expense cashflow:', cfErr);
    }
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    console.error('Supabase delete expense error:', error);
    return false;
  }
  return true;
}

// ------------------- Cashflows -------------------

export async function fetchCashflowFromSupabase(): Promise<CashflowItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('cashflows')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase fetch cashflow error:', error);
    throw error;
  }

  let runningBalance = 0;
  return (data || []).map((row: SupabaseCashflowRow) => {
    const debit = Number(row.debit) || 0;
    const kredit = Number(row.kredit) || 0;
    runningBalance += (debit - kredit);

    return {
      id: String(row.id),
      tanggal: row.tanggal || '',
      transaksi: row.transaksi || '',
      debit,
      kredit,
      balance: runningBalance,
      tipe: (row.tipe || (debit > 0 ? 'Masuk' : 'Keluar')) as 'Masuk' | 'Keluar',
    };
  });
}

export async function deleteCashflowInSupabase(cashflowId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('cashflows')
    .delete()
    .eq('id', cashflowId);

  if (error) {
    console.error('Supabase delete cashflow error:', error);
    return false;
  }
  return true;
}

// ------------------- Audit Logs -------------------

export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(300);

  if (error) {
    console.error('Supabase fetch audit logs error:', error);
    throw error;
  }

  return (data || []).map((row: SupabaseAuditLogRow) => ({
    id: String(row.id),
    timestamp: row.timestamp || new Date().toISOString(),
    formattedDate: row.formatted_date || '',
    userName: row.user_name || '',
    userRole: row.user_role || '',
    action: row.action as any,
    category: row.category as any,
    description: row.description || '',
    details: row.details || undefined,
  }));
}

export async function insertAuditLogInSupabase(log: AuditLog): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const payload: Partial<SupabaseAuditLogRow> = {
    timestamp: log.timestamp,
    formatted_date: log.formattedDate,
    user_name: log.userName,
    user_role: log.userRole,
    action: log.action,
    category: log.category,
    description: log.description,
    details: log.details || null,
  };

  const { error } = await supabase.from('audit_logs').insert([payload]);
  if (error) {
    console.error('Supabase insert audit log error:', error);
    return false;
  }
  return true;
}

export async function clearAuditLogsInSupabase(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('audit_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Supabase clear audit logs error:', error);
    return false;
  }
  return true;
}

// ------------------- Real-time Subscriptions -------------------

export function subscribeToSupabaseChanges(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('mango_realtime_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'expenses' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cashflows' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_logs' },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ------------------- Reset Database ke 0 (Kosong) -------------------

export async function resetDatabaseToZero(): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client belum terhubung.' };

  try {
    await Promise.all([
      supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('cashflows').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);

    return {
      success: true,
      message: '✅ Berhasil! Seluruh data penjualan, belanja, dan buku kas di Supabase telah dikosongkan (mulai dari 0).',
    };
  } catch (err: any) {
    console.error('Failed to reset database to zero:', err);
    return { success: false, message: `Gagal mereset database: ${err.message || err}` };
  }
}
