import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, Download, Wallet, Trash2 } from 'lucide-react';
import { CashflowItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface CashflowTabProps {
  cashflows: CashflowItem[];
  onDeleteCashflow?: (id: string) => void;
}

export const CashflowTab: React.FC<CashflowTabProps> = ({ cashflows, onDeleteCashflow }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = cashflows.filter((cf) =>
    cf.transaksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cf.tanggal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebit = filtered.reduce((sum, cf) => sum + cf.debit, 0);
  const totalKredit = filtered.reduce((sum, cf) => sum + cf.kredit, 0);
  const latestBalance = cashflows.length > 0 ? cashflows[cashflows.length - 1].balance : 0;

  const handleExportCsv = () => {
    const header = ['Tanggal', 'Transaksi', 'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo (Balance)'];
    const rows = filtered.map((cf) => [
      cf.tanggal,
      `"${cf.transaksi}"`,
      cf.debit,
      cf.kredit,
      cf.balance,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `buku_kas_cashflow_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Buku Kas & Arus Kas (Cash Flow)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filtered.length} Transaksi
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mutasi uang masuk (Debit), uang keluar (Kredit), dan saldo kas berjalan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari transaksi kas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md font-medium border border-emerald-200/60 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Total Masuk: <strong>{formatRupiah(totalDebit)}</strong></span>
            </div>
            <div className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded-md font-medium border border-rose-200/60 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Total Keluar: <strong>{formatRupiah(totalKredit)}</strong></span>
            </div>
            <div className="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-md font-medium border border-indigo-200/60 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Saldo Akhir: <strong>{formatRupiah(latestBalance)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card List View (Phones) */}
      <div className="sm:hidden divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-indigo-200 shadow-2xs space-y-2 m-3">
            <span className="text-3xl block">📖</span>
            <p className="text-xs font-bold text-slate-700">Belum Ada Mutasi Buku Kas</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Mutasi kas masuk (debit) otomatis tercatat saat pesanan lunas, dan uang keluar (kredit) tercatat saat belanja bahan.
            </p>
          </div>
        ) : (
          filtered.map((cf) => {
            const isIncome = cf.tipe === 'Masuk';
            return (
              <div key={cf.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500 text-[11px]">{cf.tanggal}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isIncome
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isIncome ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          <span>Masuk</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          <span>Keluar</span>
                        </>
                      )}
                    </span>
                    {onDeleteCashflow && (
                      <button
                        onClick={() => onDeleteCashflow(cf.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Hapus Catatan Kas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="font-bold text-sm text-slate-900 leading-snug">
                  {cf.transaksi}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div>
                    {isIncome ? (
                      <span className="font-bold text-emerald-600">
                        +{formatRupiah(cf.debit)}
                      </span>
                    ) : (
                      <span className="font-bold text-rose-600">
                        -{formatRupiah(cf.kredit)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Saldo:{' '}
                    <span className={`font-bold ${cf.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                      {formatRupiah(cf.balance)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Table (Tablet & Desktop) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Keterangan Transaksi</th>
              <th className="py-3 px-4 text-center">Tipe</th>
              <th className="py-3 px-4 text-right">Debit (Masuk)</th>
              <th className="py-3 px-4 text-right">Kredit (Keluar)</th>
              <th className="py-3 px-4 text-right">Saldo Berjalan</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="max-w-xs mx-auto space-y-2">
                    <span className="text-3xl block">📖</span>
                    <p className="text-xs font-bold text-slate-700">Belum Ada Mutasi Buku Kas</p>
                    <p className="text-[11px] text-slate-500">
                      Mutasi kas masuk otomatis tercatat saat pesanan lunas, dan kas keluar tercatat saat belanja dicatat.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((cf) => {
                const isIncome = cf.tipe === 'Masuk';
                return (
                  <tr key={cf.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {cf.tanggal}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cf.transaksi}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isIncome ? (
                          <>
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            <span>Masuk</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            <span>Keluar</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {cf.debit > 0 ? formatRupiah(cf.debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-600 whitespace-nowrap">
                      {cf.kredit > 0 ? formatRupiah(cf.kredit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      <span className={cf.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}>
                        {formatRupiah(cf.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {onDeleteCashflow && (
                        <button
                          onClick={() => onDeleteCashflow(cf.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Hapus Catatan Kas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

