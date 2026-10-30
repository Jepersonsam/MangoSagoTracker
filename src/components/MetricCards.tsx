import React from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Clock, Wallet } from 'lucide-react';
import { DashboardMetrics } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  const profitMargin = metrics.totalRevenue > 0
    ? Math.round((metrics.netProfit / metrics.totalRevenue) * 100)
    : 0;

  const cards = [
    {
      title: 'Total Penjualan (Omset)',
      value: formatRupiah(metrics.totalRevenue),
      subtext: `${metrics.totalOrders} Pesanan • ${metrics.totalCupsSold} Cup Terjual`,
      icon: DollarSign,
      color: 'amber',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      colSpan: 'col-span-1',
    },
    {
      title: 'Pengeluaran Bahan',
      value: formatRupiah(metrics.totalExpenses),
      subtext: 'Bahan Baku, Kemasan & Operasional',
      icon: ShoppingBag,
      color: 'rose',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      borderColor: 'border-rose-200',
      colSpan: 'col-span-1',
    },
    {
      title: 'Estimasi Laba Bersih',
      value: formatRupiah(metrics.netProfit),
      subtext: `Margin Laba: ${profitMargin}%`,
      icon: TrendingUp,
      color: 'emerald',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      colSpan: 'col-span-1',
    },
    {
      title: 'Piutang Belum Lunas',
      value: formatRupiah(metrics.unpaidAmount),
      subtext: `${metrics.unpaidOrdersCount} Pesanan Not Paid`,
      icon: Clock,
      color: 'orange',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      colSpan: 'col-span-1',
    },
    {
      title: 'Saldo Kas Berjalan',
      value: formatRupiah(metrics.currentBalance),
      subtext: 'Arus Kas Masuk & Keluar',
      icon: Wallet,
      color: 'indigo',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      colSpan: 'col-span-2 sm:col-span-1', // Full width on 2-col mobile, 1-col on tablet/desktop
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition relative overflow-hidden flex flex-col justify-between ${card.colSpan}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate mr-1">
                {card.title}
              </span>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${card.bgLight} ${card.textColor} flex items-center justify-center shrink-0`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                {card.value}
              </div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
