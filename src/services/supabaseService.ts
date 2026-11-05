

import { OrderItem, ExpenseItem, CashflowItem, AuditLog } from '../types';
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
  return true;
}

export async function updateOrderStatusInSupabase(
  orderId: string,
  status: string,
  pembayaran?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const updates: Partial<SupabaseOrderRow> = { status };
  if (pembayaran !== undefined) {
    updates.pembayaran = pembayaran;
  }

  // Handle both UUID and id matching
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  if (error) {
    console.error('Supabase update order status error:', error);
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
    sisaQty: row.sisa_qty !== null && row.sisa_qty !== undefined ? String(row.sisa_qty) : '',
    category: (row.category || 'Bahan Baku') as 'Bahan Baku' | 'Kemasan' | 'Operasional',
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
    sisa_qty: expense.sisaQty !== undefined && expense.sisaQty !== null ? String(expense.sisaQty) : '',
    category: expense.category,
    row_index: expense.rowIndex || null,
  };

  const { error } = await supabase.from('expenses').insert([payload]);
  if (error) {
    console.error('Supabase create expense error:', error);
    return false;
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
    sisa_qty: expense.sisaQty !== undefined && expense.sisaQty !== null ? String(expense.sisaQty) : '',
    category: expense.category,
    row_index: expense.rowIndex || null,
  }));

  const { error } = await supabase.from('expenses').insert(payloads);
  if (error) {
    console.error('Supabase create batch expenses error:', error);
    return false;
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

  return (data || []).map((row: SupabaseCashflowRow) => ({
    id: String(row.id),
    tanggal: row.tanggal || '',
    transaksi: row.transaksi || '',
    debit: Number(row.debit) || 0,
    kredit: Number(row.kredit) || 0,
    balance: Number(row.balance) || 0,
    tipe: (row.tipe || 'Masuk') as 'Masuk' | 'Keluar',
  }));
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
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes all rows

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


// ------------------- Sync Live Spreadsheet to Supabase -------------------

export async function syncSpreadsheetToSupabase(
  orders: OrderItem[],
  expenses: ExpenseItem[],
  cashflow: CashflowItem[]
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client belum terhubung' };

  try {
    // 1. Delete existing rows
    await Promise.all([
      supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('cashflows').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);

    // 2. Insert orders in chunks of 50
    if (orders.length > 0) {
      const orderPayloads = orders.map((o) => ({
        tanggal: o.tanggal,
        nama_pemesan: o.namaPemesan,
        qty: o.qty,
        amount: o.amount,
        status: o.status,
        note: o.note || '',
        pembayaran: o.pembayaran || '-',
        batch: o.batch || null,
      }));
      const { error: ordErr } = await supabase.from('orders').insert(orderPayloads);
      if (ordErr) throw ordErr;
    }

    // 3. Insert expenses
    if (expenses.length > 0) {
      const expensePayloads = expenses.map((e) => ({
        tanggal: e.tanggal,
        item: e.item,
        unit_price: e.unitPrice,
        qty: e.qty,
        total_amount: e.totalAmount,
        sisa_qty: e.sisaQty !== undefined && e.sisaQty !== null ? String(e.sisaQty) : '0',
        category: e.category,
        row_index: e.rowIndex || null,
      }));
      const { error: expErr } = await supabase.from('expenses').insert(expensePayloads);
      if (expErr) throw expErr;
    }

    // 4. Insert cashflow in chunks of 50
    if (cashflow.length > 0) {
      const cfPayloads = cashflow.map((c) => ({
        tanggal: c.tanggal,
        transaksi: c.transaksi,
        debit: c.debit,
        kredit: c.kredit,
        balance: c.balance,
        tipe: c.tipe,
      }));
      // Split into batches of 40 to avoid any payload limits
      for (let i = 0; i < cfPayloads.length; i += 40) {
        const batch = cfPayloads.slice(i, i + 40);
        const { error: cfErr } = await supabase.from('cashflows').insert(batch);
        if (cfErr) throw cfErr;
      }
    }

    return {
      success: true,
      message: `✅ Berhasil mengimpor ${orders.length} pesanan, ${expenses.length} pengeluaran, dan ${cashflow.length} baris kas ke Supabase!`,
    };
  } catch (err: any) {
    console.error('Failed to sync spreadsheet to Supabase:', err);
    return { success: false, message: `Gagal impor: ${err.message || err}` };
  }
}
