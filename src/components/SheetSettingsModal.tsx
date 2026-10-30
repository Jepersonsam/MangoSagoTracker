import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, Info, Link2, Settings, ShieldAlert } from 'lucide-react';
import { AuditLogTab } from './AuditLogTab';
import { AuditLog, User } from '../types';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  onSaveSheetId: (id: string) => void;
  logs?: AuditLog[];
  onClearLogs?: () => void;
  currentUser?: User | null;
  initialTab?: 'sheet' | 'audit';
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  spreadsheetId,
  onSaveSheetId,
  logs = [],
  onClearLogs = () => {},
  currentUser,
  initialTab = 'sheet',
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'audit'>(initialTab);
  const [sheetIdInput, setSheetIdInput] = useState(spreadsheetId);
  const [webAppUrl, setWebAppUrl] = useState(() => {
    return localStorage.getItem('mango_apps_script_url') || '';
  });
  const [copied, setCopied] = useState(false);

  // Sync sheetIdInput when spreadsheetId changes
  React.useEffect(() => {
    setSheetIdInput(spreadsheetId);
  }, [spreadsheetId]);

  // Sync initialTab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (sheetIdInput.trim()) {
      onSaveSheetId(sheetIdInput.trim());
    }
    localStorage.setItem('mango_apps_script_url', webAppUrl.trim());
    onClose();
  };

  const appsScriptCode = `// Pasang di Google Spreadsheet > Extensions > Apps Script
// Simpan (Ctrl+S), lalu Deploy > Manage deployments > Edit > New version > Deploy (Access: Anyone)

// 1. Menangani tes koneksi saat URL dibuka di browser
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    message: 'Google Apps Script Mango Tracker aktif dan siap menerima data!'
  })).setMimeType(ContentService.MimeType.JSON);
}

// 2. Menangani input & update data dari website ke Google Sheet
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // A. Tambah Pesanan Baru
    if (data.type === 'order') {
      var sheet = ss.getSheetByName('Pesanan') || ss.getSheets()[4];
      sheet.appendRow([
        data.tanggal,
        data.namaPemesan,
        data.qty,
        data.amount,
        data.status,
        data.note,
        data.pembayaran,
        data.batch || ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // B. Ubah Status Pesanan (Paid / Not Paid)
    if (data.type === 'update_status') {
      var sheet = ss.getSheetByName('Pesanan') || ss.getSheets()[4];
      var values = sheet.getDataRange().getValues();
      var targetNama = String(data.namaPemesan || '').trim().toLowerCase();
      var targetTgl = String(data.tanggal || '').trim().toLowerCase();
      var updated = false;

      // Loop dari baris 2 (index 1) untuk lewati baris header
      for (var r = 1; r < values.length; r++) {
        var rowTgl = String(values[r][0] || '').trim().toLowerCase();
        var rowNama = String(values[r][1] || '').trim().toLowerCase();

        if (rowNama === targetNama && (!targetTgl || rowTgl === targetTgl)) {
          // Kolom E (index 5) = Status
          sheet.getRange(r + 1, 5).setValue(data.status);
          // Kolom G (index 7) = Pembayaran
          if (data.pembayaran) {
            sheet.getRange(r + 1, 7).setValue(data.pembayaran);
          }
          updated = true;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', updated: updated }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // C. Tambah Pengeluaran / Belanja
    if (data.type === 'expense') {
      var sheet = ss.getSheetByName('Pembelian') || ss.getSheets()[2];
      sheet.appendRow([
        data.tanggal,
        data.item,
        data.unitPrice,
        data.qty,
        data.totalAmount,
        '',
        data.sisaQty || ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_type' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pengaturan Sistem & Integrasi
              </h3>
              <p className="text-[11px] text-slate-500">
                Kelola Google Sheet dan pantau rekam jejak aktivitas admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher inside Modal */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'sheet'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Integrasi Google Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'audit'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Log (Rekam Jejak)</span>
            <span
              className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full ${
                activeTab === 'audit'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {logs.length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {activeTab === 'sheet' ? (
            <form onSubmit={handleSave} className="space-y-4 text-xs max-w-2xl mx-auto bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              {/* Spreadsheet ID */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Google Spreadsheet ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetIdInput}
                    onChange={(e) => setSheetIdInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-mono text-[11px]"
                  />
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition"
                  >
                    <span>Buka Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pastikan akses share Google Sheet diset: <strong>"Anyone with the link can view"</strong>.
                </p>
              </div>

              {/* Web App URL for 2-Way Sync */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Google Apps Script Web App URL (Untuk Tulis Otomatis)</span>
                </label>
                <input
                  type="url"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfyc.../exec"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-mono text-[11px] bg-slate-50 focus:bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tempelkan URL Web App dari Apps Script Anda di sini agar pesanan atau belanja baru otomatis tercatat ke baris Google Sheet.
                </p>
              </div>

              {/* Apps Script Code snippet */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Script Google Apps Script (Dengan doGet & doPost)</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyScript}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Tersalin!' : 'Salin Script'}</span>
                  </button>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Buka Google Sheet &gt; <strong>Extensions &gt; Apps Script</strong>, ganti kodenya dengan script di atas, simpan, lalu klik <strong>Deploy &gt; Manage deployments &gt; Edit &gt; New version &gt; Deploy</strong>.
                </p>
              </div>

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
                  className="px-4 py-2 font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition cursor-pointer"
                >
                  Simpan Pengaturan Sheet
                </button>
              </div>
            </form>
          ) : (
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
