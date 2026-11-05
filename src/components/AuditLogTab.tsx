import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Trash2,
  Filter,
  User as UserIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Key,
  ShoppingCart,
  ShoppingBag,
  RefreshCw,
  Settings,
  Lock,
  Megaphone,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { AuditLog, User } from '../types';

interface AuditLogTabProps {
  logs: AuditLog[];
  onClearLogs: () => void;
  currentUser?: User | null;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ logs, onClearLogs, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [adminFilter, setAdminFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const isSam =
    currentUser?.name?.toLowerCase() === 'sam' ||
    currentUser?.email?.toLowerCase().startsWith('sam') ||
    currentUser?.username?.toLowerCase() === 'sam';

  // Available unique admins
  const admins = ['All', 'Ebi', 'Tia', 'Sam'];

  // Categories
  const categories = ['All', 'Autentikasi', 'Pesanan', 'Pengeluaran', 'Sistem', 'Pengumuman'];

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const list = logs.filter((log) => {
      const matchesSearch =
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAdmin = adminFilter === 'All' || log.userName.toLowerCase() === adminFilter.toLowerCase();
      const matchesCat = categoryFilter === 'All' || log.category === categoryFilter;

      return matchesSearch && matchesAdmin && matchesCat;
    });

    return [...list].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [logs, searchTerm, adminFilter, categoryFilter, dateSortOrder]);

  const handleExportCsv = () => {
    const header = ['ID', 'Waktu', 'Admin', 'Peran', 'Kategori', 'Aksi', 'Deskripsi', 'Detail'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.formattedDate}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.category}"`,
      l.action,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_mango_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: AuditLog['action'], category: AuditLog['category']) => {
    switch (action) {
      case 'CREATE_ORDER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <ShoppingCart className="w-3 h-3 text-amber-600" />
            + Pesanan
          </span>
        );
      case 'UPDATE_ORDER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ubah Status
          </span>
        );
      case 'CREATE_EXPENSE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
            <ShoppingBag className="w-3 h-3 text-rose-600" />
            + Belanja
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <Key className="w-3 h-3 text-blue-600" />
            Login
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            Logout
          </span>
        );
      case 'SYNC_SHEETS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <RefreshCw className="w-3 h-3 text-purple-600" />
            Sync Sheet
          </span>
        );
      case 'UPDATE_SETTINGS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
            <Settings className="w-3 h-3 text-indigo-600" />
            Pengaturan
          </span>
        );
      case 'BROADCAST':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
            <Megaphone className="w-3 h-3 text-rose-600" />
            Broadcast
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-amber-50/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Audit Log & Rekam Jejak Aktivitas
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">
                {filteredLogs.length} Catatan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencatatan realtime seluruh aktivitas admin (Ebi, Tia, Sam) untuk akuntabilitas internal usaha.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Date Toggle */}
            <button
              type="button"
              onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}
              title={`Urutkan Waktu: ${dateSortOrder === 'desc' ? 'Terbaru ke Terlama (DESC)' : 'Terlama ke Terbaru (ASC)'}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>{dateSortOrder === 'desc' ? 'Waktu: DESC ↓' : 'Waktu: ASC ↑'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {isSam ? (
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Log</span>
              </button>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed select-none"
                title="Hanya Admin Sam yang berwenang mereset riwayat audit log"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Reset Log</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari aktivitas, admin, atau detail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-800"
            />
          </div>

          {/* Admin filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Admin:</span>
            <select
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="w-full py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer text-slate-800 font-medium"
            >
              {admins.map((adm) => (
                <option key={adm} value={adm}>
                  {adm === 'All' ? 'Semua Admin (Ebi, Tia, Sam)' : `👑 Admin ${adm}`}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer text-slate-800 font-medium"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'Semua Kategori' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Card List View (Phones) */}
      <div className="sm:hidden divide-y divide-slate-100">
        {filteredLogs.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <FileText className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <p className="font-medium text-xs">Tidak ada catatan log.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                  <span>👑</span> {log.userName}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{log.formattedDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div>{getActionBadge(log.action, log.category)}</div>
                <span className="text-[11px] text-slate-400 font-medium">• {log.category}</span>
              </div>

              <p className="font-semibold text-xs text-slate-800 leading-snug">
                {log.description}
              </p>

              {log.details && (
                <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 break-words">
                  {log.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Log Table (Tablet & Desktop) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th
                onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}
                className="py-3 px-4 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition select-none group"
                title={`Klik untuk ubah urutan waktu (${dateSortOrder === 'desc' ? 'DESC -> ASC' : 'ASC -> DESC'})`}
              >
                <div className="flex items-center gap-1.5 text-slate-800">
                  <span>Waktu & Tanggal</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 font-extrabold flex items-center gap-0.5">
                    {dateSortOrder === 'desc' ? (
                      <><span>DESC</span><ArrowDown className="w-3 h-3" /></>
                    ) : (
                      <><span>ASC</span><ArrowUp className="w-3 h-3" /></>
                    )}
                  </span>
                </div>
              </th>
              <th className="py-3 px-4">Admin</th>
              <th className="py-3 px-4 text-center">Aksi / Tipe</th>
              <th className="py-3 px-4">Deskripsi Aktivitas</th>
              <th className="py-3 px-4">Detail Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="space-y-1">
                    <FileText className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="font-medium text-xs">Tidak ada catatan log yang sesuai dengan filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{log.formattedDate}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <span>👑</span> {log.userName}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {getActionBadge(log.action, log.category)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {log.description}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {log.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal to Clear Logs */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Bersihkan Riwayat Audit Log?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengosongkan seluruh riwayat log sebelumnya dan mencatat event pembersihan baru atas nama Anda.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmClear(false);
                  if (isSam) {
                    onClearLogs();
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer transition"
              >
                Ya, Bersihkan Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

