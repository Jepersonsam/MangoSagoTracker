export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Kasir';
  avatar?: string;
  username?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  formattedDate: string;
  userName: string;
  userRole: string;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE_ORDER' | 'UPDATE_ORDER' | 'CREATE_EXPENSE' | 'SYNC_SHEETS' | 'UPDATE_SETTINGS' | 'CLEAR_LOGS';
  category: 'Autentikasi' | 'Pesanan' | 'Pengeluaran' | 'Sistem';
  description: string;
  details?: string;
}

export interface OrderItem {
  id: string;
  tanggal: string;
  namaPemesan: string;
  qty: number;
  amount: number;
  status: 'Paid' | 'Not Paid' | string;
  note: string;
  pembayaran: string;
  batch?: string; // Pagi / Malam
}

export interface ExpenseItem {
  id: string;
  tanggal: string;
  item: string;
  unitPrice: number;
  qty: number;
  totalAmount: number;
  sisaQty?: number | string;
  category: 'Bahan Baku' | 'Kemasan' | 'Operasional';
}

export interface CashflowItem {
  id: string;
  tanggal: string;
  transaksi: string;
  debit: number;
  kredit: number;
  balance: number;
  tipe: 'Masuk' | 'Keluar';
}

export interface BatchSummary {
  tanggal: string;
  omset: number;
  biayaBahan: number;
  biayaKemasan: number;
  pengeluaranKotor: number;
  nettProfit: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalCupsSold: number;
  totalOrders: number;
  paidAmount: number;
  unpaidAmount: number;
  unpaidOrdersCount: number;
  currentBalance: number;
}

