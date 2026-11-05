import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatRupiah } from '../services/sheetsService';

export interface DeleteConfirmTarget {
  type: 'order' | 'expense' | 'cashflow';
  id: string;
  title: string;
  subtitle?: string;
  amount?: number;
  qty?: number;
  categoryOrStatus?: string;
  date?: string;
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  target: DeleteConfirmTarget | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  target,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !target) return null;

  const isOrder = target.type === 'order';
  const isCashflow = target.type === 'cashflow';

  const getHeadingTitle = () => {
    if (isOrder) return 'Hapus Pesanan Pelanggan?';
    if (isCashflow) return 'Hapus Catatan Buku Kas?';
    return 'Hapus Data Pengeluaran?';
  };

  const getItemLabel = () => {
    if (isOrder) return 'Nama Pemesan';
    if (isCashflow) return 'Keterangan Mutasi Kas';
    return 'Nama Item / Bahan';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Red Warning Accent */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-lg font-bold text-slate-800 leading-snug">
              {getHeadingTitle()}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Konfirmasi penghapusan data secara permanen dari sistem.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Preview Card */}
        <div className="px-6 py-3">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {getItemLabel()}
              </span>
              {target.categoryOrStatus && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isOrder
                    ? target.categoryOrStatus.toLowerCase().includes('paid')
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                    : isCashflow
                    ? target.categoryOrStatus === 'Masuk'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {target.categoryOrStatus}
                </span>
              )}
            </div>

            <div className="text-sm font-bold text-slate-800">
              {target.title}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs">
              {target.qty !== undefined ? (
                <div>
                  <span className="text-slate-400 block text-[10px]">Jumlah</span>
                  <span className="font-semibold text-slate-700">
                    {`${target.qty} ${isOrder ? 'Cup' : 'Item/Pcs'}`}
                  </span>
                </div>
              ) : isCashflow ? (
                <div>
                  <span className="text-slate-400 block text-[10px]">Tipe Kas</span>
                  <span className="font-semibold text-slate-700">
                    {target.categoryOrStatus || 'Arus Kas'}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-slate-400 block text-[10px]">Kategori</span>
                  <span className="font-semibold text-slate-700">
                    {target.categoryOrStatus || '-'}
                  </span>
                </div>
              )}
              {target.amount !== undefined && (
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {isCashflow ? (target.categoryOrStatus === 'Masuk' ? 'Uang Masuk' : 'Uang Keluar') : 'Total Nominal'}
                  </span>
                  <span className={`font-bold ${isCashflow && target.categoryOrStatus === 'Masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatRupiah(target.amount)}
                  </span>
                </div>
              )}
            </div>

            {target.date && (
              <div className="text-[11px] text-slate-500 pt-1">
                📅 Tanggal: <span className="font-medium text-slate-700">{target.date}</span>
              </div>
            )}
          </div>

          {/* Warning Message Box */}
          <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-amber-900">
            <span className="text-base select-none">⚠️</span>
            <p className="text-[11px] leading-relaxed">
              <strong>Tindakan ini tidak dapat dibatalkan.</strong> Data ini akan langsung dihapus dari database Supabase secara permanen{isCashflow ? ' dan saldo kas berjalan akan dihitung ulang otomatis.' : '.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 border border-slate-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block animate-spin mr-1">⏳</span>
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Ya, Hapus Permanen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

