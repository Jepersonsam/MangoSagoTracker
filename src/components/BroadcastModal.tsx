import React, { useState, useEffect } from 'react';
import {
  X,
  Megaphone,
  AlertCircle,
  AlertTriangle,
  Info,
  Send,
  Trash2,
  Sparkles,
  Check,
} from 'lucide-react';
import { BroadcastMessage, User } from '../types';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBroadcast: BroadcastMessage | null;
  onSaveBroadcast: (broadcast: BroadcastMessage) => Promise<void> | void;
  onClearBroadcast: () => Promise<void> | void;
  currentUser: User | null;
}

const PRESET_MESSAGES = [
  {
    type: 'urgent' as const,
    text: '🚨 Batch hari ini sisa sedikit lagi! Cek stok cup sebelum terima pesanan baru.',
  },
  {
    type: 'warning' as const,
    text: '🥭 Stok mangga & susu menipis. Harap koordinasikan belanja bahan ke kasir.',
  },
  {
    type: 'info' as const,
    text: '📦 Semua pesanan batch siang sudah selesai dibuat dan siap diambil/dikirim.',
  },
  {
    type: 'warning' as const,
    text: '💰 Harap pastikan uang fisik di laci cocok dengan Saldo Kas Berjalan di Buku Kas.',
  },
];

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  currentBroadcast,
  onSaveBroadcast,
  onClearBroadcast,
  currentUser,
}) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'urgent' | 'warning' | 'info'>('warning');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentBroadcast && currentBroadcast.active) {
        setMessage(currentBroadcast.message);
        setType(currentBroadcast.type);
      } else {
        setMessage('');
        setType('warning');
      }
    }
  }, [isOpen, currentBroadcast]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const newBroadcast: BroadcastMessage = {
        message: message.trim().slice(0, 2000),
        type,
        author: currentUser?.name || 'Admin',
        createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        active: true,
      };
      await onSaveBroadcast(newBroadcast);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    try {
      await onClearBroadcast();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Broadcast Pengumuman Tim
              </h2>
              <p className="text-xs text-slate-500">
                Kirim pesan langsung ke dashboard semua admin & kasir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Pilihan Cepat Pengumuman:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PRESET_MESSAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMessage(preset.text);
                    setType(preset.type);
                  }}
                  className="text-left p-2 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-[11px] text-slate-700 transition cursor-pointer flex items-start gap-1.5"
                >
                  <span className="shrink-0 mt-0.5">•</span>
                  <span className="line-clamp-2">{preset.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipe Pengumuman:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('urgent')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  type === 'urgent'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Penting</span>
              </button>

              <button
                type="button"
                onClick={() => setType('warning')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  type === 'warning'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Perhatian</span>
              </button>

              <button
                type="button"
                onClick={() => setType('info')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  type === 'info'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Info className="w-4 h-4 text-blue-500" />
                <span>Informasi</span>
              </button>
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Pesan Pengumuman:
              </label>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  message.length >= 2000
                    ? 'bg-rose-100 text-rose-700 font-bold'
                    : message.length >= 1700
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {message.length >= 2000
                  ? 'Batas 2000 Karakter Penuh'
                  : `${message.length}/2000 karakter (sisa ${2000 - message.length})`}
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= 2000) {
                  setMessage(e.target.value);
                }
              }}
              maxLength={2000}
              rows={4}
              placeholder="Contoh: Batch siang sudah lunas semua. Harap cek bahan baku mangga untuk besok pagi..."
              className={`w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-hidden transition ${
                message.length >= 2000
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
              }`}
              required
            />
            {message.length >= 2000 && (
              <p className="text-[10px] text-rose-600 font-medium mt-1">
                ⚠️ Anda telah mencapai batas maksimal 2000 karakter.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            {currentBroadcast && currentBroadcast.active ? (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Matikan Broadcast</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-sm shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan Pengumuman'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

