import React, { useState } from 'react';
import { Megaphone, AlertCircle, AlertTriangle, Info, X, Edit3 } from 'lucide-react';
import { BroadcastMessage } from '../types';

interface BroadcastBannerProps {
  broadcast: BroadcastMessage | null;
  onOpenManage: () => void;
  canManage: boolean;
}

export const BroadcastBanner: React.FC<BroadcastBannerProps> = ({
  broadcast,
  onOpenManage,
  canManage,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!broadcast || !broadcast.active || isDismissed) {
    return null;
  }

  const getTypeStyles = () => {
    switch (broadcast.type) {
      case 'urgent':
        return {
          container: 'bg-linear-to-r from-rose-500 via-red-500 to-rose-600 text-white shadow-md shadow-rose-500/20 border-rose-400',
          badge: 'bg-white/20 text-white border-white/30',
          icon: <AlertCircle className="w-4 h-4 text-white animate-pulse" />,
          pillText: 'PENTING',
          buttonClass: 'bg-white text-rose-700 hover:bg-rose-50',
        };
      case 'warning':
        return {
          container: 'bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-amber-500/20 border-amber-400',
          badge: 'bg-white/20 text-white border-white/30',
          icon: <AlertTriangle className="w-4 h-4 text-white" />,
          pillText: 'PERHATIAN',
          buttonClass: 'bg-white text-amber-800 hover:bg-amber-50',
        };
      case 'info':
      default:
        return {
          container: 'bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/20 border-blue-400',
          badge: 'bg-white/20 text-white border-white/30',
          icon: <Info className="w-4 h-4 text-white" />,
          pillText: 'INFORMASI',
          buttonClass: 'bg-white text-blue-700 hover:bg-blue-50',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`w-full rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${styles.container}`}>
      <div className="flex items-start sm:items-center justify-between gap-3">
        {/* Left Content */}
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${styles.badge} flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>{styles.pillText}</span>
              </span>
              <span className="text-[11px] text-white/90 font-medium">
                Oleh <strong className="font-bold text-white">{broadcast.author}</strong> • {broadcast.createdAt}
              </span>
            </div>
            
            <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed break-words">
              {broadcast.message}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
          {canManage && (
            <button
              type="button"
              onClick={onOpenManage}
              title="Kelola Broadcast"
              className={`text-xs font-bold px-2.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 ${styles.buttonClass}`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kelola</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            title="Tutup banner ini"
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

