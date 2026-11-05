import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Check, Minus, Plus, CreditCard, Clock, Sun, Moon } from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (order: OrderItem) => void;
}

// Format date "YYYY-MM-DD" into readable format "D MMM YY" (e.g. "30 Oct 26", "3 Nov 26")
function formatDateDisplay(isoDateStr: string): string {
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

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onAddOrder,
}) => {
  const [dateIso, setDateIso] = useState<string>(getTodayIso());
  const [namaPemesan, setNamaPemesan] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(21000);
  const [status, setStatus] = useState<'Paid' | 'Not Paid'>('Not Paid');
  const [pembayaran, setPembayaran] = useState('BCA');
  const [note, setNote] = useState('Belum diterima');
  const [isCustomNote, setIsCustomNote] = useState(false);
  const [customNoteText, setCustomNoteText] = useState('');
  const [batch, setBatch] = useState('Pagi');

  const resetForm = () => {
    setDateIso(getTodayIso());
    setNamaPemesan('');
    setQty(1);
    setUnitPrice(21000);
    setStatus('Not Paid');
    setPembayaran('BCA');
    setNote('Belum diterima');
    setIsCustomNote(false);
    setCustomNoteText('');
    setBatch('Pagi');
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAmount = qty * unitPrice;
  const formattedDate = formatDateDisplay(dateIso);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPemesan.trim()) return;

    const finalQty = Math.max(1, qty || 1);
    const finalPrice = Math.max(0, unitPrice || 0);
    const finalTotal = finalQty * finalPrice;
    const finalNote = isCustomNote ? (customNoteText.trim() || 'Belum diterima') : note;

    const newOrder: OrderItem = {
      id: `ord-local-${Date.now()}`,
      tanggal: formattedDate,
      namaPemesan: namaPemesan.trim(),
      qty: finalQty,
      amount: finalTotal,
      status,
      pembayaran: status === 'Paid' ? pembayaran : '-',
      note: finalNote,
      batch,
    };

    onAddOrder(newOrder);
    resetForm();
    onClose();
  };

  // Helper quick date selection
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateIso(`${year}-${month}-${day}`);
  };

  const qtyPresets = [1, 2, 3, 5, 10, 15, 20];
  const pricePresets = [21000, 20000, 18000];
  const paymentMethods = ['BCA', 'QRIS', 'Cash', 'Mandiri'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl shadow-xs">
              🥭
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Tambah Pesanan Baru
              </h3>
              <p className="text-[11px] text-slate-500">
                Catat orderan pembeli Mango Sago
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto scrollbar-thin flex-1">
          {/* 1. Tanggal Pesanan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Tanggal Pesanan</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                📅 {formattedDate}
              </span>
            </div>

            <div className="relative">
              <input
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden bg-slate-50 hover:bg-white text-slate-800 font-semibold cursor-pointer transition"
                required
              />
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-slate-400">Pilih cepat:</span>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-semibold text-slate-600 transition cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(-1)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-semibold text-slate-600 transition cursor-pointer"
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-semibold text-slate-600 transition cursor-pointer"
              >
                Besok (PO)
              </button>
            </div>
          </div>

          {/* 2. Nama Pemesan */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nama Pemesan / Pelanggan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={namaPemesan}
              onChange={(e) => setNamaPemesan(e.target.value)}
              placeholder="Contoh: Bu Anita / Dhost Team / Pak Joko"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden text-sm font-medium"
              required
              autoFocus
            />
          </div>

          {/* 3. Jumlah (Qty Cup) dengan Stepper & Presets */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Jumlah Cup (Qty)
            </label>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Kurangi 1 cup"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-10 text-center font-black text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600 pointer-events-none">
                  Cup
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQty((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Tambah 1 cup"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Qty Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
              {qtyPresets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQty(p)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    qty === p
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-amber-100 text-slate-600'
                  }`}
                >
                  {p} cup
                </button>
              ))}
            </div>
          </div>

          {/* 4. Harga Satuan */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Harga Satuan per Cup
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="500"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-semibold"
                required
              />
            </div>
            {/* Quick Price Presets */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-slate-400">Pilihan:</span>
              {pricePresets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setUnitPrice(p)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    unitPrice === p
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-amber-100 text-slate-600'
                  }`}
                >
                  {formatRupiah(p)} {p === 21000 && '(Standar)'}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Live Total Card (Highlight) */}
          <div className="p-3.5 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Total Tagihan</span>
              <span className="text-[10px] text-amber-700 font-medium">
                {qty} Cup × {formatRupiah(unitPrice)}
              </span>
            </div>
            <span className="text-base sm:text-lg font-black text-amber-700 tracking-tight">
              {formatRupiah(totalAmount)}
            </span>
          </div>

          {/* 6. Status Pembayaran (Visual Toggle) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Status Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatus('Not Paid');
                  if (!isCustomNote) setNote('Belum diterima');
                }}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition cursor-pointer ${
                  status === 'Not Paid'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⏳ Belum Lunas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus('Paid');
                  if (!isCustomNote) setNote('Sudah diterima');
                }}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition cursor-pointer ${
                  status === 'Paid'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>✓ Sudah Lunas</span>
              </button>
            </div>
          </div>

          {/* 7. Metode Pembayaran (Hanya aktif jika Paid) */}
          {status === 'Paid' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {paymentMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPembayaran(m)}
                    className={`py-1.5 rounded-xl border font-bold text-center text-xs transition cursor-pointer ${
                      pembayaran === m
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. Batch / Waktu & Catatan */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Batch Pengantaran
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBatch('Pagi')}
                  className={`py-1.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                    batch === 'Pagi'
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>Pagi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBatch('Malam')}
                  className={`py-1.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                    batch === 'Malam'
                      ? 'bg-indigo-100 border-indigo-400 text-indigo-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-500" />
                  <span>Malam</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Pesanan
              </label>
              <select
                value={isCustomNote ? '__custom__' : note}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomNote(true);
                  } else {
                    setIsCustomNote(false);
                    setNote(e.target.value);
                  }
                }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="Belum diterima">Belum diterima</option>
                <option value="Sudah diterima">Sudah diterima</option>
                <option value="__custom__">Lainnya (Ketik sendiri)...</option>
              </select>
            </div>
          </div>

          {isCustomNote && (
            <input
              type="text"
              value={customNoteText}
              onChange={(e) => setCustomNoteText(e.target.value)}
              placeholder="Ketik catatan khusus (misal: titip di pos satpam / minta sendok lebih)..."
              className="w-full px-3 py-2 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden text-xs bg-amber-50/30"
              autoFocus
            />
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer text-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Pesanan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
