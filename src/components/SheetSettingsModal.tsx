import React, { useState } from 'react';
import {
  X,
  Database,
  Trash2,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { AuditLogTab } from './AuditLogTab';
import { AuditLog, User } from '../types';
import { resetDatabaseToZero } from '../services/supabaseService';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs?: AuditLog[];
  onClearLogs?: () => void;
  currentUser?: User | null;
  onDatabaseConfigured?: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  logs = [],
  onClearLogs = () => {},
  currentUser,
  onDatabaseConfigured,
}) => {
  // Emergency reset state (Super Admin only)
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  if (!isOpen) return null;

  const isSam =
    currentUser?.name?.toLowerCase() === 'sam' ||
    currentUser?.email?.toLowerCase().startsWith('sam') ||
    currentUser?.username?.toLowerCase() === 'sam';

  // Handle Wipe Data from Supabase to 0
  const handleWipeDatabase = async () => {
    setIsResetting(true);
    setResetFeedback('Mereset seluruh data tabel Supabase ke 0...');

    try {
      const res = await resetDatabaseToZero();
      setResetFeedback(res.message);
      setShowResetConfirm(false);
      if (res.success && onDatabaseConfigured) {
        onDatabaseConfigured();
      }
    } catch (err: any) {
      setResetFeedback('Gagal mereset: ' + (err.message || err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Rekam Jejak Aktivitas & Audit Log
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Database Online</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pantau riwayat pencatatan pesanan, pembayaran, dan belanja oleh tim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Direct Audit Log Tab */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <AuditLogTab
            logs={logs}
            onClearLogs={onClearLogs}
            currentUser={currentUser}
          />

          {/* Super Admin Emergency Zone (Sam only) */}
          {isSam && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              {!showAdminMenu ? (
                <button
                  type="button"
                  onClick={() => setShowAdminMenu(true)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>⚙️ Opsi Khusus Super Admin (Sam)</span>
                </button>
              ) : (
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Kosongkan Seluruh Data Database (Mulai dari 0)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminMenu(false);
                        setShowResetConfirm(false);
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Tutup Opsi
                    </button>
                  </div>
                  <p className="text-[11px] text-rose-800/90 leading-relaxed">
                    Fitur ini hanya dapat diakses oleh Sam (Super Admin). Menghapus seluruh transaksi di Supabase agar kembali bersih mulai dari nol.
                  </p>

                  {showResetConfirm ? (
                    <div className="p-3 bg-white rounded-xl border border-rose-300 space-y-2">
                      <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Konfirmasi: Yakin ingin mengosongkan seluruh data?</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Tindakan ini tidak dapat dibatalkan. Seluruh pesanan, belanja, dan buku kas akan di-reset ke 0.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleWipeDatabase}
                          disabled={isResetting}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isResetting ? 'Sedang Mengosongkan...' : 'Ya, Kosongkan Sekarang'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isResetting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg font-semibold text-xs transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan Semua Data ke 0</span>
                    </button>
                  )}

                  {resetFeedback && (
                    <div className="p-2.5 bg-white rounded-lg border border-rose-200 text-rose-900 font-semibold text-[11px] leading-relaxed">
                      {resetFeedback}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
