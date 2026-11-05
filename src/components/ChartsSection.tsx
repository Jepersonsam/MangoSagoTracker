import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { OrderItem, ExpenseItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface ChartsSectionProps {
  orders: OrderItem[];
  expenses: ExpenseItem[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ orders, expenses }) => {
  const [showOnMobile, setShowOnMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  const shouldRenderCharts = isDesktop || showOnMobile;
  // Aggregate sales by date
  const salesByDateMap: Record<string, { tanggal: string; omset: number; cups: number }> = {};
  orders.forEach((ord) => {
    const key = ord.tanggal || 'Lainnya';
    if (!salesByDateMap[key]) {
      salesByDateMap[key] = { tanggal: key, omset: 0, cups: 0 };
    }
    salesByDateMap[key].omset += ord.amount;
    salesByDateMap[key].cups += ord.qty;
  });
  const salesByDate = Object.values(salesByDateMap);

  // Aggregate expenses by category
  const expenseByCategoryMap: Record<string, number> = {
    'Bahan Baku': 0,
    Kemasan: 0,
    Operasional: 0,
  };
  expenses.forEach((exp) => {
    const cat = exp.category || 'Bahan Baku';
    expenseByCategoryMap[cat] = (expenseByCategoryMap[cat] || 0) + exp.totalAmount;
  });

  const expenseCategoryData = [
    { name: 'Bahan Baku', value: expenseByCategoryMap['Bahan Baku'], color: '#f59e0b' },
    { name: 'Kemasan', value: expenseByCategoryMap['Kemasan'], color: '#06b6d4' },
    { name: 'Operasional', value: expenseByCategoryMap['Operasional'], color: '#ec4899' },
  ].filter((d) => d.value > 0);

  // Payment Status Data
  const paidCount = orders.filter((o) => o.status === 'Paid').length;
  const unpaidCount = orders.filter((o) => o.status === 'Not Paid').length;
  const paymentStatusData = [
    { name: 'Paid (Lunas)', value: paidCount, color: '#10b981' },
    { name: 'Not Paid (Belum)', value: unpaidCount, color: '#f97316' },
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      {/* Mobile Toggle Button for Charts */}
      <div className="lg:hidden mb-2">
        <button
          type="button"
          onClick={() => setShowOnMobile(!showOnMobile)}
          className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold flex items-center justify-between shadow-2xs cursor-pointer active:scale-98 transition"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span>Grafik Analisis Tren & Komposisi Biaya</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-amber-600 font-bold">
            {showOnMobile ? 'Tutup' : 'Lihat Grafik'}
            {showOnMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
      </div>

      {/* Grid container: Only rendered if desktop or user opened it on mobile */}
      {shouldRenderCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 w-full min-w-0">
        {/* Chart 1: Penjualan per Tanggal */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/90 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Tren Penjualan & Volume Cup per Tanggal
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500">
                Omset penjualan dessert mangga per batch tanggal
              </p>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 shrink-0">
              {salesByDate.length} Batch
            </span>
          </div>

          <div className="h-48 sm:h-64 w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="tanggal" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `Rp${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === 'omset' ? formatRupiah(Number(val)) : `${val} Cup`,
                    name === 'omset' ? 'Total Omset' : 'Jumlah Cup',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="omset" name="omset" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Komposisi Pengeluaran */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                  Komposisi Pengeluaran
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  Alokasi belanja bahan & perlengkapan
                </p>
              </div>
            </div>

            <div className="h-44 sm:h-48 w-full flex items-center justify-center min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatRupiah(Number(val)), 'Total']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2.5">
            {expenseCategoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] sm:text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-600">{cat.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{formatRupiah(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

