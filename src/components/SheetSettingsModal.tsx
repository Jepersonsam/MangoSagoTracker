import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Info,
  Link2,
  Settings,
  ShieldAlert,
  Wifi,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
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

  // Connection testing state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Sync sheetIdInput when spreadsheetId changes
  React.useEffect(() => {
    setSheetIdInput(spreadsheetId);
  }, [spreadsheetId]);

  // Sync initialTab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setTestStatus('idle');
      setTestMessage('');
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

  const handleTestConnection = async () => {
    const trimmed = webAppUrl.trim();
    if (!trimmed) {
      setTestStatus('error');
      setTestMessage('Masukkan Web App URL terlebih dahulu.');
      return;
    }

    if (!trimmed.endsWith('/exec')) {
      setTestStatus('error');
      setTestMessage('URL tidak valid. Web App URL harus berakhiran "/exec", bukan "/edit".');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Menguji koneksi ke Google Apps Script...');

    try {
      const response = await fetch(`${trimmed}?test=1`, {
        method: 'GET',
        mode: 'cors',
      });

      if (response.ok) {
        const json = await response.json().catch(() => null);
        if (json && json.status === 'online') {
          setTestStatus('success');
          setTestMessage('✅ Berhasil Terhubung! Google Apps Script online & siap sinkronisasi.');
        } else {
          setTestStatus('success');
          setTestMessage('✅ Terhubung! Web App merespons dengan status 200 OK.');
        }
      } else {
        setTestStatus('error');
        setTestMessage(`Koneksi ditolak (Status ${response.status}). Pastikan hak akses diset "Anyone".`);
      }
    } catch (err: any) {
      // Sometimes cors blocks read of doGet on redirect, but let's test if endpoint is reachable
      setTestStatus('error');
      setTestMessage('Koneksi gagal atau diblokir CORS. Pastikan "Who has access" diset ke "Anyone" saat Deploy.');
    }
  };

  const appsScriptCode = `// ========================================================
// GOOGLE APPS SCRIPT - MANGO SAGO TRACKER (2-WAY SYNC)
// ========================================================

// Helper untuk menemukan sheet berdasarkan ID unik (GID)
function getSheetByGid(ss, gid) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) {
      return sheets[i];
    }
  }
  return null;
}

// 1. Menangani tes koneksi (GET) saat URL dibuka di browser
function doGet(e) {
  if (e && e.parameter && e.parameter.type) {
    return handleRequest(e.parameter);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    message: 'Google Apps Script Mango Tracker aktif dan siap menerima data!'
  })).setMimeType(ContentService.MimeType.JSON);
}

// 2. Menangani POST request dari website
function doPost(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter || {};
    }
  } else if (e && e.parameter) {
    data = e.parameter;
  }
  return handleRequest(data);
}

// 3. Logika utama pemrosesan data ke Spreadsheet
function handleRequest(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // A. TAMBAH PESANAN BARU (GID: 351713628 / List Pemesan)
    if (data.type === 'order') {
      var sheet = getSheetByGid(ss, '351713628') || 
                  ss.getSheetByName('List Pemesan 26 Oct 26') || 
                  ss.getSheetByName('Pesanan') || 
                  ss.getSheets()[2];
                  
      sheet.appendRow([
        data.tanggal || '',
        data.namaPemesan || '',
        data.qty || 1,
        data.amount || 0,
        data.status || 'Not Paid',
        data.note || '',
        data.pembayaran || '-',
        data.batch || ''
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'order_created' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // B. UBAH STATUS PESANAN (Paid / Not Paid)
    if (data.type === 'update_status') {
      var sheet = getSheetByGid(ss, '351713628') || 
                  ss.getSheetByName('List Pemesan 26 Oct 26') || 
                  ss.getSheetByName('Pesanan') || 
                  ss.getSheets()[2];
                  
      var values = sheet.getDataRange().getValues();
      var targetNama = String(data.namaPemesan || '').trim().toLowerCase();
      var targetTgl = String(data.tanggal || '').trim().toLowerCase();
      var updated = false;

      // Cari baris pemesan (mulai dari baris 2 untuk lewati header)
      for (var r = 1; r < values.length; r++) {
        var rowTgl = String(values[r][0] || '').trim().toLowerCase();
        var rowNama = String(values[r][1] || '').trim().toLowerCase();

        if (rowNama === targetNama) {
          if (!targetTgl || rowTgl === targetTgl || rowTgl.indexOf(targetTgl) !== -1 || targetTgl.indexOf(rowTgl) !== -1) {
            // Kolom E (index 5) = Paid/Not Paid
            sheet.getRange(r + 1, 5).setValue(data.status);
            // Kolom G (index 7) = Pembayaran
            if (data.pembayaran) {
              sheet.getRange(r + 1, 7).setValue(data.pembayaran);
            }
            updated = true;
            break;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'status_updated', updated: updated }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // C. TAMBAH PENGELUARAN / BELANJA (GID: 784188198 / Pembelian Bahan)
    if (data.type === 'expense') {
      var sheet = getSheetByGid(ss, '784188198') || 
                  ss.getSheetByName('Pembelian Bahan ') || 
                  ss.getSheetByName('Pembelian Bahan') || 
                  ss.getSheetByName('Pembelian') || 
                  ss.getSheets()[1];
                  
      sheet.appendRow([
        data.tanggal || '',
        data.item || '',
        data.unitPrice || 0,
        data.qty || 1,
        data.totalAmount || 0,
        '',
        data.sisaQty || ''
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'expense_created' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_type', data: data }))
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
                Pengaturan Sistem & Integrasi Google Sheet
              </h3>
              <p className="text-[11px] text-slate-500">
                Kelola sinkronisasi Google Sheet dan pantau audit log
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
                  Akses share spreadsheet diset: <strong>"Anyone with the link can view"</strong>.
                </p>
              </div>

              {/* Web App URL for 2-Way Sync */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Google Apps Script Web App URL (Wajib untuk Tulis Otomatis)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => {
                      setWebAppUrl(e.target.value);
                      setTestStatus('idle');
                    }}
                    placeholder="https://script.google.com/macros/s/AKfyc.../exec"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-mono text-[11px] bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing' || !webAppUrl.trim()}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Tes Koneksi</span>
                  </button>
                </div>

                {/* Test Feedback banner */}
                {testStatus !== 'idle' && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      testStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : testStatus === 'testing'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {testStatus === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : testStatus === 'testing' ? (
                      <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 animate-spin mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium leading-relaxed">{testMessage}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  Tempelkan Web App URL yang berakhiran <strong>/exec</strong>. Jika kosong, perubahan hanya tersimpan di browser.
                </p>
              </div>

              {/* Apps Script Code snippet */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Script Google Apps Script Terbaru (Otomatis Deteksi Sheet & GID)</span>
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

                <div className="text-slate-600 leading-relaxed text-[11px] space-y-1">
                  <p>
                    <strong>Cara Pasang / Update Script:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Buka Spreadsheet &gt; <strong>Extensions &gt; Apps Script</strong>.</li>
                    <li>Hapus semua kode lama, lalu tempel (*paste*) kode yang baru disalin.</li>
                    <li>Simpan (<strong>Ctrl + S</strong>).</li>
                    <li>Klik <strong>Deploy &gt; Manage deployments</strong> &gt; klik ikon <strong>Pensil (Edit)</strong>.</li>
                    <li>Pada pilihan <strong>Version</strong>, pilih <strong>New version</strong>.</li>
                    <li>Pastikan <strong>Who has access</strong> diset ke <strong>Anyone</strong>, lalu klik <strong>Deploy</strong>.</li>
                    <li>Salin Web App URL yang dihasilkan, lalu tempel di kolom atas dan klik <strong>Simpan Pengaturan Sheet</strong>.</li>
                  </ol>
                </div>
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
