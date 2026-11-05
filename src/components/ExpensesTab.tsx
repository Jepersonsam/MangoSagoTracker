import React, { useState } from 'react';
import { Search, Download, Plus, ShoppingBag, Pencil, Check, X, Receipt, Trash2 } from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface ExpensesTabProps {
  expenses: ExpenseItem[];
  onOpenNewExpense: (mode?: 'single' | 'batch') => void;
  onUpdateSisaQty?: (expenseId: string, newSisaQty: string | number) => void;
  onEditExpense?: (expense: ExpenseItem) => void;
  onDeleteExpense?: (expenseId: string) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses,
  onOpenNewExpense,
  onUpdateSisaQty,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Bahan Baku' | 'Kemasan' | 'Operasional'>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleStartEdit = (exp: ExpenseItem) => {
    setEditingId(exp.id);
    setEditValue(exp.sisaQty !== undefined && exp.sisaQty !== null && exp.sisaQty !== '-' ? String(exp.sisaQty) : '0');
  };

  const handleSaveEdit = (expenseId: string) => {
    if (onUpdateSisaQty) {
      onUpdateSisaQty(expenseId, editValue.trim() || '0');
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const renderSisaQtyBadge = (exp: ExpenseItem) => {
    const isEditing = editingId === exp.id;

    if (isEditing) {
      return (
        <div
          className="inline-flex items-center gap-1 p-1 bg-white border border-amber-400 rounded-lg shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(exp.id);
              if (e.key === 'Escape') handleCancelEdit();
            }}
            placeholder="0"
            className="w-14 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 bg-amber-50/40"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setEditValue('0')}
            title="Set Habis (0)"
            className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
          >
            Habis (0)
          </button>
          <button
            type="button"
            onClick={() => handleSaveEdit(exp.id)}
            title="Simpan perubahan"
            className="p-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            title="Batal"
            className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleStartEdit(exp)}
        title="Klik untuk ubah sisa stok"
        className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full transition cursor-pointer hover:ring-2 hover:ring-amber-400/70 hover:bg-amber-50/50"
      >
        {exp.sisaQty === '0' || exp.sisaQty === 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium group-hover:bg-amber-100 group-hover:text-amber-800 flex items-center gap-1">
            <span>Habis (0)</span>
            <Pencil className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 text-slate-500 group-hover:text-amber-700" />
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold group-hover:bg-emerald-100 flex items-center gap-1">
            <span>Sisa: {exp.sisaQty}</span>
            <Pencil className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 text-emerald-600" />
          </span>
        )}
      </button>
    );
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.tanggal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

  const handleExportCsv = () => {
    const header = ['Tanggal', 'Item', 'Harga Satuan', 'Qty', 'Total Biaya', 'Kategori', 'Sisa Qty'];
    const rows = filteredExpenses.map((e) => [
      e.tanggal,
      `"${e.item}"`,
      e.unitPrice,
      e.qty,
      e.totalAmount,
      `"${e.category}"`,
      `"${e.sisaQty}"`,
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
      case 'Bahan Baku':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Kemasan':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Operasional':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 sm:p-5 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              Pembelian Bahan & Pengeluaran
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredExpenses.length} Item
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Data belanja bahan baku, kemasan cup/stiker, dan operasional harian
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => onOpenNewExpense('single')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer shadow-2xs"
              title="Input 1 item belanja saja"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>+1 Item</span>
            </button>

            <button
              onClick={() => onOpenNewExpense('batch')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-linear-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 rounded-lg shadow-xs hover:shadow transition cursor-pointer"
              title="Input banyak belanja sekaligus (Nota Belanja)"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Belanja Sekaligus (Multi)</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari item (cth: Mangga, Cup, Susu)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 shrink-0">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden cursor-pointer text-slate-800 font-medium"
            >
              <option value="All">Semua Kategori</option>
              <option value="Bahan Baku">Bahan Baku (Mangga, Susu, Sagu)</option>
              <option value="Kemasan">Kemasan (Cup, Thinwall, Stiker)</option>
              <option value="Operasional">Operasional (Gas, Air, dll.)</option>
            </select>
          </div>
        </div>

        {/* Total Summary */}
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded-md font-medium border border-rose-200/60 text-[11px] sm:text-xs">
            Total Pengeluaran: <span className="font-bold">{formatRupiah(totalFilteredAmount)}</span>
          </div>
        </div>
      </div>

      {/* --- A. TAMPILAN MOBILE CARD LIST (HP) --- */}
      <div className="sm:hidden p-3.5 space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Tidak ada data belanja yang sesuai filter.
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 hover:border-rose-300 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    {exp.item}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {exp.tanggal} • {exp.qty} pcs @ {formatRupiah(exp.unitPrice)}
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${getCategoryBadge(exp.category)}`}>
                  {exp.category}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="font-black text-rose-600">
                  {formatRupiah(exp.totalAmount)}
                </span>
                <div className="flex items-center gap-1">
                  {renderSisaQtyBadge(exp)}
                  {onEditExpense && (
                    <button
                      onClick={() => onEditExpense(exp)}
                      className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Edit Pengeluaran"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDeleteExpense && (
                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Hapus Pengeluaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- B. TAMPILAN TABEL UNTUK DESKTOP/TABLET --- */}
      <div className="hidden sm:block overflow-x-auto">
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
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
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
                    {renderSisaQtyBadge(exp)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {onEditExpense && (
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Edit Pengeluaran"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteExpense && (
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Hapus Pengeluaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
