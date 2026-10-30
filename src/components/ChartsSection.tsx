import React from 'react';
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
import { OrderItem, ExpenseItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface ChartsSectionProps {
  orders: OrderItem[];
  expenses: ExpenseItem[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ orders, expenses }) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Chart 1: Penjualan per Tanggal */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Tren Penjualan & Volume Cup per Tanggal
            </h2>
            <p className="text-xs text-slate-500">
              Omset penjualan dessert mangga per batch tanggal
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
            {salesByDate.length} Batch
          </span>
        </div>

        <div className="h-56 sm:h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
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
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="omset" name="omset" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Komposisi Pengeluaran */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Komposisi Pengeluaran
              </h2>
              <p className="text-xs text-slate-500">
                Alokasi belanja bahan & perlengkapan
              </p>
            </div>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
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
        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-3">
          {expenseCategoryData.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-600">{cat.name}</span>
              </div>
              <span className="font-semibold text-slate-800">{formatRupiah(cat.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

