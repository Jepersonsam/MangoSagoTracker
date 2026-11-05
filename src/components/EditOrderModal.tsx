import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Check, Trash2, AlertTriangle } from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  onUpdateOrder: (updatedOrder: OrderItem) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdateOrder,
  onDeleteOrder,
}) => {
  const [tanggal, setTanggal] = useState('');
  const [namaPemesan, setNamaPemesan] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [amount, setAmount] = useState<number | ''>(21000);
  const [status, setStatus] = useState<'Paid' | 'Not Paid'>('Not Paid');
  const [pembayaran, setPembayaran] = useState('BCA');
  const [note, setNote] = useState('Belum diterima');
  const [isCustomNote, setIsCustomNote] = useState(false);
  const [customNoteText, setCustomNoteText] = useState('');
  const [batch, setBatch] = useState('Pagi');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setTanggal(order.tanggal || '');
      setNamaPemesan(order.namaPemesan || '');
      setQty(order.qty || 1);
      setAmount(order.amount || 21000);
      setStatus((order.status as 'Paid' | 'Not Paid') || 'Not Paid');
      setPembayaran(order.pembayaran || 'BCA');
      
      const isPredefined = ['Belum diterima', 'Sudah diterima'].includes(order.note || '');
      if (isPredefined) {
        setNote(order.note || 'Belum diterima');
        setIsCustomNote(false);
        setCustomNoteText('');
      } else {
        setIsCustomNote(true);
        setCustomNoteText(order.note || '');
      }

      setBatch(order.batch || 'Pagi');
      setShowDeleteConfirm(false);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const numQty = qty === '' ? 0 : Number(qty);
  const numAmount = amount === '' ? 0 : Number(amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPemesan.trim()) return;

    const finalNote = isCustomNote ? (customNoteText.trim() || 'Belum diterima') : note;

    const updatedOrder: OrderItem = {
      ...order,
      tanggal: tanggal.trim() || order.tanggal,
      namaPemesan: namaPemesan.trim(),
      qty: Math.max(1, numQty),
      amount: Math.max(0, numAmount),
      status,
      pembayaran: status === 'Paid' ? pembayaran : '-',
      note: finalNote,
      batch,
    };

    onUpdateOrder(updatedOrder);
    onClose();
  };

  const handleDelete = () => {
    if (onDeleteOrder && order) {
      onDeleteOrder(order.id);
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
              Edit Pesanan
            </h2>
            <p className="text-xs text-slate-500">
              Perbarui detail pesanan pelanggan
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
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Tanggal Pesanan</span>
            </label>
            <input
              type="text"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              placeholder="Contoh: 5 Nov 26"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs font-medium text-slate-800 outline-hidden"
              required
            />
          </div>

          {/* Nama Pemesan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pemesan *
            </label>
            <input
              type="text"
              value={namaPemesan}
              onChange={(e) => setNamaPemesan(e.target.value)}
              placeholder="Masukkan nama pemesan..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs text-slate-800 outline-hidden"
              required
            />
          </div>

          {/* Qty & Total Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah (Cup) *
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1);
                  setQty(val);
                  if (val !== '') {
                    setAmount(Number(val) * 21000);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs font-bold text-slate-800 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Nominal (Rp) *
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs font-bold text-slate-800 outline-hidden"
                required
              />
            </div>
          </div>

          {/* Batch & Pembayaran */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Pengiriman
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs text-slate-800 outline-hidden"
              >
                <option value="Pagi">Pagi</option>
                <option value="Malam">Malam</option>
                <option value="-">Tanpa Batch (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={pembayaran}
                onChange={(e) => setPembayaran(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs text-slate-800 outline-hidden"
              >
                <option value="BCA">BCA</option>
                <option value="Mandiri">Mandiri</option>
                <option value="BRI">BRI</option>
                <option value="QRIS">QRIS</option>
                <option value="Cash">Cash</option>
                <option value="-">Belum Ada (-)</option>
              </select>
            </div>
          </div>

          {/* Status Bayar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Paid')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'Paid'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${status === 'Paid' ? 'opacity-100' : 'opacity-0'}`} />
                <span>Paid (Lunas)</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('Not Paid')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'Not Paid'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${status === 'Not Paid' ? 'opacity-100' : 'opacity-0'}`} />
                <span>Not Paid (Belum)</span>
              </button>
            </div>
          </div>

          {/* Catatan / Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Status Pengiriman
            </label>
            {!isCustomNote ? (
              <select
                value={note}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setIsCustomNote(true);
                  } else {
                    setNote(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs text-slate-800 outline-hidden"
              >
                <option value="Belum diterima">Belum diterima</option>
                <option value="Sudah diterima">Sudah diterima</option>
                <option value="CUSTOM">-- Tulis Catatan Kustom --</option>
              </select>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={customNoteText}
                  onChange={(e) => setCustomNoteText(e.target.value)}
                  placeholder="Tulis catatan kustom..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition text-xs text-slate-800 outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomNote(false);
                    setNote('Belum diterima');
                  }}
                  className="text-[11px] text-amber-600 hover:underline cursor-pointer"
                >
                  ← Kembali ke pilihan standar
                </button>
              </div>
            )}
          </div>

          {/* Konfirmasi Hapus Order */}
          {showDeleteConfirm && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Hapus pesanan ini secara permanen?</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Data pesanan {order.namaPemesan} ({order.qty} cup • {formatRupiah(order.amount)}) akan dihapus dari Supabase.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Ya, Hapus Pesanan
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
            {onDeleteOrder && !showDeleteConfirm ? (
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-xs shadow-sm shadow-amber-500/20 transition cursor-pointer"
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
