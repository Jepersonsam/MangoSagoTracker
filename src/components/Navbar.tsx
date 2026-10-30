import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, PlusCircle, Settings, AlertCircle, LogOut, ChevronDown, Shield, ShoppingBag } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  onOpenNewOrder: () => void;
  onOpenNewExpense: () => void;
  onOpenSettings: () => void;
  isLiveConnected: boolean;
  currentUser: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lastUpdated,
  isLoading,
  onRefresh,
  autoSync,
  setAutoSync,
  onOpenNewOrder,
  onOpenNewExpense,
  onOpenSettings,
  isLiveConnected,
  currentUser,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full">
      <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl sm:text-2xl shadow-inner border border-amber-200 shrink-0">
              🥭
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-bold text-sm sm:text-lg text-slate-900 leading-tight">
                  Mango Sago
                </h1>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-1.5 sm:px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-500">
                Pencatatan Penjualan & Pengeluaran Realtime
              </p>
            </div>
          </div>

          {/* Center: Live Status & Sync Info (Desktop only) */}
          <div className="hidden lg:flex items-center space-x-3 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              {isLiveConnected ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-emerald-700">Live Terhubung</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium text-amber-700">Mode Cadangan</span>
                </>
              )}
            </div>
            <span className="text-slate-300">|</span>
            <span>Update: {formatTime(lastUpdated)}</span>
            <span className="text-slate-300">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-slate-600">Auto (30s)</span>
            </label>
          </div>

          {/* Action Buttons & User Menu */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Sinkronisasi data terbaru dari Google Sheets"
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition border border-slate-200 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            <button
              onClick={onOpenNewExpense}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Belanja</span>
            </button>

            <button
              onClick={onOpenNewOrder}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">+ Pesanan</span>
              <span className="xs:hidden">Pesanan</span>
            </button>

            {/* Sheet Settings button */}
            <button
              onClick={onOpenSettings}
              title="Pengaturan & Audit Log"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition border border-slate-200 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* User Profile Menu */}
            {currentUser && (
              <div className="relative pl-0.5 sm:pl-2" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1 sm:gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition active:scale-98 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300/60 flex items-center justify-center text-sm shrink-0">
                    {currentUser.avatar || '👑'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[100px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      {currentUser.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        Admin {currentUser.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {currentUser.email}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenNewExpense();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 md:hidden cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Catat Belanja Baru</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>Pengaturan & Audit Log</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
