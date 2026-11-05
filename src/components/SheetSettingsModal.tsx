import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Link2,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Database,
  Key,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { AuditLogTab } from './AuditLogTab';
import { AuditLog, User } from '../types';
import { getSupabaseConfig, setSupabaseConfig, testSupabaseConnection } from '../services/supabaseClient';
import { SUPABASE_SCHEMA_SQL } from '../services/supabaseSchemaSql';
import { resetDatabaseToZero } from '../services/supabaseService';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId?: string;
  onSaveSheetId?: (id: string) => void;
  logs?: AuditLog[];
  onClearLogs?: () => void;
  currentUser?: User | null;
  initialTab?: 'supabase' | 'audit';
  onDatabaseConfigured?: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  logs = [],
  onClearLogs = () => {},
  currentUser,
  initialTab = 'supabase',
  onDatabaseConfigured,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'audit'>(initialTab);
  const [copiedSql, setCopiedSql] = useState(false);

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseConfig().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSupabaseConfig().anonKey);
  const [sbTestStatus, setSbTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [sbTestMessage, setSbTestMessage] = useState('');

  // Reset confirmation state
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setSupabaseUrl(config.url);
      setSupabaseAnonKey(config.anonKey);
      setActiveTab('supabase');
      setSbTestStatus('idle');
      setSbTestMessage('');
      setResetFeedback('');
      setShowResetConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save Supabase Settings
  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseConfig(supabaseUrl, supabaseAnonKey);
    if (onDatabaseConfigured) {
      onDatabaseConfigured();
    }
    onClose();
  };

  // Test Supabase Connection
  const handleTestSupabase = async () => {
    setSbTestStatus('testing');
    setSbTestMessage('Menghubungkan ke Supabase Database...');

    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    if (res.success) {
      setSbTestStatus('success');
      setSbTestMessage(res.message);
    } else {
      setSbTestStatus('error');
      setSbTestMessage(res.message);
    }
  };

  // Copy Supabase SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Handle Wipe Data from Supabase to 0
  const handleWipeDatabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setSbTestStatus('error');
      setSbTestMessage('Masukkan Project URL dan Anon Key terlebih dahulu.');
      return;
    }

    setSupabaseConfig(supabaseUrl, supabaseAnonKey);
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

  const isSupabaseConfigured = getSupabaseConfig().isConfigured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Pengaturan Database & Sistem
              </h2>
              <p className="text-xs text-slate-500">
                Aplikasi terhubung langsung ke database Supabase PostgreSQL (Real-time Cloud)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher inside Modal */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 shrink-0 gap-2 overflow-x-auto">
          {/* Tab 1: Database Supabase */}
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'supabase'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Database Supabase</span>
            {isSupabaseConfigured ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                Aktif
              </span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                Belum Terhubung
              </span>
            )}
          </button>

          {/* Tab 2: Audit Log */}
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-blue-500" />
            <span>Audit Log (Rekam Jejak)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'audit'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {logs.length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* TAB 1: SUPABASE DATABASE */}
          {activeTab === 'supabase' && (
            <form onSubmit={handleSaveSupabase} className="space-y-4 text-xs max-w-2xl mx-auto bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              
              {/* Status Header Banner */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-slate-700">
                  <h4 className="font-bold text-emerald-900 text-xs sm:text-sm">
                    Supabase PostgreSQL (Database Tunggal & Terpusat)
                  </h4>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                    Aplikasi kini 100% mandiri menggunakan Supabase. Setiap penambahan pesanan, pembayaran, dan belanja tersimpan langsung ke PostgreSQL secara real-time.
                  </p>
                </div>
              </div>

              {/* Supabase URL */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Project URL Supabase</span>
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => {
                    setSupabaseUrl(e.target.value);
                    setSbTestStatus('idle');
                  }}
                  placeholder="https://abcdefghijkl.supabase.co"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-mono text-[11px] bg-slate-50 focus:bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dari dashboard Supabase: <strong>Project Settings &gt; API &gt; Project URL</strong>.
                </p>
              </div>

              {/* Supabase Anon Key */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Project API Key (anon / public)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => {
                      setSupabaseAnonKey(e.target.value);
                      setSbTestStatus('idle');
                    }}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-mono text-[11px] bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={sbTestStatus === 'testing' || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sbTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Tes Koneksi</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dari dashboard Supabase: <strong>Project Settings &gt; API &gt; Project API keys (anon)</strong>.
                </p>
              </div>

              {/* Test Feedback */}
              {sbTestStatus !== 'idle' && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                    sbTestStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : sbTestStatus === 'testing'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {sbTestStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : sbTestStatus === 'testing' ? (
                    <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 animate-spin mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 leading-relaxed">
                    <span className="font-semibold">{sbTestMessage}</span>
                  </div>
                </div>
              )}

              {/* SQL Schema Copy Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Skrip SQL Tabel Bersih (Mulai dari 0)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'SQL Tersalin!' : 'Salin SQL Schema'}</span>
                  </button>
                </div>

                <div className="text-slate-600 leading-relaxed text-[11px] space-y-1">
                  <p>
                    Skrip ini membuat struktur tabel database (<strong>orders</strong>, <strong>expenses</strong>, <strong>cashflows</strong>, <strong>audit_logs</strong>) dalam kondisi <strong>kosong (0)</strong>, siap diisi transaksi baru Anda.
                  </p>
                  <p>
                    Tempelkan di <strong>SQL Editor</strong> di dashboard Supabase lalu klik <strong>Run</strong>.
                  </p>
                </div>
              </div>

              {/* Danger Zone: Reset Database ke 0 */}
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Kosongkan Seluruh Data Database (Mulai dari 0)</span>
                </div>
                <p className="text-[11px] text-rose-800/90 leading-relaxed">
                  Gunakan tombol ini jika Anda ingin menghapus seluruh pesanan, belanja, dan buku kas yang tersimpan di Supabase agar benar-benar mulai dari awal (0).
                </p>

                {showResetConfirm ? (
                  <div className="p-3 bg-white rounded-lg border border-rose-300 space-y-2">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Apakah Anda yakin ingin mengosongkan semua data?</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Tindakan ini akan menghapus permanen seluruh data pesanan, pengeluaran, dan buku kas di Supabase.
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
                    disabled={isResetting || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg font-semibold text-xs transition cursor-pointer disabled:opacity-50"
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

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition cursor-pointer"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <AuditLogTab
                logs={logs}
                onClearLogs={onClearLogs}
                currentUser={currentUser}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
