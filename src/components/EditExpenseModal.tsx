import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Trash2, AlertTriangle, PackageCheck } from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseItem | null;
  onUpdateExpense: (updatedExpense: ExpenseItem) => void;
  onDeleteExpense?: (expenseId: string) => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  const [tanggal, setTanggal] = useState('');
  const [item, setItem] = useState('');
  const [category, setCategory] = useState<'Bahan Baku' | 'Kemasan' | 'Operasional'>('Bahan Baku');
  const [qty, setQty] = useState<number | ''>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>(0);
  const [totalAmount, setTotalAmount] = useState<number | ''>(0);
  const [sisaQty, setSisaQty] = useState('0');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (expense && isOpen) {
      setTanggal(expense.tanggal || '');
      setItem(expense.item || '');
      setCategory(expense.category || 'Bahan Baku');
      setQty(expense.qty || 1);
      setUnitPrice(expense.unitPrice || 0);
      setTotalAmount(expense.totalAmount || 0);
      setSisaQty(expense.sisaQty !== undefined && expense.sisaQty !== null ? String(expense.sisaQty) : '0');
      setShowDeleteConfirm(false);
    }
  }, [expense, isOpen]);

  if (!isOpen || !expense) return null;

  const numQty = qty === '' ? 0 : Number(qty);
  const numUnitPrice = unitPrice === '' ? 0 : Number(unitPrice);
  const numTotalAmount = totalAmount === '' ? 0 : Number(totalAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim()) return;

    const finalQty = Math.max(1, numQty);
    const finalTotal = numTotalAmount > 0 ? numTotalAmount : finalQty * numUnitPrice;
    const finalUnitPrice = numUnitPrice > 0 ? numUnitPrice : Math.round(finalTotal / finalQty);

    const updatedExpense: ExpenseItem = {
      ...expense,
      tanggal: tanggal.trim() || expense.tanggal,
      item: item.trim(),
      category,
      qty: finalQty,
      unitPrice: finalUnitPrice,
      totalAmount: finalTotal,
      sisaQty: sisaQty.trim() || '0',
    };

    onUpdateExpense(updatedExpense);
    onClose();
  };

  const handleDelete = () => {
    if (onDeleteExpense && expense) {
      onDeleteExpense(expense.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              Edit Pengeluaran / Belanja
            </h2>
            <p className="text-xs text-slate-500">
              Perbarui rincian belanja bahan & operasional
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>Tanggal Pembelian</span>
            </label>
            <input
              type="text"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              placeholder="Contoh: 5 Nov 26"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition text-xs font-medium text-slate-800 outline-hidden"
              required
            />
          </div>

          {/* Nama Item & Kategori */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Barang / Bahan *
              </label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Contoh: Susu Evaporasi"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition text-xs text-slate-800 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition text-xs text-slate-800 outline-hidden"
              >
                <option value="Bahan Baku">Bahan Baku</option>
                <option value="Kemasan">Kemasan</option>
                <option value="Operasional">Operasional</option>
              </select>
            </div>
          </div>

          {/* Qty & Harga Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Beli (Qty) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setQty(val);
                  if (val !== '' && numUnitPrice > 0) {
                    setTotalAmount(Math.round(Number(val) * numUnitPrice));
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition text-xs font-bold text-slate-800 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setUnitPrice(val);
                  if (val !== '' && numQty > 0) {
                    setTotalAmount(Math.round(numQty * Number(val)));
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition text-xs font-bold text-slate-800 outline-hidden"
              />
            </div>
          </div>

          {/* Total Belanja & Sisa Qty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Nominal Belanja (Rp) *
              </label>
              <input
                type="number"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition text-xs font-bold text-rose-700 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sisa Stok (Sisa Qty)</span>
              </label>
              <input
                type="text"
                value={sisaQty}
                onChange={(e) => setSisaQty(e.target.value)}
                placeholder="Contoh: 1, 0.5, atau 10"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition text-xs font-bold text-emerald-700 outline-hidden"
              />
            </div>
          </div>

          {/* Konfirmasi Hapus Expense */}
          {showDeleteConfirm && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Hapus pengeluaran ini secara permanen?</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Data belanja {expense.item} ({formatRupiah(expense.totalAmount)}) akan dihapus dari Supabase.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Ya, Hapus Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            {onDeleteExpense && !showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-sm shadow-rose-600/20 transition cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
