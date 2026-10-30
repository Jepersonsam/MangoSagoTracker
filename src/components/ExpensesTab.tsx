import React, { useState } from 'react';
import { Search, Download, Plus, AlertCircle, Package } from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface ExpensesTabProps {
  expenses: ExpenseItem[];
  onOpenNewExpense: () => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses,
  onOpenNewExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Bahan Baku' | 'Kemasan' | 'Operasional'>('All');

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.tanggal.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = categoryFilter === 'All' || exp.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

  const handleExportCsv = () => {
    const header = ['Tanggal', 'Item', 'Kategori', 'Unit Price', 'Qty', 'Total Amount', 'Sisa Qty'];
    const rows = filteredExpenses.map((e) => [
      e.tanggal,
      `"${e.item}"`,
      e.category,
      e.unitPrice,
      e.qty,
      e.totalAmount,
      e.sisaQty || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pengeluaran_belanja_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Kemasan':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Operasional':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Daftar Belanja & Pengeluaran Bahan
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredExpenses.length} Item
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tercatat dari sheet Pembelian Bahan, Kemasan, dan Operasional
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

            <button
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Belanja Baru</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari item belanja (cth: Mangga, Cup, Susu)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 shrink-0">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden cursor-pointer"
            >
              <option value="All">Semua Kategori</option>
              <option value="Bahan Baku">Bahan Baku (Mangga, Susu, Sagu)</option>
              <option value="Kemasan">Kemasan (Cup, Thinwall, Stiker)</option>
              <option value="Operasional">Operasional (Gas, Air, dll.)</option>
            </select>
          </div>
        </div>

        {/* Total Summary */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded-md font-medium border border-rose-200/60">
            Total Pengeluaran: <span className="font-bold">{formatRupiah(totalFilteredAmount)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Nama Item / Bahan</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4 text-right">Harga Satuan</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4 text-right">Total Biaya</th>
              <th className="py-3 px-4 text-center">Sisa Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tidak ada data belanja yang sesuai filter.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                    {exp.tanggal}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {exp.item}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(exp.category)}`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                    {formatRupiah(exp.unitPrice)}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-700">
                    {exp.qty}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                    {formatRupiah(exp.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {exp.sisaQty === '0' || exp.sisaQty === 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                        Habis (0)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Sisa: {exp.sisaQty}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

