import React from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Clock, Wallet, CheckCircle } from 'lucide-react';
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
    },
    {
      title: 'Total Pengeluaran Bahan',
      value: formatRupiah(metrics.totalExpenses),
      subtext: 'Bahan Baku, Kemasan & Operasional',
      icon: ShoppingBag,
      color: 'rose',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      borderColor: 'border-rose-200',
    },
    {
      title: 'Estimasi Laba Bersih',
      value: formatRupiah(metrics.netProfit),
      subtext: `Margin Keuntungan: ${profitMargin}%`,
      icon: TrendingUp,
      color: 'emerald',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Piutang Belum Dibayar',
      value: formatRupiah(metrics.unpaidAmount),
      subtext: `${metrics.unpaidOrdersCount} Pesanan Status "Not Paid"`,
      icon: Clock,
      color: 'orange',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Saldo Kas Berjalan',
      value: formatRupiah(metrics.currentBalance),
      subtext: 'Berdasarkan Buku Kas / Cashflow',
      icon: Wallet,
      color: 'indigo',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 line-clamp-1">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-xl ${card.bgLight} ${card.textColor} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight">
              {card.value}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};

