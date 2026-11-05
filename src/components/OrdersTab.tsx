import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  Table as TableIcon,
  Sun,
  Moon,
  Info,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah } from '../services/sheetsService';

interface OrdersTabProps {
  orders: OrderItem[];
  onToggleStatus: (id: string) => void;
  onOpenNewOrder: () => void;
  onEditOrder?: (order: OrderItem) => void;
  onDeleteOrder?: (id: string) => void;
}

type DisplayMode = 'slide' | 'calendar' | 'table';

export type DateStatus = 'past' | 'today' | 'future';

interface DateSummary {
  tanggal: string;
  dateObj: Date | null;
  status: DateStatus;
  totalQty: number;
  totalAmount: number;
  orderCount: number;
  paidQty: number;
  unpaidQty: number;
  paidAmount: number;
  unpaidAmount: number;
  pagiQty: number;
  malamQty: number;
  orders: OrderItem[];
}

export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const numParts = dateStr.trim().split(/[/.-]/);
  if (
    numParts.length === 3 &&
    !isNaN(Number(numParts[0])) &&
    !isNaN(Number(numParts[1])) &&
    !isNaN(Number(numParts[2]))
  ) {
    let day = Number(numParts[0]);
    let month = Number(numParts[1]) - 1;
    let year = Number(numParts[2]);
    if (year < 100) year += 2000;
    if (month > 11 && day <= 12) {
      const temp = day;
      day = month + 1;
      month = temp - 1;
    }
    return new Date(year, month, day);
  }

  // Text format e.g. "26 Oct 26", "3 Nov 2026", "26 Oktober 2026"
  const parts = dateStr.trim().split(/[\s-]+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
      jul: 6, aug: 7, agu: 7, sep: 8, oct: 9, okt: 9, nov: 10, des: 11, dec: 11
    };
    const monthKey = monthStr.slice(0, 3);
    if (!isNaN(day) && monthMap[monthKey] !== undefined) {
      return new Date(year, monthMap[monthKey], day);
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export function getDateStatus(dateObj: Date | null): DateStatus {
  if (!dateObj) return 'past';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

  if (target < today) return 'past';
  if (target === today) return 'today';
  return 'future';
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  onToggleStatus,
  onOpenNewOrder,
  onEditOrder,
  onDeleteOrder,
}) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('slide');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Not Paid'>('All');
  const [dateCategoryFilter, setDateCategoryFilter] = useState<'all' | 'future' | 'past'>('all');

  const [selectedSlideDate, setSelectedSlideDate] = useState<string | null>(null);

  const [calDate, setCalDate] = useState(() => new Date(2026, 10, 1));
  const [calSelectedDateStr, setCalSelectedDateStr] = useState<string | null>(null);
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');

  const dailySummaries: DateSummary[] = useMemo(() => {
    const map = new Map<string, DateSummary>();

    orders.forEach((ord) => {
      const key = ord.tanggal || 'Tanpa Tanggal';
      if (!map.has(key)) {
        const dObj = parseDateString(key);
        map.set(key, {
          tanggal: key,
          dateObj: dObj,
          status: getDateStatus(dObj),
          totalQty: 0,
          totalAmount: 0,
          orderCount: 0,
          paidQty: 0,
          unpaidQty: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          pagiQty: 0,
          malamQty: 0,
          orders: [],
        });
      }

      const sum = map.get(key)!;
      const qty = Number(ord.qty) || 0;
      const amount = Number(ord.amount) || 0;

      sum.totalQty += qty;
      sum.totalAmount += amount;
      sum.orderCount += 1;
      sum.orders.push(ord);

      if (ord.status === 'Paid') {
        sum.paidQty += qty;
        sum.paidAmount += amount;
      } else {
        sum.unpaidQty += qty;
        sum.unpaidAmount += amount;
      }

      const batchLower = (ord.batch || '').toLowerCase();
      if (batchLower.includes('pagi')) {
        sum.pagiQty += qty;
      } else if (batchLower.includes('malam')) {
        sum.malamQty += qty;
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => {
      const timeA = a.dateObj ? a.dateObj.getTime() : 0;
      const timeB = b.dateObj ? b.dateObj.getTime() : 0;
      return dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [orders, dateSortOrder]);

  // Counts for past vs future
  const upcomingDatesCount = useMemo(() => {
    return dailySummaries.filter((s) => s.status === 'future' || s.status === 'today').length;
  }, [dailySummaries]);

  const pastDatesCount = useMemo(() => {
    return dailySummaries.filter((s) => s.status === 'past').length;
  }, [dailySummaries]);

  // Filtered summaries for quick slider pills
  const displayedSummaries = useMemo(() => {
    if (dateCategoryFilter === 'future') {
      return dailySummaries.filter((s) => s.status === 'future' || s.status === 'today');
    }
    if (dateCategoryFilter === 'past') {
      return dailySummaries.filter((s) => s.status === 'past');
    }
    return dailySummaries;
  }, [dailySummaries, dateCategoryFilter]);

  // Determine active slide: preferentially default to the first upcoming/today date
  const currentSlide: DateSummary | undefined = useMemo(() => {
    if (selectedSlideDate) {
      const found = dailySummaries.find((s) => s.tanggal === selectedSlideDate);
      if (found) return found;
    }
    // Default to the first upcoming/today date if available, otherwise latest date
    const firstActive = dailySummaries.find((s) => s.status === 'today' || s.status === 'future');
    return firstActive || dailySummaries[dailySummaries.length - 1] || dailySummaries[0];
  }, [dailySummaries, selectedSlideDate]);

  const currentSlideIndex = useMemo(() => {
    return dailySummaries.findIndex((s) => s.tanggal === currentSlide?.tanggal);
  }, [dailySummaries, currentSlide]);

  const dateSummaryMap = useMemo(() => {
    const m = new Map<string, DateSummary>();
    dailySummaries.forEach((sum) => {
      if (sum.dateObj) {
        const key = `${sum.dateObj.getFullYear()}-${sum.dateObj.getMonth()}-${sum.dateObj.getDate()}`;
        m.set(key, sum);
      }
    });
    return m;
  }, [dailySummaries]);

  const calendarGrid = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const cells: {
      dayNum: number;
      dateObj: Date;
      summary?: DateSummary;
      isCurrentMonth: boolean;
    }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, 1 - (startDayOfWeek - i));
      cells.push({
        dayNum: prevDate.getDate(),
        dateObj: prevDate,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const thisDate = new Date(year, month, day);
      const key = `${year}-${month}-${day}`;
      const sum = dateSummaryMap.get(key);
      cells.push({
        dayNum: day,
        dateObj: thisDate,
        summary: sum,
        isCurrentMonth: true,
      });
    }

    return cells;
  }, [calDate, dateSummaryMap]);

  const activeOrdersForView = useMemo(() => {
    let baseOrders: OrderItem[] = [];

    if (displayMode === 'slide') {
      baseOrders = currentSlide ? currentSlide.orders : [];
    } else if (displayMode === 'calendar') {
      if (calSelectedDateStr) {
        const found = dailySummaries.find((s) => s.tanggal === calSelectedDateStr);
        baseOrders = found ? found.orders : [];
      } else if (dailySummaries.length > 0) {
        baseOrders = dailySummaries[dailySummaries.length - 1].orders;
      }
    } else {
      baseOrders = orders;
    }

    const filtered = baseOrders.filter((ord) => {
      const matchesSearch =
        ord.namaPemesan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.tanggal.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || ord.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const timeA = parseDateString(a.tanggal)?.getTime() || 0;
      const timeB = parseDateString(b.tanggal)?.getTime() || 0;
      return dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [displayMode, currentSlide, calSelectedDateStr, dailySummaries, orders, searchTerm, statusFilter, dateSortOrder]);

  const handleExportCsv = () => {
    const listToExport = displayMode === 'table' ? orders : activeOrdersForView;
    const header = ['Tanggal', 'Nama Pemesan', 'Qty', 'Amount', 'Status', 'Catatan', 'Pembayaran', 'Batch'];
    const rows = listToExport.map((o) => [
      o.tanggal,
      `"${o.namaPemesan}"`,
      o.qty,
      o.amount,
      o.status,
      `"${o.note}"`,
      o.pembayaran,
      o.batch || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pesanan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrevMonth = () => {
    setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calMonthTitle = calDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0 w-full max-w-full min-w-0">
      {/* Top Header & View Switcher */}
      <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-linear-to-r from-amber-50/50 via-white to-orange-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Penjualan & Rekap Harian
              </h2>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                🥭 {dailySummaries.length} Hari
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Pilih mode slide per tanggal atau tampilan kalender agar ringkas di HP.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="grid grid-cols-3 sm:flex items-center p-0.5 sm:p-1 bg-slate-100 rounded-xl text-[11px] sm:text-xs font-semibold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDisplayMode('slide')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer text-center ${
                  displayMode === 'slide'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Slide</span>
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode('calendar')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer text-center ${
                  displayMode === 'calendar'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Kalender</span>
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer text-center ${
                  displayMode === 'table'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Tabel</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={onOpenNewOrder}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pesanan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SLIDE HARIAN MODE (MOBILE RESPONSIVE HERO)            */}
      {/* ======================================================== */}
      {displayMode === 'slide' && currentSlide && (
        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          {/* Slide Navigation Header */}
          <div className="flex items-center justify-between bg-slate-900 text-white rounded-2xl p-3 sm:p-5 shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            <button
              type="button"
              disabled={currentSlideIndex <= 0}
              onClick={() => {
                if (currentSlideIndex > 0) {
                  setSelectedSlideDate(dailySummaries[currentSlideIndex - 1].tanggal);
                }
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:pointer-events-none transition text-xs font-semibold shrink-0 cursor-pointer"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Slide Center Info */}
            <div className="text-center px-1 space-y-1">
              {/* Distinct Status Badge (Sudah Lewat vs Belum Lewat) */}
              <div className="flex items-center justify-center gap-1.5">
                {currentSlide.status === 'past' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>✓ Sudah Lewat (Selesai)</span>
                  </span>
                )}
                {currentSlide.status === 'today' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500/30 text-amber-300 border border-amber-400/50 inline-flex items-center gap-1 animate-pulse shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>🔥 Hari Ini (Aktif)</span>
                  </span>
                )}
                {currentSlide.status === 'future' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-500/30 text-blue-300 border border-blue-400/50 inline-flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>⏳ Belum Lewat (Open PO)</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center justify-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white font-extrabold">{currentSlide.tanggal}</span>
                <span className="text-slate-400 font-normal">
                  ({currentSlideIndex + 1}/{dailySummaries.length})
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <span className="text-2xl sm:text-4xl font-black text-amber-300 tracking-tight">
                  {currentSlide.totalQty} Cup
                </span>
                <span className="text-xs sm:text-sm font-bold text-white/90">
                  {currentSlide.status === 'future' ? 'Dipesan 🥭' : 'Terjual 🥭'}
                </span>
              </div>

              <div className="text-[11px] sm:text-xs text-slate-300 truncate">
                {currentSlide.status === 'future' ? 'Potensi Omset:' : 'Total Omset:'}{' '}
                <span className="font-bold text-white">{formatRupiah(currentSlide.totalAmount)}</span>
                <span className="mx-1.5">•</span>
                {currentSlide.orderCount} Pemesan
              </div>
            </div>

            <button
              type="button"
              disabled={currentSlideIndex >= dailySummaries.length - 1}
              onClick={() => {
                if (currentSlideIndex < dailySummaries.length - 1) {
                  setSelectedSlideDate(dailySummaries[currentSlideIndex + 1].tanggal);
                }
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:pointer-events-none transition text-xs font-semibold shrink-0 cursor-pointer"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Category Filter Tabs (Semua, Belum Lewat, Sudah Lewat) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDateCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shrink-0 ${
                dateCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Semua Hari</span>
              <span className="text-[10px] opacity-80">({dailySummaries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDateCategoryFilter('future')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shrink-0 ${
                dateCategoryFilter === 'future'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Clock className="w-3 h-3 text-blue-500" />
              <span>Belum Lewat (Open PO)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                dateCategoryFilter === 'future' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-900'
              }`}>
                {upcomingDatesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDateCategoryFilter('past')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shrink-0 ${
                dateCategoryFilter === 'past'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-slate-500" />
              <span>Sudah Lewat (Selesai)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                dateCategoryFilter === 'past' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {pastDatesCount}
              </span>
            </button>
          </div>

          {/* Quick Date Slider Pills (Horizontal Slide Selector with visual tags) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {displayedSummaries.map((sum) => {
              const isActive = sum.tanggal === currentSlide.tanggal;
              const isPast = sum.status === 'past';
              const isToday = sum.status === 'today';
              const isFuture = sum.status === 'future';

              return (
                <button
                  key={sum.tanggal}
                  type="button"
                  onClick={() => setSelectedSlideDate(sum.tanggal)}
                  className={`shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? isFuture
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                        : isToday
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                        : 'bg-slate-800 text-white border-slate-900 shadow-xs ring-2 ring-slate-400'
                      : isFuture
                      ? 'bg-blue-50/90 text-blue-900 hover:bg-blue-100 border-blue-200'
                      : isToday
                      ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300 font-bold'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {isFuture && <Clock className={`w-3 h-3 ${isActive ? 'text-white' : 'text-blue-600'}`} />}
                  {isToday && <Sparkles className={`w-3 h-3 ${isActive ? 'text-white' : 'text-amber-500'}`} />}
                  {isPast && <CheckCircle2 className={`w-3 h-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />}

                  <span>{sum.tanggal}</span>

                  <span
                    className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isFuture
                        ? 'bg-blue-200 text-blue-900'
                        : isToday
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isFuture ? 'PO' : isToday ? 'Hari Ini' : 'Lewat'} • {sum.totalQty}c
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-metrics Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-[10px] sm:text-[11px] text-amber-800 font-medium">Total Terjual</div>
              <div className="text-base sm:text-lg font-extrabold text-amber-950">{currentSlide.totalQty} Cup</div>
              <div className="text-[10px] text-amber-700 truncate">{formatRupiah(currentSlide.totalAmount)}</div>
            </div>

            <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-[10px] sm:text-[11px] text-emerald-800 font-medium">Lunas (Paid)</div>
              <div className="text-base sm:text-lg font-extrabold text-emerald-950">{currentSlide.paidQty} Cup</div>
              <div className="text-[10px] text-emerald-700 truncate">{formatRupiah(currentSlide.paidAmount)}</div>
            </div>

            <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="text-[10px] sm:text-[11px] text-rose-800 font-medium">Belum Bayar</div>
              <div className="text-base sm:text-lg font-extrabold text-rose-950">{currentSlide.unpaidQty} Cup</div>
              <div className="text-[10px] text-rose-700 truncate">{formatRupiah(currentSlide.unpaidAmount)}</div>
            </div>

            <div className="p-2.5 sm:p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] sm:text-[11px] text-indigo-800 font-medium">Batch / Waktu</div>
                <div className="text-[11px] font-bold text-indigo-950 mt-0.5 flex flex-col gap-0.5">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" /> Pagi: {currentSlide.pagiQty}
                  </span>
                  <span className="flex items-center gap-1">
                    <Moon className="w-3 h-3 text-purple-500" /> Malam: {currentSlide.malamQty}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. KALENDER MODE (GRID BULANAN RESPONSIVE)               */}
      {/* ======================================================== */}
      {displayMode === 'calendar' && (
        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition text-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>{calMonthTitle}</span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition text-slate-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-[10px] sm:text-[11px] font-bold text-slate-600 py-1.5 sm:py-2">
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
              <span className="text-rose-500">Min</span>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
              {calendarGrid.map((cell, idx) => {
                const hasSales = Boolean(cell.summary && cell.summary.totalQty > 0);
                const isSelected = cell.summary && cell.summary.tanggal === calSelectedDateStr;
                const cellStatus = cell.summary ? cell.summary.status : getDateStatus(cell.dateObj);
                const isToday = cellStatus === 'today';
                const isFuture = cellStatus === 'future';
                const isPast = cellStatus === 'past';

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.summary) {
                        setCalSelectedDateStr(cell.summary.tanggal);
                      }
                    }}
                    className={`min-h-[55px] sm:min-h-[85px] p-1 sm:p-2 transition flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-300 pointer-events-none'
                        : isToday
                        ? 'bg-amber-50/50'
                        : hasSales && isFuture
                        ? 'cursor-pointer hover:bg-blue-50/60'
                        : hasSales
                        ? 'cursor-pointer hover:bg-amber-50/60'
                        : 'text-slate-400'
                    } ${isSelected ? 'ring-2 ring-inset ring-amber-500 bg-amber-50/90' : isToday ? 'ring-1 ring-inset ring-amber-400' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : isToday
                            ? 'bg-amber-500 text-white'
                            : hasSales && isFuture
                            ? 'bg-blue-600 text-white'
                            : hasSales
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {hasSales && cell.summary && cell.summary.unpaidQty > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Ada pesanan belum bayar" />
                      )}
                    </div>

                    {hasSales && cell.summary && (
                      <div className="mt-0.5 sm:mt-1 space-y-0.5">
                        <div
                          className={`inline-block w-full text-center px-0.5 py-0.2 sm:px-1 sm:py-0.5 font-bold text-[9px] sm:text-xs rounded border leading-tight ${
                            isFuture
                              ? 'bg-blue-100 text-blue-950 border-blue-300'
                              : isToday
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <span>{cell.summary.totalQty}c</span>
                          <span className="hidden sm:inline text-[9px] ml-0.5 opacity-80">
                            {isFuture ? 'PO' : isToday ? 'Hari Ini' : 'Lewat'}
                          </span>
                        </div>
                        <div className="hidden sm:block text-[10px] text-slate-500 text-center font-medium truncate">
                          {formatRupiah(cell.summary.totalAmount)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RINCIAN PESANAN (MOBILE CARDS + DESKTOP TABLE)        */}
      {/* ======================================================== */}
      <div className="p-3.5 sm:p-5 border-t border-slate-200 space-y-3 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5 truncate">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <span>
                {displayMode === 'slide'
                  ? currentSlide?.tanggal ? `Tanggal ${currentSlide.tanggal}` : 'Daftar Pesanan'
                  : displayMode === 'calendar'
                  ? calSelectedDateStr ? `Tanggal ${calSelectedDateStr}` : 'Kalender Pesanan'
                  : 'Semua Pesanan'}
              </span>
            </h3>

            {/* Indicator in header */}
            {displayMode === 'slide' && currentSlide && (
              <span
                className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  currentSlide.status === 'future'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : currentSlide.status === 'today'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {currentSlide.status === 'future'
                  ? '⏳ Belum Lewat'
                  : currentSlide.status === 'today'
                  ? '🔥 Hari Ini'
                  : '✓ Sudah Lewat'}
              </span>
            )}

            <span className="text-[10px] sm:text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-semibold shrink-0">
              {activeOrdersForView.length} Pesanan
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pemesan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer font-medium"
            >
              <option value="All">Semua</option>
              <option value="Paid">Lunas</option>
              <option value="Not Paid">Belum</option>
            </select>

            {/* Sort Date Toggle */}
            <button
              type="button"
              onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}
              title={`Urutkan Tanggal: ${dateSortOrder === 'desc' ? 'Terbaru ke Terlama (DESC)' : 'Terlama ke Terbaru (ASC)'}`}
              className="py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
              <span>{dateSortOrder === 'desc' ? 'DESC ↓' : 'ASC ↑'}</span>
            </button>
          </div>
        </div>

        {/* --- A. TAMPILAN KHUSUS MOBILE: CARD LIST (HP) --- */}
        <div className="sm:hidden space-y-2.5">
          {activeOrdersForView.length === 0 ? (
            <div className="p-8 bg-white border border-dashed border-amber-300 rounded-2xl text-center space-y-2.5 shadow-2xs">
              <span className="text-3xl block">🥭</span>
              <p className="text-xs font-bold text-slate-700">Belum ada pesanan pada filter ini</p>
              <p className="text-[11px] text-slate-500">Mulai input pesanan pembeli sekarang.</p>
              <button
                type="button"
                onClick={onOpenNewOrder}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Catat Pesanan Baru</span>
              </button>
            </div>
          ) : (
            activeOrdersForView.map((ord) => {
              const isPaid = ord.status === 'Paid';
              const ordDateObj = parseDateString(ord.tanggal);
              const ordDateStatus = getDateStatus(ordDateObj);

              return (
                <div
                  key={ord.id}
                  className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-2 hover:border-amber-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{ord.namaPemesan}</span>
                        {ord.batch && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">
                            {ord.batch}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span className="font-semibold text-slate-700">{ord.tanggal}</span>

                        {ordDateStatus === 'past' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            ✓ Sudah Lewat
                          </span>
                        )}
                        {ordDateStatus === 'today' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            🔥 Hari Ini
                          </span>
                        )}
                        {ordDateStatus === 'future' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            ⏳ Belum Lewat (PO)
                          </span>
                        )}

                        <span>•</span>
                        <span>Bayar: <strong className="text-slate-700">{ord.pembayaran}</strong></span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-orange-600" />}
                      <span>{isPaid ? 'Lunas' : 'Belum'}</span>
                    </span>
                  </div>

                  {ord.note && (
                    <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 italic">
                      "{ord.note}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 font-extrabold text-xs rounded border border-amber-200">
                        {ord.qty} Cup
                      </span>
                      <span className="font-black text-xs text-slate-900">
                        {formatRupiah(ord.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleStatus(ord.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition cursor-pointer ${
                          isPaid
                            ? 'text-slate-500 hover:text-slate-800 bg-slate-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {isPaid ? 'Batal Lunas' : '✓ Lunas'}
                      </button>
                      {onEditOrder && (
                        <button
                          onClick={() => onEditOrder(ord)}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                          title="Edit Pesanan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteOrder && (
                        <button
                          onClick={() => onDeleteOrder(ord.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          title="Hapus Pesanan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- B. TAMPILAN TABLE UNTUK DESKTOP & TABLET --- */}
        <div className="hidden sm:block border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition select-none group"
                    title={`Klik untuk ubah urutan tanggal (${dateSortOrder === 'desc' ? 'DESC -> ASC' : 'ASC -> DESC'})`}
                  >
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <span>Tanggal Penjualan</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-extrabold flex items-center gap-0.5">
                        {dateSortOrder === 'desc' ? (
                          <><span>DESC</span><ArrowDown className="w-3 h-3" /></>
                        ) : (
                          <><span>ASC</span><ArrowUp className="w-3 h-3" /></>
                        )}
                      </span>
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Pemesan</th>
                  <th className="py-2.5 px-3 text-center">Jumlah Cup</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Pembayaran</th>
                  <th className="py-2.5 px-3">Catatan / Waktu</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeOrdersForView.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="max-w-xs mx-auto space-y-2.5">
                        <span className="text-3xl block">🥭</span>
                        <p className="text-xs font-bold text-slate-700">Belum ada pesanan pada filter ini</p>
                        <p className="text-[11px] text-slate-500">Mulai input pesanan pembeli sekarang.</p>
                        <button
                          type="button"
                          onClick={onOpenNewOrder}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Catat Pesanan Baru</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeOrdersForView.map((ord) => {
                    const isPaid = ord.status === 'Paid';
                    const ordDateObj = parseDateString(ord.tanggal);
                    const ordDateStatus = getDateStatus(ordDateObj);

                    return (
                      <tr key={ord.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{ord.tanggal}</div>
                          <div className="mt-0.5">
                            {ordDateStatus === 'past' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-slate-500" />
                                <span>Sudah Lewat</span>
                              </span>
                            )}
                            {ordDateStatus === 'today' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                <span>Hari Ini</span>
                              </span>
                            )}
                            {ordDateStatus === 'future' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                <Clock className="w-2.5 h-2.5 text-blue-600" />
                                <span>Belum Lewat (PO)</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {ord.namaPemesan}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-extrabold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {ord.qty} cup
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                          {formatRupiah(ord.amount)}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}
                          >
                            {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-orange-600" />}
                            <span>{isPaid ? 'Paid' : 'Not Paid'}</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                            {ord.pembayaran}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{ord.note || '-'}</span>
                            {ord.batch && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">
                                {ord.batch}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onToggleStatus(ord.id)}
                              className={`text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                                isPaid
                                  ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {isPaid ? 'Batal Lunas' : '✓ Tandai Lunas'}
                            </button>
                            {onEditOrder && (
                              <button
                                onClick={() => onEditOrder(ord)}
                                className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                                title="Edit Pesanan"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteOrder && (
                              <button
                                onClick={() => onDeleteOrder(ord.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Hapus Pesanan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
