import React, { useState } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatRupiah, determineCategory } from '../services/sheetsService';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: ExpenseItem) => void;
}

function formatDateForSheet(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-').map(Number);
  if (parts.length !== 3) return isoDateStr;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  const dayNum = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[d.getMonth()] || 'Oct';
  const yearShort = String(year).slice(-2);
  return `${dayNum} ${monthName} ${yearShort}`;
}

function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
}) => {
  const [dateIso, setDateIso] = useState<string>(getTodayIso());
  const [item, setItem] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [sisaQty, setSisaQty] = useState('0');
  const [category, setCategory] = useState<'Bahan Baku' | 'Kemasan' | 'Operasional'>('Bahan Baku');

  if (!isOpen) return null;

  const numQty = qty === '' ? 0 : Number(qty);
  const numPrice = unitPrice === '' ? 0 : Number(unitPrice);
  const totalAmount = numQty * numPrice;
  const formattedSheetDate = formatDateForSheet(dateIso);

  const handleItemChange = (val: string) => {
    setItem(val);
    setCategory(determineCategory(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalQty = Math.max(1, numQty || 1);
    const finalPrice = Math.max(0, numPrice || 0);
    const finalTotal = finalQty * finalPrice;
    if (!item.trim() || finalTotal <= 0) return;

    const newExpense: ExpenseItem = {
      id: `exp-local-${Date.now()}`,
      tanggal: formattedSheetDate,
      item: item.trim(),
      unitPrice: finalPrice,
      qty: finalQty,
      totalAmount: finalTotal,
      sisaQty,
      category,
    };

    onAddExpense(newExpense);
    onClose();
  };

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateIso(`${year}-${month}-${day}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <h3 className="font-bold text-slate-900 text-sm">Catat Belanja / Pengeluaran</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Kolom Tanggal Kalender */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>Tanggal Pembelian (Kalender)</span>
              </label>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {formattedSheetDate}
              </span>
            </div>

            <div className="relative">
              <input
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden bg-slate-50 hover:bg-white text-slate-800 font-semibold cursor-pointer transition"
                required
              />
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-slate-400">Pilih cepat:</span>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-800 text-[10px] font-medium text-slate-600 transition cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(-1)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-800 text-[10px] font-medium text-slate-600 transition cursor-pointer"
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-800 text-[10px] font-medium text-slate-600 transition cursor-pointer"
              >
                Besok
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Item / Bahan</label>
            <input
              type="text"
              value={item}
              onChange={(e) => handleItemChange(e.target.value)}
              placeholder="Contoh: Susu Evaporasi, Cup 25pcs, Mangga Harum Manis"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden bg-white"
              >
                <option value="Bahan Baku">Bahan Baku (Mangga, Susu, Gula)</option>
                <option value="Kemasan">Kemasan (Cup, Sendok, Thinwall)</option>
                <option value="Operasional">Operasional (Gas, Air, Listrik)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sisa Stok / Qty</label>
              <input
                type="text"
                value={sisaQty}
                onChange={(e) => setSisaQty(e.target.value)}
                placeholder="misal: 10 atau 0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jumlah (Qty Beli)</label>
              <input
                type="number"
                min="1"
                step="any"
                value={qty}
                onChange={(e) => {
                  const val = e.target.value;
                  setQty(val === '' ? '' : Math.max(1, parseFloat(val) || 1));
                }}
                placeholder="1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                step="any"
                value={unitPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setUnitPrice(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                }}
                placeholder="misal: 18000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                required
              />
            </div>
          </div>

          {/* Total Preview */}
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg flex items-center justify-between">
            <span className="font-semibold text-slate-600">Total Biaya Belanja:</span>
            <span className="text-sm font-bold text-rose-700">{formatRupiah(totalAmount)}</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs shadow-rose-600/20 transition cursor-pointer"
            >
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
