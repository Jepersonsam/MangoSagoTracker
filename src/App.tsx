import React, { useState, useEffect, useCallback } from 'react';
import { calculateMetrics, formatRupiah } from './services/sheetsService';
import { getCurrentUser, logoutUser } from './services/authService';
import { getAuditLogs, recordAuditLog, clearAuditLogs } from './services/auditService';
import { getSupabaseConfig } from './services/supabaseClient';
import {
  fetchOrdersFromSupabase,
  fetchExpensesFromSupabase,
  fetchCashflowFromSupabase,
  fetchAuditLogsFromSupabase,
  createOrderInSupabase,
  updateOrderStatusInSupabase,
  updateOrderInSupabase,
  deleteOrderInSupabase,
  createExpenseInSupabase,
  createBatchExpensesInSupabase,
  updateExpenseSisaInSupabase,
  updateExpenseInSupabase,
  deleteExpenseInSupabase,
  deleteCashflowInSupabase,
  insertAuditLogInSupabase,
  clearAuditLogsInSupabase,
  subscribeToSupabaseChanges,
} from './services/supabaseService';
import { OrderItem, ExpenseItem, CashflowItem, DashboardMetrics, User, AuditLog } from './types';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { ChartsSection } from './components/ChartsSection';
import { OrdersTab } from './components/OrdersTab';
import { ExpensesTab } from './components/ExpensesTab';
import { CashflowTab } from './components/CashflowTab';
import { NewOrderModal } from './components/NewOrderModal';
import { EditOrderModal } from './components/EditOrderModal';
import { NewExpenseModal } from './components/NewExpenseModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { ConfirmDeleteModal, DeleteConfirmTarget } from './components/ConfirmDeleteModal';
import { LoginPage } from './components/LoginPage';
import { ShoppingBag, ShoppingCart, Landmark } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());

  // Data starts strictly from 0 (empty arrays)
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
  const [isSupabaseActive, setIsSupabaseActive] = useState<boolean>(() => getSupabaseConfig().isConfigured);
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseModalMode, setExpenseModalMode] = useState<'single' | 'batch'>('batch');
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirmTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to record an audit action
  const logAudit = async (
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

    if (getSupabaseConfig().isConfigured) {
      try {
        await insertAuditLogInSupabase(newEntry);
      } catch (err) {
        console.error('Failed to write audit log to Supabase:', err);
      }
    }
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!currentUser) return;
    if (!isSilent) setIsLoading(true);

    const sbConfig = getSupabaseConfig();

    if (sbConfig.isConfigured) {
      try {
        const [fetchedOrders, fetchedExpenses, fetchedCashflow] = await Promise.all([
          fetchOrdersFromSupabase(),
          fetchExpensesFromSupabase(),
          fetchCashflowFromSupabase(),
        ]);

        setOrders(fetchedOrders);
        setExpenses(fetchedExpenses);
        setCashflow(fetchedCashflow);
        setMetrics(calculateMetrics(fetchedOrders, fetchedExpenses, fetchedCashflow));
        setLastUpdated(new Date());
        setIsLiveConnected(true);
        setIsSupabaseActive(true);

        // Fetch Supabase audit logs
        try {
          const sbLogs = await fetchAuditLogsFromSupabase();
          if (sbLogs && sbLogs.length > 0) {
            setAuditLogs(sbLogs);
          }
        } catch (logErr) {
          console.warn('Could not fetch audit logs from Supabase:', logErr);
        }

        if (!isSilent) {
          showToast('Data berhasil disinkronkan dengan Supabase!');
        }
        return;
      } catch (err) {
        console.error('Supabase fetch error:', err);
        setIsLiveConnected(false);
        showToast('Gagal terhubung ke database Supabase.');
      } finally {
        if (!isSilent) setIsLoading(false);
      }
    } else {
      // If not configured, start with clean empty data (0)
      setOrders([]);
      setExpenses([]);
      setCashflow([]);
      setMetrics(calculateMetrics([], [], []));
      setLastUpdated(new Date());
      setIsLiveConnected(false);
      setIsSupabaseActive(false);
      if (!isSilent) setIsLoading(false);
    }
  }, [currentUser]);

  // Initial load when logged in
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [loadData, currentUser]);

  // Supabase Real-time Subscriptions (Sync instantaneously across devices)
  useEffect(() => {
    if (!currentUser) return;
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    const unsubscribe = subscribeToSupabaseChanges(() => {
      loadData(true);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, loadData, isSupabaseActive]);

  // Fallback Polling every 30s
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

    if (getSupabaseConfig().isConfigured) {
      insertAuditLogInSupabase(newLog).catch(console.error);
    }
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

      if (getSupabaseConfig().isConfigured) {
        insertAuditLogInSupabase(newLog).catch(console.error);
      }
    }
    logoutUser();
    setCurrentUser(null);
    showToast('Anda telah berhasil keluar (logout).');
  };

  // ===================== CRUD ORDERS =====================

  // CREATE ORDER
  const handleAddOrder = async (newOrder: OrderItem) => {
    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      setMetrics(calculateMetrics(updated, expenses, cashflow));
      return updated;
    });

    logAudit(
      'CREATE_ORDER',
      'Pesanan',
      `Menambah pesanan baru: ${newOrder.namaPemesan}`,
      `${newOrder.qty} cup • ${formatRupiah(newOrder.amount)} • Bayar: ${newOrder.pembayaran} • Batch: ${newOrder.batch || '-'}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await createOrderInSupabase(newOrder);
      if (success) {
        showToast(`Pesanan untuk ${newOrder.namaPemesan} tersimpan di Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal menyimpan pesanan ke Supabase.`);
      }
    } else {
      showToast(`Pesanan untuk ${newOrder.namaPemesan} dicatat di web.`);
    }
  };

  // UPDATE ORDER (Toggle Paid Status)
  const handleToggleStatus = async (orderId: string) => {
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

    logAudit(
      'UPDATE_ORDER',
      'Pesanan',
      `Mengubah status pesanan untuk ${changedOrderName || 'Pelanggan'}`,
      `Status diperbarui menjadi: ${nextStatus} (ID: ${orderId})`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await updateOrderStatusInSupabase(
        orderId,
        nextStatus,
        updatedOrderObj?.pembayaran,
        updatedOrderObj || undefined
      );
      if (success) {
        showToast(`Status ${changedOrderName} diperbarui di Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal menyimpan perubahan ke Supabase.`);
      }
    } else {
      showToast(`Status ${changedOrderName} diperbarui di web.`);
    }
  };

  // UPDATE ORDER (Full Edit)
  const handleEditOrder = async (updatedOrder: OrderItem) => {
    setOrders((prev) => {
      const updated = prev.map((ord) => (ord.id === updatedOrder.id ? updatedOrder : ord));
      setMetrics(calculateMetrics(updated, expenses, cashflow));
      return updated;
    });

    logAudit(
      'UPDATE_ORDER',
      'Pesanan',
      `Mengedit pesanan: ${updatedOrder.namaPemesan}`,
      `${updatedOrder.qty} cup • ${formatRupiah(updatedOrder.amount)} • Status: ${updatedOrder.status} • Bayar: ${updatedOrder.pembayaran}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await updateOrderInSupabase(updatedOrder);
      if (success) {
        showToast(`Pesanan ${updatedOrder.namaPemesan} berhasil diperbarui di Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal mengedit pesanan di Supabase.`);
      }
    } else {
      showToast(`Pesanan ${updatedOrder.namaPemesan} diperbarui di web.`);
    }
  };

  // PROMPT DELETE ORDER (Shows Warning Modal)
  const handleRequestDeleteOrder = (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    setDeleteTarget({
      type: 'order',
      id: target.id,
      title: target.namaPemesan || 'Pelanggan',
      amount: target.amount,
      qty: target.qty,
      categoryOrStatus: target.status,
      date: target.tanggal,
    });
  };

  // DELETE ORDER
  const handleDeleteOrder = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      setMetrics(calculateMetrics(updated, expenses, cashflow));
      return updated;
    });

    logAudit(
      'UPDATE_ORDER',
      'Pesanan',
      `Menghapus pesanan: ${target?.namaPemesan || 'Pelanggan'}`,
      `ID: ${orderId}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await deleteOrderInSupabase(orderId, target);
      if (success) {
        showToast(`Pesanan ${target?.namaPemesan || ''} berhasil dihapus dari Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal menghapus pesanan di Supabase.`);
      }
    } else {
      showToast(`Pesanan berhasil dihapus di web.`);
    }
  };

  // ===================== CRUD EXPENSES =====================

  // CREATE EXPENSE (Single)
  const handleAddExpense = async (newExpense: ExpenseItem) => {
    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      setMetrics(calculateMetrics(orders, updated, cashflow));
      return updated;
    });

    logAudit(
      'CREATE_EXPENSE',
      'Pengeluaran',
      `Mencatat belanja bahan/operasional: ${newExpense.item}`,
      `${newExpense.qty} item • ${formatRupiah(newExpense.totalAmount)} • Kategori: ${newExpense.category}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await createExpenseInSupabase(newExpense);
      if (success) {
        showToast(`Pengeluaran ${newExpense.item} tersimpan di Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal menyimpan pengeluaran ke Supabase.`);
      }
    } else {
      showToast(`Pengeluaran ${newExpense.item} dicatat di web.`);
    }
  };

  // CREATE EXPENSES (Batch Multi-Item)
  const handleAddMultipleExpenses = async (newExpenses: ExpenseItem[]) => {
    if (newExpenses.length === 0) return;

    setExpenses((prev) => {
      const updated = [...newExpenses, ...prev];
      setMetrics(calculateMetrics(orders, updated, cashflow));
      return updated;
    });

    const totalNominal = newExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const itemSummary = newExpenses.map((e) => e.item).join(', ');

    logAudit(
      'CREATE_EXPENSE',
      'Pengeluaran',
      `Mencatat belanja sekaligus (${newExpenses.length} item): ${formatRupiah(totalNominal)}`,
      `Item: ${itemSummary}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await createBatchExpensesInSupabase(newExpenses);
      if (success) {
        showToast(`${newExpenses.length} item belanja tersimpan di Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal menyimpan belanja ke Supabase.`);
      }
    } else {
      showToast(`${newExpenses.length} item belanja dicatat di web.`);
    }
  };

  // UPDATE EXPENSE SISA QTY (Inline)
  const handleUpdateExpenseSisa = async (expenseId: string, newSisaQty: string | number) => {
    let targetItem = '';

    setExpenses((prev) => {
      const updated = prev.map((exp) => {
        if (exp.id === expenseId) {
          targetItem = exp.item;
          return {
            ...exp,
            sisaQty: newSisaQty,
          };
        }
        return exp;
      });
      return updated;
    });

    logAudit(
      'UPDATE_EXPENSE',
      'Pengeluaran',
      `Mengubah sisa stok ${targetItem || 'Bahan'}`,
      `Sisa Qty diperbarui menjadi: ${newSisaQty}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await updateExpenseSisaInSupabase(expenseId, newSisaQty);
      if (success) {
        showToast(`Sisa stok ${targetItem} (${newSisaQty}) tersimpan di Supabase!`);
      } else {
        showToast(`Gagal menyimpan sisa stok ke Supabase.`);
      }
    } else {
      showToast(`Sisa stok ${targetItem} (${newSisaQty}) diperbarui di web.`);
    }
  };

  // UPDATE EXPENSE (Full Edit)
  const handleEditExpense = async (updatedExpense: ExpenseItem) => {
    setExpenses((prev) => {
      const updated = prev.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp));
      setMetrics(calculateMetrics(orders, updated, cashflow));
      return updated;
    });

    logAudit(
      'UPDATE_EXPENSE',
      'Pengeluaran',
      `Mengedit belanja: ${updatedExpense.item}`,
      `${updatedExpense.qty} item • ${formatRupiah(updatedExpense.totalAmount)} • Kategori: ${updatedExpense.category}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await updateExpenseInSupabase(updatedExpense);
      if (success) {
        showToast(`Pengeluaran ${updatedExpense.item} berhasil diperbarui di Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal mengedit belanja di Supabase.`);
      }
    } else {
      showToast(`Pengeluaran ${updatedExpense.item} diperbarui di web.`);
    }
  };

  // DELETE EXPENSE
  const handleDeleteExpense = async (expenseId: string) => {
    const target = expenses.find((e) => e.id === expenseId);
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== expenseId);
      setMetrics(calculateMetrics(orders, updated, cashflow));
      return updated;
    });

    logAudit(
      'UPDATE_EXPENSE',
      'Pengeluaran',
      `Menghapus belanja: ${target?.item || expenseId}`,
      `ID: ${expenseId}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await deleteExpenseInSupabase(expenseId, target);
      if (success) {
        showToast(`Pengeluaran ${target?.item || ''} berhasil dihapus dari Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal menghapus pengeluaran di Supabase.`);
      }
    } else {
      showToast(`Pengeluaran berhasil dihapus di web.`);
    }
  };

  // PROMPT DELETE EXPENSE (Shows Warning Modal)
  const handleRequestDeleteExpense = (expenseId: string) => {
    const target = expenses.find((e) => e.id === expenseId);
    if (!target) return;
    setDeleteTarget({
      type: 'expense',
      id: target.id,
      title: target.item || 'Item Pengeluaran',
      amount: target.totalAmount,
      qty: typeof target.qty === 'number' ? target.qty : undefined,
      categoryOrStatus: target.category,
      date: target.tanggal,
    });
  };

  // PROMPT DELETE CASHFLOW (Shows Warning Modal)
  const handleRequestDeleteCashflow = (cfId: string) => {
    const target = cashflow.find((c) => c.id === cfId);
    if (!target) return;
    setDeleteTarget({
      type: 'cashflow',
      id: target.id,
      title: target.transaksi || 'Catatan Kas',
      amount: target.debit > 0 ? target.debit : target.kredit,
      categoryOrStatus: target.tipe,
      date: target.tanggal,
    });
  };

  // DELETE CASHFLOW
  const handleDeleteCashflow = async (cashflowId: string) => {
    const target = cashflow.find((c) => c.id === cashflowId);
    setCashflow((prev) => {
      const updated = prev.filter((c) => c.id !== cashflowId);
      let runBal = 0;
      const rebalanced = updated.map((item) => {
        runBal += (item.debit - item.kredit);
        return { ...item, balance: runBal };
      });
      setMetrics(calculateMetrics(orders, expenses, rebalanced));
      return rebalanced;
    });

    logAudit(
      'UPDATE_SETTINGS',
      'Sistem',
      `Menghapus catatan buku kas: ${target?.transaksi || cashflowId}`,
      `ID: ${cashflowId}`
    );

    const sbConfig = getSupabaseConfig();
    if (sbConfig.isConfigured) {
      const success = await deleteCashflowInSupabase(cashflowId);
      if (success) {
        showToast(`Catatan kas berhasil dihapus dari Supabase!`);
        setTimeout(() => loadData(true), 500);
      } else {
        showToast(`Gagal menghapus catatan kas di Supabase.`);
      }
    } else {
      showToast(`Catatan kas berhasil dihapus.`);
    }
  };

  // CONFIRM DELETE HANDLER (Called when user clicks "Ya, Hapus Permanen" on warning modal)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'order') {
        await handleDeleteOrder(deleteTarget.id);
      } else if (deleteTarget.type === 'expense') {
        await handleDeleteExpense(deleteTarget.id);
      } else if (deleteTarget.type === 'cashflow') {
        await handleDeleteCashflow(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error during delete:', err);
      showToast('Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ===================== AUDIT LOGS =====================
  const handleClearLogs = async () => {
    const isSam =
      currentUser?.name?.toLowerCase() === 'sam' ||
      currentUser?.email?.toLowerCase().startsWith('sam') ||
      currentUser?.username?.toLowerCase() === 'sam';
    if (!isSam) {
      showToast('Akses ditolak: Hanya Admin Sam yang berwenang mereset riwayat log!');
      return;
    }

    clearAuditLogs(currentUser?.name || 'Sam');
    if (getSupabaseConfig().isConfigured) {
      await clearAuditLogsInSupabase();
    }
    setAuditLogs(getAuditLogs());
    showToast('Riwayat audit log berhasil direset oleh Sam.');
  };

  // If not logged in, show LoginPage
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
        isSupabase={isSupabaseActive}
      />

      {/* Main Container */}
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
              onEditOrder={(ord) => {
                setEditingOrder(ord);
                setIsEditOrderModalOpen(true);
              }}
              onDeleteOrder={handleRequestDeleteOrder}
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
              onEditExpense={(exp) => {
                setEditingExpense(exp);
                setIsEditExpenseModalOpen(true);
              }}
              onDeleteExpense={handleRequestDeleteExpense}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashflowTab
              cashflows={cashflow}
              onDeleteCashflow={handleRequestDeleteCashflow}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            🥭 Mango Tracker • {isSupabaseActive ? '⚡ Supabase Real-Time Database Engine' : 'Supabase Database Belum Dikonfigurasi'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:underline text-amber-600 font-medium cursor-pointer"
            >
              Pengaturan Database & Audit Log
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

      <EditOrderModal
        isOpen={isEditOrderModalOpen}
        onClose={() => {
          setIsEditOrderModalOpen(false);
          setEditingOrder(null);
        }}
        order={editingOrder}
        onUpdateOrder={handleEditOrder}
        onDeleteOrder={handleRequestDeleteOrder}
      />

      <NewExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onAddExpense={handleAddExpense}
        onAddMultipleExpenses={handleAddMultipleExpenses}
        initialMode={expenseModalMode}
      />

      <EditExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onUpdateExpense={handleEditExpense}
        onDeleteExpense={handleRequestDeleteExpense}
      />

      <SheetSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        logs={auditLogs}
        onClearLogs={handleClearLogs}
        currentUser={currentUser}
        onDatabaseConfigured={() => {
          setIsSupabaseActive(getSupabaseConfig().isConfigured);
          loadData(false);
        }}
      />

      {/* Delete Confirmation Warning Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        target={deleteTarget}
        isLoading={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
