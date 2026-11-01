import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Plus, Trash2, Receipt, Sparkles, PackageCheck } from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatRupiah, determineCategory } from '../services/sheetsService';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: ExpenseItem) => void;
  onAddMultipleExpenses?: (expenses: ExpenseItem[]) => void;
  initialMode?: 'single' | 'batch';
}

interface BatchItemRow {
  id: string;
  item: string;
  category: 'Bahan Baku' | 'Kemasan' | 'Operasional';
  qty: number | '';
  unitPrice: number | '';
  sisaQty: string;
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

const createEmptyRow = (customItem = ''): BatchItemRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  item: customItem,
  category: customItem ? determineCategory(customItem) : 'Bahan Baku',
  qty: 1,
  unitPrice: '',
  sisaQty: '0',
});

// Rekomendasi item bahan baku Mango Sago
const QUICK_ITEMS = [
  'Mangga Harum Manis',
  'Mangga Golek',
  'Susu Evaporasi',
  'Susu Kental Manis',
  'Nutrijell Mangga',
  'Sagu Mutiara',
  'Nata De Coco',
  'Gula Pasir',
  'Cup 25 pcs',
  'Sendok Plastik',
  'Thinwall',
  'Gas',
  'Air Galon',
];

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  onAddMultipleExpenses,
  initialMode = 'batch',
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>(initialMode);
  const [dateIso, setDateIso] = useState<string>(getTodayIso());

  // Single Item State
  const [singleItem, setSingleItem] = useState('');
  const [singleQty, setSingleQty] = useState<number | ''>(1);
  const [singleUnitPrice, setSingleUnitPrice] = useState<number | ''>('');
  const [singleSisaQty, setSingleSisaQty] = useState('0');
  const [singleCategory, setSingleCategory] = useState<'Bahan Baku' | 'Kemasan' | 'Operasional'>('Bahan Baku');

  // Batch (Multi-Item) State
  const [batchRows, setBatchRows] = useState<BatchItemRow[]>([
    createEmptyRow(),
    createEmptyRow(),
  ]);

  // Reset form states to clean empty defaults
  const resetForm = () => {
    setDateIso(getTodayIso());
    setSingleItem('');
    setSingleQty(1);
    setSingleUnitPrice('');
    setSingleSisaQty('0');
    setSingleCategory('Bahan Baku');
    setBatchRows([createEmptyRow(), createEmptyRow()]);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Sync mode and reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetForm();
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const formattedSheetDate = formatDateForSheet(dateIso);

  // Single item calculations
  const numSingleQty = singleQty === '' ? 0 : Number(singleQty);
  const numSinglePrice = singleUnitPrice === '' ? 0 : Number(singleUnitPrice);
  const singleTotal = numSingleQty * numSinglePrice;

  // Batch calculations
  const batchTotal = batchRows.reduce((sum, row) => {
    const q = row.qty === '' ? 0 : Number(row.qty);
    const p = row.unitPrice === '' ? 0 : Number(row.unitPrice);
    return sum + (q * p);
  }, 0);

  const validBatchRowsCount = batchRows.filter((r) => r.item.trim().length > 0).length;

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateIso(`${year}-${month}-${day}`);
  };

  // --- Handlers for Single Mode ---
  const handleSingleItemChange = (val: string) => {
    setSingleItem(val);
    setSingleCategory(determineCategory(val));
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalQty = Math.max(1, numSingleQty || 1);
    const finalPrice = Math.max(0, numSinglePrice || 0);
    const finalTotal = finalQty * finalPrice;
    if (!singleItem.trim() || finalTotal <= 0) return;

    const newExpense: ExpenseItem = {
      id: `exp-local-${Date.now()}`,
      tanggal: formattedSheetDate,
      item: singleItem.trim(),
      unitPrice: finalPrice,
      qty: finalQty,
      totalAmount: finalTotal,
      sisaQty: singleSisaQty || '0',
      category: singleCategory,
    };

    onAddExpense(newExpense);
    resetForm();
    onClose();
  };

  // --- Handlers for Batch Mode ---
  const handleAddBatchRow = (customItem = '') => {
    setBatchRows((prev) => [...prev, createEmptyRow(customItem)]);
  };

  const handleRemoveBatchRow = (id: string) => {
    if (batchRows.length <= 1) return;
    setBatchRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleBatchRowChange = (id: string, field: keyof BatchItemRow, val: any) => {
    setBatchRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        if (field === 'item') {
          updated.category = determineCategory(val);
        }
        return updated;
      })
    );
  };

  // Quick package presets
  const handleAddBahanBakuPreset = () => {
    const presetItems = [
      'Mangga Harum Manis',
      'Susu Evaporasi',
      'Susu Kental Manis',
      'Nutrijell Mangga',
      'Sagu Mutiara',
    ];
    setBatchRows((prev) => {
      // Remove empty rows if any
      const existing = prev.filter((r) => r.item.trim().length > 0);
      const newOnes = presetItems.map((name) => createEmptyRow(name));
      return [...existing, ...newOnes];
    });
  };

  const handleAddKemasanPreset = () => {
    const presetItems = [
      'Cup 25 pcs',
      'Sendok Plastik',
      'Thinwall',
      'Kantong Plastik',
    ];
    setBatchRows((prev) => {
      const existing = prev.filter((r) => r.item.trim().length > 0);
      const newOnes = presetItems.map((name) => createEmptyRow(name));
      return [...existing, ...newOnes];
    });
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter valid rows
    const validRows = batchRows.filter((r) => r.item.trim().length > 0);
    if (validRows.length === 0) return;

    const newExpenses: ExpenseItem[] = validRows.map((r, idx) => {
      const q = Math.max(1, (r.qty === '' ? 1 : Number(r.qty)) || 1);
      const p = Math.max(0, (r.unitPrice === '' ? 0 : Number(r.unitPrice)) || 0);
      return {
        id: `exp-batch-${Date.now()}-${idx}`,
        tanggal: formattedSheetDate,
        item: r.item.trim(),
        unitPrice: p,
        qty: q,
        totalAmount: q * p,
        sisaQty: r.sisaQty || '0',
        category: r.category,
      };
    });

    if (onAddMultipleExpenses) {
      onAddMultipleExpenses(newExpenses);
    } else {
      newExpenses.forEach((exp) => onAddExpense(exp));
    }
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto ${
          mode === 'batch' ? 'max-w-4xl max-h-[92vh] flex flex-col' : 'max-w-md'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Catat Belanja / Pengeluaran</h3>
              <p className="text-[10px] sm:text-xs text-slate-500">
                {mode === 'batch'
                  ? 'Input nota belanja banyak item sekaligus dalam satu tanggal'
                  : 'Input 1 item belanja bahan/operasional'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-white">
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                mode === 'batch'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Banyak Sekaligus (Multi)</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 font-black">
                Baru!
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                mode === 'single'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Satu Item Saja</span>
            </button>
          </div>

          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 shrink-0">
            📅 {formattedSheetDate}
          </span>
        </div>

        {/* ======================================================== */}
        {/* MODE A: BANYAK SEKALIGUS (BATCH EXPENSES / NOTA BELANJA) */}
        {/* ======================================================== */}
        {mode === 'batch' && (
          <form onSubmit={handleBatchSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
            {/* Shared Date Section & Quick Presets */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-rose-500" />
                    <span>Tanggal Nota Belanja:</span>
                  </label>
                  <input
                    type="date"
                    value={dateIso}
                    onChange={(e) => setDateIso(e.target.value)}
                    className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 text-xs cursor-pointer focus:ring-1 focus:ring-rose-500"
                    required
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 hover:text-rose-800 text-[10px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(-1)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 hover:text-rose-800 text-[10px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                    >
                      Kemarin
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">Paket Cepat:</span>
                  <button
                    type="button"
                    onClick={handleAddBahanBakuPreset}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>+ Bahan Baku Pokok</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddKemasanPreset}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition cursor-pointer"
                  >
                    <PackageCheck className="w-3 h-3 text-cyan-600" />
                    <span>+ Kemasan Lengkap</span>
                  </button>
                </div>
              </div>

              {/* Quick suggestion pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
                <span className="text-slate-400 shrink-0">Klik nama untuk tambah:</span>
                {QUICK_ITEMS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAddBatchRow(q)}
                    className="shrink-0 px-2 py-0.5 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-600 rounded-md transition cursor-pointer font-medium"
                  >
                    + {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Rows List (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {/* --- DESKTOP TABLE VIEW --- */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Nama Item / Bahan</th>
                      <th className="py-2.5 px-3 w-32">Kategori</th>
                      <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                      <th className="py-2.5 px-3 w-32 text-right">Harga Satuan (Rp)</th>
                      <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 w-24 text-center">Sisa Stok</th>
                      <th className="py-2.5 px-3 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchRows.map((row, idx) => {
                      const q = row.qty === '' ? 0 : Number(row.qty);
                      const p = row.unitPrice === '' ? 0 : Number(row.unitPrice);
                      const subtotal = q * p;

                      return (
                        <tr key={row.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-2 px-2 text-center text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.item}
                              onChange={(e) => handleBatchRowChange(row.id, 'item', e.target.value)}
                              placeholder="cth: Mangga Harum Manis..."
                              className="w-full px-2 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-rose-500 font-semibold text-slate-800"
                              required={idx === 0}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={row.category}
                              onChange={(e) => handleBatchRowChange(row.id, 'category', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-md bg-white font-medium text-[11px]"
                            >
                              <option value="Bahan Baku">Bahan Baku</option>
                              <option value="Kemasan">Kemasan</option>
                              <option value="Operasional">Operasional</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={row.qty}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleBatchRowChange(row.id, 'qty', val === '' ? '' : parseFloat(val) || 1);
                              }}
                              placeholder="1"
                              className="w-full px-1.5 py-1 text-center border border-slate-200 rounded-md focus:ring-1 focus:ring-rose-500 font-bold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="any"
                              value={row.unitPrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleBatchRowChange(row.id, 'unitPrice', val === '' ? '' : parseFloat(val) || 0);
                              }}
                              placeholder="18000"
                              className="w-full px-2 py-1 text-right border border-slate-200 rounded-md focus:ring-1 focus:ring-rose-500 font-bold"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-black text-rose-600 whitespace-nowrap">
                            {formatRupiah(subtotal)}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.sisaQty}
                              onChange={(e) => handleBatchRowChange(row.id, 'sisaQty', e.target.value)}
                              placeholder="0"
                              className="w-full px-1.5 py-1 text-center border border-slate-200 rounded-md font-medium text-[11px]"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBatchRow(row.id)}
                              disabled={batchRows.length <= 1}
                              title="Hapus baris ini"
                              className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer disabled:opacity-20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* --- MOBILE CARD VIEW (HP) --- */}
              <div className="sm:hidden space-y-3">
                {batchRows.map((row, idx) => {
                  const q = row.qty === '' ? 0 : Number(row.qty);
                  const p = row.unitPrice === '' ? 0 : Number(row.unitPrice);
                  const subtotal = q * p;

                  return (
                    <div
                      key={row.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 text-xs">
                          Item #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchRow(row.id)}
                          disabled={batchRows.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 transition disabled:opacity-20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => handleBatchRowChange(row.id, 'item', e.target.value)}
                        placeholder="Nama Item (cth: Susu Evaporasi)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={row.qty}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleBatchRowChange(row.id, 'qty', val === '' ? '' : parseFloat(val) || 1);
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Harga Satuan (Rp)</label>
                          <input
                            type="number"
                            step="any"
                            value={row.unitPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleBatchRowChange(row.id, 'unitPrice', val === '' ? '' : parseFloat(val) || 0);
                            }}
                            placeholder="cth: 18000"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-right"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 items-center">
                        <div>
                          <select
                            value={row.category}
                            onChange={(e) => handleBatchRowChange(row.id, 'category', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
                          >
                            <option value="Bahan Baku">Bahan Baku</option>
                            <option value="Kemasan">Kemasan</option>
                            <option value="Operasional">Operasional</option>
                          </select>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Subtotal:</span>
                          <span className="font-black text-rose-600 text-xs">{formatRupiah(subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Row Button */}
              <button
                type="button"
                onClick={() => handleAddBatchRow('')}
                className="w-full py-2.5 border-2 border-dashed border-rose-300 hover:border-rose-500 hover:bg-rose-50 text-rose-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Baris Item Belanja</span>
              </button>
            </div>

            {/* Bottom Total Summary & Action Bar */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-linear-to-r from-rose-50 via-white to-amber-50/40 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">Ringkasan Nota:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                    {validBatchRowsCount} Item Valid
                  </span>
                  <span className="text-base sm:text-lg font-black text-rose-600">
                    {formatRupiah(batchTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={validBatchRowsCount === 0 || batchTotal <= 0}
                  className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm hover:shadow transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Simpan Semua ({validBatchRowsCount} Item)</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* MODE B: SATU ITEM SAJA (SINGLE ITEM EXPENSE)             */}
        {/* ======================================================== */}
        {mode === 'single' && (
          <form onSubmit={handleSingleSubmit} className="p-5 space-y-4 text-xs">
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
                value={singleItem}
                onChange={(e) => handleSingleItemChange(e.target.value)}
                placeholder="Contoh: Susu Evaporasi, Cup 25pcs, Mangga Harum Manis"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={singleCategory}
                  onChange={(e) => setSingleCategory(e.target.value as any)}
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
                  value={singleSisaQty}
                  onChange={(e) => setSingleSisaQty(e.target.value)}
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
                  value={singleQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSingleQty(val === '' ? '' : Math.max(1, parseFloat(val) || 1));
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
                  value={singleUnitPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSingleUnitPrice(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
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
              <span className="text-sm font-bold text-rose-700">{formatRupiah(singleTotal)}</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
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
        )}
      </div>
    </div>
  );
};
