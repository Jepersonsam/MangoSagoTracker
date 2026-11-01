import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchOrders,
  fetchExpenses,
  fetchCashflow,
  calculateMetrics,
  postOrderToSheet,
  postExpenseToSheet,
  postOrderStatusToSheet,
  postExpenseSisaQtyToSheet,
  postExpensesBatchToSheet,
  formatRupiah,
  SPREADSHEET_ID,
} from './services/sheetsService';
import { getCurrentUser, logoutUser } from './services/authService';
import { getAuditLogs, recordAuditLog, clearAuditLogs } from './services/auditService';
import { OrderItem, ExpenseItem, CashflowItem, DashboardMetrics, User, AuditLog } from './types';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { ChartsSection } from './components/ChartsSection';
import { OrdersTab } from './components/OrdersTab';
import { ExpensesTab } from './components/ExpensesTab';
import { CashflowTab } from './components/CashflowTab';
import { NewOrderModal } from './components/NewOrderModal';
import { NewExpenseModal } from './components/NewExpenseModal';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { LoginPage } from './components/LoginPage';
import { ShoppingBag, ShoppingCart, Landmark } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());

  const [sheetId, setSheetId] = useState<string>(() => {
    return localStorage.getItem('mango_sheet_id') || SPREADSHEET_ID;
  });

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [cashflow, setCashflow] = useState<CashflowItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getAuditLogs());

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalCupsSold: 0,
    totalOrders: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    unpaidOrdersCount: 0,
    currentBalance: 0,
  });

  const [activeTab, setActiveTab] = useState<'orders' | 'expenses' | 'cashflow'>('orders');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseModalMode, setExpenseModalMode] = useState<'single' | 'batch'>('batch');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to record an audit action
  const logAudit = (
    action: AuditLog['action'],
    category: AuditLog['category'],
    description: string,
    details?: string
  ) => {
    const newEntry = recordAuditLog({
      userName: currentUser?.name || 'Admin',
      userRole: currentUser?.role || 'Admin',
      action,
      category,
      description,
      details,
    });
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!currentUser) return;
    if (!isSilent) setIsLoading(true);
    try {
      const [fetchedOrders, fetchedExpenses, fetchedCashflow] = await Promise.all([
        fetchOrders(sheetId),
        fetchExpenses(sheetId),
        fetchCashflow(sheetId),
      ]);

      setOrders(fetchedOrders);
      setExpenses(fetchedExpenses);
      setCashflow(fetchedCashflow);
      setMetrics(calculateMetrics(fetchedOrders, fetchedExpenses, fetchedCashflow));
      setLastUpdated(new Date());
      setIsLiveConnected(true);

      if (!isSilent) {
        showToast('Data berhasil disinkronkan dengan Google Sheets!');
        logAudit('SYNC_SHEETS', 'Sistem', 'Sinkronisasi manual data dengan Google Sheets', `ID Sheet: ${sheetId}`);
      }
    } catch (err) {
      console.error('Failed to sync sheet data:', err);
      setIsLiveConnected(false);
      showToast('Gagal terhubung ke Google Sheet, menampilkan cache offline.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [sheetId, currentUser]);

  // Initial load when logged in
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [loadData, currentUser]);

  // Auto-sync polling every 30 seconds
  useEffect(() => {
    if (!autoSync || !currentUser) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoSync, loadData, currentUser]);

  // Handle Login
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    const newLog = recordAuditLog({
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      category: 'Autentikasi',
      description: `Admin ${user.name} berhasil login ke dashboard`,
      details: `Email: ${user.email}`,
    });
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(`Selamat datang, Admin ${user.name}!`);
  };

  // Handle Logout
  const handleLogout = () => {
    if (currentUser) {
      const newLog = recordAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'LOGOUT',
        category: 'Autentikasi',
        description: `Admin ${currentUser.name} keluar dari sistem (logout)`,
        details: 'Sesi ditutup dengan aman',
      });
      setAuditLogs((prev) => [newLog, ...prev]);
    }
    logoutUser();
    setCurrentUser(null);
    showToast('Anda telah berhasil keluar (logout).');
  };

  // Toggle Order Paid Status
  const handleToggleStatus = (orderId: string) => {
    let changedOrderName = '';
    let nextStatus = '';
    let updatedOrderObj: OrderItem | null = null;

    setOrders((prev) => {
      const updated = prev.map((ord) => {
        if (ord.id === orderId) {
          nextStatus = ord.status === 'Paid' ? 'Not Paid' : 'Paid';
          changedOrderName = ord.namaPemesan;
          updatedOrderObj = {
            ...ord,
            status: nextStatus,
            pembayaran: nextStatus === 'Paid' && ord.pembayaran === '-' ? 'BCA' : ord.pembayaran,
          };
          return updatedOrderObj;
        }
        return ord;
      });
      setMetrics(calculateMetrics(updated, expenses, cashflow));
      return updated;
    });

    if (updatedOrderObj) {
      postOrderStatusToSheet(updatedOrderObj);
      setTimeout(() => loadData(true), 2000);
    }

    logAudit(
      'UPDATE_ORDER',
      'Pesanan',
      `Mengubah status pesanan untuk ${changedOrderName || 'Pelanggan'}`,
      `Status diperbarui menjadi: ${nextStatus} (ID: ${orderId})`
    );

    const hasAppsScript = Boolean(localStorage.getItem('mango_apps_script_url'));
    if (hasAppsScript) {
      showToast(`Status ${changedOrderName} diperbarui & disinkronkan ke Google Sheet!`);
    } else {
      showToast(`Status ${changedOrderName} diperbarui di web (Masukkan Web App URL di ⚙️ agar terupdate di Google Sheet).`);
    }
  };

  // Add New Order
  const handleAddOrder = (newOrder: OrderItem) => {
    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      setMetrics(calculateMetrics(updated, expenses, cashflow));
      return updated;
    });
    postOrderToSheet(newOrder);
    setTimeout(() => loadData(true), 2500);

    logAudit(
      'CREATE_ORDER',
      'Pesanan',
      `Menambah pesanan baru: ${newOrder.namaPemesan}`,
      `${newOrder.qty} cup • ${formatRupiah(newOrder.amount)} • Bayar: ${newOrder.pembayaran} • Batch: ${newOrder.batch || '-'}`
    );

    const hasAppsScript = Boolean(localStorage.getItem('mango_apps_script_url'));
    if (hasAppsScript) {
      showToast(`Pesanan untuk ${newOrder.namaPemesan} berhasil dicatat & dikirim ke Sheet!`);
    } else {
      showToast(`Pesanan untuk ${newOrder.namaPemesan} dicatat di web (Masukkan Web App URL di ⚙️ agar tercatat di Google Sheet).`);
    }
  };

  // Add New Expense
  const handleAddExpense = (newExpense: ExpenseItem) => {
    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      setMetrics(calculateMetrics(orders, updated, cashflow));
      return updated;
    });
    postExpenseToSheet(newExpense);
    setTimeout(() => loadData(true), 2500);

    logAudit(
      'CREATE_EXPENSE',
      'Pengeluaran',
      `Mencatat belanja bahan/operasional: ${newExpense.item}`,
      `${newExpense.qty} item • ${formatRupiah(newExpense.totalAmount)} • Kategori: ${newExpense.category}`
    );

    const hasAppsScript = Boolean(localStorage.getItem('mango_apps_script_url'));
    if (hasAppsScript) {
      showToast(`Pengeluaran ${newExpense.item} berhasil dicatat & dikirim ke Sheet!`);
    } else {
      showToast(`Pengeluaran ${newExpense.item} dicatat di web (Masukkan Web App URL di ⚙️ agar tercatat di Google Sheet).`);
    }
  };

  // Add Multiple Expenses at once (Batch)
  const handleAddMultipleExpenses = (newExpenses: ExpenseItem[]) => {
    if (newExpenses.length === 0) return;

    setExpenses((prev) => {
      const updated = [...newExpenses, ...prev];
      setMetrics(calculateMetrics(orders, updated, cashflow));
      return updated;
    });

    postExpensesBatchToSheet(newExpenses);
    setTimeout(() => loadData(true), 3000);

    const totalNominal = newExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const itemSummary = newExpenses.map((e) => e.item).join(', ');

    logAudit(
      'CREATE_EXPENSE',
      'Pengeluaran',
      `Mencatat belanja sekaligus (${newExpenses.length} item): ${formatRupiah(totalNominal)}`,
      `Item: ${itemSummary}`
    );

    const hasAppsScript = Boolean(localStorage.getItem('mango_apps_script_url'));
    if (hasAppsScript) {
      showToast(`${newExpenses.length} item belanja berhasil dicatat & dikirim ke Sheet!`);
    } else {
      showToast(`${newExpenses.length} item belanja dicatat di web.`);
    }
  };

  // Update Sisa Qty of an Expense Item
  const handleUpdateExpenseSisa = (expenseId: string, newSisaQty: string | number) => {
    let targetItem = '';
    let updatedExpObj: ExpenseItem | null = null;

    setExpenses((prev) => {
      const updated = prev.map((exp) => {
        if (exp.id === expenseId) {
          targetItem = exp.item;
          updatedExpObj = {
            ...exp,
            sisaQty: newSisaQty,
          };
          return updatedExpObj;
        }
        return exp;
      });
      return updated;
    });

    if (updatedExpObj) {
      postExpenseSisaQtyToSheet(updatedExpObj, newSisaQty);
      setTimeout(() => loadData(true), 2500);
    }

    logAudit(
      'UPDATE_EXPENSE',
      'Pengeluaran',
      `Mengubah sisa stok ${targetItem || 'Bahan'}`,
      `Sisa Qty diperbarui menjadi: ${newSisaQty}`
    );

    const hasAppsScript = Boolean(localStorage.getItem('mango_apps_script_url'));
    if (hasAppsScript) {
      showToast(`Sisa stok ${targetItem} (${newSisaQty}) disimpan & disinkronkan ke Sheet!`);
    } else {
      showToast(`Sisa stok ${targetItem} (${newSisaQty}) diperbarui di web.`);
    }
  };

  const handleSaveSheetId = (newId: string) => {
    setSheetId(newId);
    localStorage.setItem('mango_sheet_id', newId);

    logAudit(
      'UPDATE_SETTINGS',
      'Sistem',
      'Memperbarui konfigurasi spreadsheet ID',
      `ID baru: ${newId}`
    );

    showToast('ID Spreadsheet diperbarui!');
  };

  const handleClearLogs = () => {
    const isSam =
      currentUser?.name?.toLowerCase() === 'sam' ||
      currentUser?.email?.toLowerCase().startsWith('sam') ||
      currentUser?.username?.toLowerCase() === 'sam';
    if (!isSam) {
      showToast('Akses ditolak: Hanya Admin Sam yang berwenang mereset riwayat log!');
      return;
    }
    clearAuditLogs(currentUser?.name || 'Sam');
    setAuditLogs(getAuditLogs());
    showToast('Riwayat audit log berhasil direset oleh Sam.');
  };

  // If not logged in, show beautiful LoginPage
  // Switch active profile without requiring password
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('mango_current_user', JSON.stringify(user));
    const newLog = recordAuditLog({
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      category: 'Autentikasi',
      description: `Beralih profil ke ${user.name}`,
    });
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(`Aktif sebagai ${user.name} (${user.role})`);
  };

  const activeUser = currentUser || getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Navbar */}
      <Navbar
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={() => loadData(false)}
        autoSync={autoSync}
        setAutoSync={setAutoSync}
        onOpenNewOrder={() => setIsOrderModalOpen(true)}
        onOpenNewExpense={() => setIsExpenseModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isLiveConnected={isLiveConnected}
        currentUser={activeUser}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main Container (Full Screen) */}
      <main className="w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 space-y-4 sm:space-y-6 flex-1">
        {/* KPI Metric Cards */}
        <MetricCards metrics={metrics} />

        {/* Charts Section */}
        <ChartsSection orders={orders} expenses={expenses} />

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pt-1 sm:pt-2 overflow-x-auto scrollbar-none">
          <div className="flex space-x-1 sm:space-x-4 pb-1 shrink-0">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
                activeTab === 'orders'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Penjualan</span>
              <span className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full ${
                activeTab === 'orders' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
                activeTab === 'expenses'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Pengeluaran</span>
              <span className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full ${
                activeTab === 'expenses' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {expenses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cashflow')}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
                activeTab === 'cashflow'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Buku Kas</span>
              <span className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full ${
                activeTab === 'cashflow' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {cashflow.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div>
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              onToggleStatus={handleToggleStatus}
              onOpenNewOrder={() => setIsOrderModalOpen(true)}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesTab
              expenses={expenses}
              onOpenNewExpense={(mode) => {
                setExpenseModalMode(mode || 'batch');
                setIsExpenseModalOpen(true);
              }}
              onUpdateSisaQty={handleUpdateExpenseSisa}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashflowTab cashflows={cashflow} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🥭 Mango Tracker • Terhubung ke Google Spreadsheet Live</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:underline text-amber-600 font-medium cursor-pointer"
            >
              Pengaturan & Audit Log Sistem
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onAddOrder={handleAddOrder}
      />

      <NewExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onAddExpense={handleAddExpense}
        onAddMultipleExpenses={handleAddMultipleExpenses}
        initialMode={expenseModalMode}
      />

      <SheetSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        spreadsheetId={sheetId}
        onSaveSheetId={handleSaveSheetId}
        logs={auditLogs}
        onClearLogs={handleClearLogs}
        currentUser={currentUser}
      />
    </div>
  );
}
