import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Check } from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (order: OrderItem) => void;
}

// Convert "YYYY-MM-DD" into spreadsheet format "D MMM YY" (e.g. "30 Oct 26", "3 Nov 26")
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

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onAddOrder,
}) => {
  const [dateIso, setDateIso] = useState<string>(getTodayIso());
  const [namaPemesan, setNamaPemesan] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>(21000);
  const [status, setStatus] = useState<'Paid' | 'Not Paid'>('Not Paid');
  const [pembayaran, setPembayaran] = useState('BCA');
  const [note, setNote] = useState('Belum diterima');
  const [isCustomNote, setIsCustomNote] = useState(false);
  const [customNoteText, setCustomNoteText] = useState('');
  const [batch, setBatch] = useState('Pagi');

  if (!isOpen) return null;

  const numQty = qty === '' ? 0 : Number(qty);
  const numPrice = unitPrice === '' ? 0 : Number(unitPrice);
  const totalAmount = numQty * numPrice;
  const formattedSheetDate = formatDateForSheet(dateIso);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPemesan.trim()) return;

    const finalQty = Math.max(1, numQty || 1);
    const finalPrice = Math.max(0, numPrice || 0);
    const finalTotal = finalQty * finalPrice;
    const finalNote = isCustomNote ? (customNoteText.trim() || 'Belum diterima') : note;

    const newOrder: OrderItem = {
      id: `ord-local-${Date.now()}`,
      tanggal: formattedSheetDate,
      namaPemesan: namaPemesan.trim(),
      qty: finalQty,
      amount: finalTotal,
      status,
      pembayaran: status === 'Paid' ? pembayaran : '-',
      note: finalNote,
      batch,
    };

    onAddOrder(newOrder);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥭</span>
            <h3 className="font-bold text-slate-900 text-sm">Tambah Pesanan Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Kolom Tanggal dengan Kalender */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Tanggal Pesanan (Kalender)</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {formattedSheetDate}
              </span>
            </div>

            <div className="relative">
              <input
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden bg-slate-50 hover:bg-white text-slate-800 font-semibold cursor-pointer transition"
                required
              />
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-slate-400">Pilih cepat:</span>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-medium text-slate-600 transition cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(-1)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-medium text-slate-600 transition cursor-pointer"
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-medium text-slate-600 transition cursor-pointer"
              >
                Besok
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Pemesan</label>
            <input
              type="text"
              value={namaPemesan}
              onChange={(e) => setNamaPemesan(e.target.value)}
              placeholder="Contoh: Bu Anita / Dhost Team"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jumlah (Qty Cup)</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => {
                  const val = e.target.value;
                  setQty(val === '' ? '' : Math.max(1, parseInt(val, 10) || 1));
                }}
                placeholder="1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                step="500"
                value={unitPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setUnitPrice(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                }}
                placeholder="misal: 21000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                required
              />
            </div>
          </div>

          {/* Total Preview */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
            <span className="font-semibold text-slate-600">Total Tagihan:</span>
            <span className="text-sm font-bold text-amber-700">{formatRupiah(totalAmount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status Pembayaran</label>
              <select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as 'Paid' | 'Not Paid';
                  setStatus(newStatus);
                  if (!isCustomNote) {
                    setNote(newStatus === 'Paid' ? 'Sudah diterima' : 'Belum diterima');
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden bg-white"
              >
                <option value="Paid">Paid (Lunas)</option>
                <option value="Not Paid">Not Paid (Belum)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Metode Bayar</label>
              <select
                value={pembayaran}
                disabled={status === 'Not Paid'}
                onChange={(e) => setPembayaran(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="BCA">BCA Transfer</option>
                <option value="Cash">Cash / Tunai</option>
                <option value="QRIS">QRIS</option>
                <option value="Mandiri">Mandiri</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batch / Waktu</label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden bg-white font-medium"
              >
                <option value="Pagi">Pagi</option>
                <option value="Malam">Malam</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="Belum diterima">Belum diterima</option>
                <option value="Sudah diterima">Sudah diterima</option>
                <option value="__custom__">Lainnya (Ketik sendiri)...</option>
              </select>

              {isCustomNote && (
                <input
                  type="text"
                  value={customNoteText}
                  onChange={(e) => setCustomNoteText(e.target.value)}
                  placeholder="Ketik catatan khusus..."
                  className="w-full mt-2 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden text-xs bg-amber-50/30"
                  autoFocus
                />
              )}
            </div>
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
              className="px-4 py-2 font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs shadow-amber-500/20 transition cursor-pointer"
            >
              Simpan Pesanan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
