import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Info,
  Link2,
  Settings,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Database,
  Key,
  Layers,
} from 'lucide-react';
import { AuditLogTab } from './AuditLogTab';
import { AuditLog, User } from '../types';
import { getSupabaseConfig, setSupabaseConfig, testSupabaseConnection } from '../services/supabaseClient';
import { SUPABASE_SCHEMA_SQL } from '../services/supabaseSchemaSql';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  onSaveSheetId: (id: string) => void;
  logs?: AuditLog[];
  onClearLogs?: () => void;
  currentUser?: User | null;
  initialTab?: 'supabase' | 'sheet' | 'audit';
  onDatabaseConfigured?: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  spreadsheetId,
  onSaveSheetId,
  logs = [],
  onClearLogs = () => {},
  currentUser,
  initialTab = 'supabase',
  onDatabaseConfigured,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'sheet' | 'audit'>(initialTab);
  const [sheetIdInput, setSheetIdInput] = useState(spreadsheetId);
  const [webAppUrl, setWebAppUrl] = useState(() => {
    return localStorage.getItem('mango_apps_script_url') || '';
  });
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseConfig().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSupabaseConfig().anonKey);
  const [sbTestStatus, setSbTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [sbTestMessage, setSbTestMessage] = useState('');

  // Google Sheet Connection testing state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setSupabaseUrl(config.url);
      setSupabaseAnonKey(config.anonKey);
      setSheetIdInput(spreadsheetId);
      setActiveTab(initialTab);
      setSbTestStatus('idle');
      setSbTestMessage('');
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen, spreadsheetId, initialTab]);

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

  // Save Google Sheet Settings
  const handleSaveSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (sheetIdInput.trim()) {
      onSaveSheetId(sheetIdInput.trim());
    }
    localStorage.setItem('mango_apps_script_url', webAppUrl.trim());
    onClose();
  };

  // Test Google Sheets Apps Script Connection
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
      await fetch(`${trimmed}?test=1`, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
      });

      setTestStatus('success');
      setTestMessage('✅ Berhasil Terhubung! Google Apps Script aktif dan siap sinkronisasi dua arah.');
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage('Gagal menghubungi Web App. Pastikan link URL berakhiran /exec.');
    }
  };

  const appsScriptCode = `// ========================================================
// GOOGLE APPS SCRIPT - MANGO SAGO TRACKER (2-WAY SYNC)
// ========================================================

var SPREADSHEET_ID = '${spreadsheetId}';

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetByGid(ss, gid) {
  if (!ss) return null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) {
      return sheets[i];
    }
  }
  return null;
}

function doGet(e) {
  if (e && e.parameter && e.parameter.type) {
    return handleRequest(e.parameter);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    message: 'Google Apps Script Mango Tracker aktif!'
  })).setMimeType(ContentService.MimeType.JSON);
}

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

function handleRequest(data) {
  try {
    var ss = getSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Spreadsheet tidak ditemukan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.type === 'order') {
      var sheet = getSheetByGid(ss, '351713628') || ss.getSheetByName('List Pemesan 26 Oct 26') || ss.getSheets()[2];
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
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.type === 'update_status') {
      var sheet = getSheetByGid(ss, '351713628') || ss.getSheetByName('List Pemesan 26 Oct 26') || ss.getSheets()[2];
      var displayValues = sheet.getDataRange().getDisplayValues();
      var targetNama = String(data.namaPemesan || '').trim().toLowerCase();
      var targetTgl = String(data.tanggal || '').trim().toLowerCase();
      for (var r = displayValues.length - 1; r >= 1; r--) {
        var rowTgl = String(displayValues[r][0] || '').trim().toLowerCase();
        var rowNama = String(displayValues[r][1] || '').trim().toLowerCase();
        if (rowNama === targetNama) {
          var tglMatches = !targetTgl || rowTgl === targetTgl || rowTgl.indexOf(targetTgl) !== -1 || targetTgl.indexOf(rowTgl) !== -1;
          if (tglMatches) {
            sheet.getRange(r + 1, 5).setValue(data.status);
            var targetNote = data.note || (data.status === 'Paid' ? 'Sudah diterima' : 'Belum diterima');
            sheet.getRange(r + 1, 6).setValue(targetNote);
            if (data.pembayaran) {
              sheet.getRange(r + 1, 7).setValue(data.pembayaran);
            }
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.type === 'expense') {
      var sheet = getSheetByGid(ss, '784188198') || ss.getSheetByName('Pembelian Bahan ') || ss.getSheets()[1];
      sheet.appendRow([
        data.tanggal || '',
        data.item || '',
        data.unitPrice || 0,
        data.qty || 1,
        data.totalAmount || 0,
        '',
        data.sisaQty || ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.type === 'expenses_batch') {
      var sheet = getSheetByGid(ss, '784188198') || ss.getSheetByName('Pembelian Bahan ') || ss.getSheets()[1];
      var items = data.items || [];
      for (var b = 0; b < items.length; b++) {
        var exp = items[b];
        sheet.appendRow([
          exp.tanggal || '',
          exp.item || '',
          exp.unitPrice || 0,
          exp.qty || 1,
          exp.totalAmount || 0,
          '',
          exp.sisaQty || ''
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.type === 'update_expense_sisa') {
      var sheet = getSheetByGid(ss, '784188198') || ss.getSheetByName('Pembelian Bahan ') || ss.getSheets()[1];
      var sisaVal = String(data.sisaQty !== undefined ? data.sisaQty : '');
      var updated = false;

      if (data.rowIndex && !isNaN(Number(data.rowIndex))) {
        var targetRow = Number(data.rowIndex);
        if (targetRow >= 2 && targetRow <= sheet.getLastRow()) {
          sheet.getRange(targetRow, 7).setValue(sisaVal);
          updated = true;
        }
      }

      if (!updated) {
        var displayValues = sheet.getDataRange().getDisplayValues();
        var targetItem = String(data.item || '').trim().toLowerCase();
        var targetTgl = String(data.tanggal || '').trim().toLowerCase();

        for (var r = displayValues.length - 1; r >= 1; r--) {
          var rowTgl = String(displayValues[r][0] || '').trim().toLowerCase();
          var rowItem = String(displayValues[r][1] || '').trim().toLowerCase();

          if (rowItem === targetItem) {
            var tglMatches = !targetTgl || rowTgl === targetTgl || rowTgl.indexOf(targetTgl) !== -1 || targetTgl.indexOf(rowTgl) !== -1;
            if (tglMatches) {
              sheet.getRange(r + 1, 7).setValue(sisaVal);
              updated = true;
              break;
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', updated: updated })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const isSupabaseConfigured = getSupabaseConfig().isConfigured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Pengaturan Database & Integrasi
              </h2>
              <p className="text-xs text-slate-500">
                Kelola penyimpanan database Supabase, Google Sheets, dan Audit Log
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
                Rekomendasi
              </span>
            )}
          </button>

          {/* Tab 2: Google Sheet */}
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'sheet'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Google Spreadsheet</span>
          </button>

          {/* Tab 3: Audit Log */}
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
            <span>Audit Log</span>
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
                    Supabase PostgreSQL Database (Cepat, Real-Time & Andal)
                  </h4>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                    Dengan database Supabase, data pesanan dan belanja tersimpan seketika di cloud SQL dengan sinkronisasi real-time tanpa delay polling.
                  </p>
                </div>
              </div>

              {/* Supabase URL */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Project URL</span>
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
                  Didapat dari: Dashboard Supabase &gt; <strong>Project Settings &gt; API &gt; Project URL</strong>.
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
                  Didapat dari: Dashboard Supabase &gt; <strong>Project Settings &gt; API &gt; Project API keys (anon)</strong>.
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

              {/* SQL Setup Instruction Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Inisialisasi Tabel & Data Awal (SQL Editor)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'SQL Tersalin!' : 'Salin SQL Schema & Data'}</span>
                  </button>
                </div>

                <div className="text-slate-600 leading-relaxed text-[11px] space-y-1.5">
                  <p>
                    <strong>Langkah 1x Setup Supabase:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-semibold">Supabase Dashboard</a> dan buat Project baru (gratis).</li>
                    <li>Buka menu <strong>SQL Editor</strong> di bilah navigasi kiri.</li>
                    <li>Klik tombol <strong>"Salin SQL Schema & Data"</strong> di atas, lalu tempel (Paste) di SQL Editor.</li>
                    <li>Klik tombol <strong>Run</strong> untuk otomatis membuat tabel (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">orders</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">expenses</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">cashflows</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">audit_logs</code>) beserta seluruh data awal Anda!</li>
                    <li>Buka menu <strong>Project Settings &gt; API</strong>, salin <strong>URL</strong> & <strong>anon key</strong>, lalu tempel pada form di atas.</li>
                  </ol>
                </div>
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
                  Simpan Pengaturan Supabase
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: GOOGLE SHEET INTEGRATION */}
          {activeTab === 'sheet' && (
            <form onSubmit={handleSaveSheet} className="space-y-4 text-xs max-w-2xl mx-auto bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
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
                  <span>Google Apps Script Web App URL (Fallback Tulis Spreadsheet)</span>
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
                  Tempelkan Web App URL yang berakhiran <strong>/exec</strong>.
                </p>
              </div>

              {/* Apps Script Code snippet */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Script Google Apps Script (Opsional jika ingin tetap sinkron ke Sheets)</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyScript}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? 'Tersalin!' : 'Salin Script'}</span>
                  </button>
                </div>

                <div className="text-slate-600 leading-relaxed text-[11px] space-y-1">
                  <p>
                    <strong>Cara Pasang / Update Script di Google Sheets:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Buka Spreadsheet &gt; <strong>Extensions &gt; Apps Script</strong>.</li>
                    <li>Hapus semua kode lama, lalu tempel kode yang disalin.</li>
                    <li>Simpan (<strong>Ctrl + S</strong>).</li>
                    <li>Klik <strong>Deploy &gt; Manage deployments</strong> &gt; klik <strong>Edit</strong>.</li>
                    <li>Pilih <strong>New version</strong> &gt; set <strong>Who has access: Anyone</strong> &gt; Deploy.</li>
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
          )}

          {/* TAB 3: AUDIT LOG */}
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
