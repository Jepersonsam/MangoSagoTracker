import { AuditLog } from '../types';

const AUDIT_STORAGE_KEY = 'mango_audit_logs_records';

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-seed-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(Date.now() - 3600000 * 2)),
    userName: 'Ebi',
    userRole: 'Admin',
    action: 'LOGIN',
    category: 'Autentikasi',
    description: 'Admin Ebi berhasil masuk ke sistem',
    details: 'Login melalui sesi terenkripsi perangkat',
  },
  {
    id: 'log-seed-2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(Date.now() - 3600000)),
    userName: 'Tia',
    userRole: 'Admin',
    action: 'SYNC_SHEETS',
    category: 'Sistem',
    description: 'Sinkronisasi database dengan Google Sheets Live',
    details: 'Sheet ID: 1CyxgDHZAuE5iH5jB7YbHCEuJ9awKmNhJ0-IzV4BGvY4',
  },
  {
    id: 'log-seed-3',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(Date.now() - 1800000)),
    userName: 'Sam',
    userRole: 'Admin',
    action: 'LOGIN',
    category: 'Autentikasi',
    description: 'Admin Sam berhasil masuk ke sistem',
    details: 'Pemeriksaan status kas & omset harian',
  },
];

export function getAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_AUDIT_LOGS;
    return parsed;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function recordAuditLog(
  input: Omit<AuditLog, 'id' | 'timestamp' | 'formattedDate'>
): AuditLog {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);

  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    formattedDate,
    ...input,
  };

  const logs = getAuditLogs();
  // Keep the latest 500 logs to prevent unbounded storage
  const updated = [newLog, ...logs].slice(0, 500);

  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to store audit log:', err);
  }

  return newLog;
}

export function clearAuditLogs(adminName: string): void {
  const clearedLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
    userName: adminName,
    userRole: 'Admin',
    action: 'CLEAR_LOGS',
    category: 'Sistem',
    description: `Riwayat audit log direset oleh ${adminName}`,
    details: 'Semua log aktivitas sebelumnya dibersihkan',
  };

  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([clearedLog]));
}

