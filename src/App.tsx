import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchOrders,
  fetchExpenses,
  fetchCashflow,
  calculateMetrics,
  postOrderToSheet,
  postExpenseToSheet,
  SPREADSHEET_ID,
} from './services/sheetsService';
import { getCurrentUser, logoutUser } from './services/authService';
import { OrderItem, ExpenseItem, CashflowItem, DashboardMetrics, User } from './types';
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
    showToast(`Selamat datang, ${user.name}!`);
  };

  // Handle Logout
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    showToast('Anda telah berhasil keluar (logout).');
  };

  // Toggle Order Paid Status
  const handleToggleStatus = (orderId: string) => {
    setOrders((prev) => {
      const updated = prev.map((ord) => {
        if (ord.id === orderId) {
          const nextStatus = ord.status === 'Paid' ? 'Not Paid' : 'Paid';
          return {
            ...ord,
            status: nextStatus,
            pembayaran: nextStatus === 'Paid' && ord.pembayaran === '-' ? 'BCA' : ord.pembayaran,
          };
        }
        return ord;
      });
      setMetrics(calculateMetrics(updated, expenses, cashflow));
      return updated;
    });
    showToast('Status pesanan berhasil diperbarui!');
  };

  // Add New Order
  const handleAddOrder = (newOrder: OrderItem) => {
    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      setMetrics(calculateMetrics(updated, expenses, cashflow));
      return updated;
    });
    postOrderToSheet(newOrder);
    showToast(`Pesanan untuk ${newOrder.namaPemesan} berhasil dicatat!`);
  };

  // Add New Expense
  const handleAddExpense = (newExpense: ExpenseItem) => {
    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      setMetrics(calculateMetrics(orders, updated, cashflow));
      return updated;
    });
    postExpenseToSheet(newExpense);
    showToast(`Pengeluaran ${newExpense.item} berhasil dicatat!`);
  };

  const handleSaveSheetId = (newId: string) => {
    setSheetId(newId);
    localStorage.setItem('mango_sheet_id', newId);
    showToast('ID Spreadsheet diperbarui!');
  };

  // If not logged in, show beautiful LoginPage
  if (!currentUser) {
    return (
      <>
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
            {toastMessage}
          </div>
        )}
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

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
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 flex-1">
        {/* KPI Metric Cards */}
        <MetricCards metrics={metrics} />

        {/* Charts Section */}
        <ChartsSection orders={orders} expenses={expenses} />

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pt-2">
          <div className="flex space-x-2 sm:space-x-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
                activeTab === 'orders'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Penjualan / Pesanan</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                activeTab === 'orders' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
                activeTab === 'expenses'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Pembelian & Pengeluaran</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                activeTab === 'expenses' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {expenses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cashflow')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
                activeTab === 'cashflow'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Buku Kas (Cash Flow)</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
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
              onOpenNewExpense={() => setIsExpenseModalOpen(true)}
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
              className="hover:underline text-amber-600 font-medium"
            >
              Konfigurasi Integrasi Sheet
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
      />

      <SheetSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        spreadsheetId={sheetId}
        onSaveSheetId={handleSaveSheetId}
      />
    </div>
  );
}
