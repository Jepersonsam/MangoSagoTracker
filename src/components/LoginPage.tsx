import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Calendar,
  Layers,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { loginUser } from '../services/authService';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Harap isi username atau email serta kata sandi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await loginUser(email, password, rememberMe);
    setIsLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Username atau kata sandi tidak cocok.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row selection:bg-amber-100 selection:text-amber-900">
      {/* ========================================================= */}
      {/* LEFT COLUMN: HERO FULL SCREEN BRANDING (DESKTOP/TABLET)   */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-linear-to-br from-amber-500 via-orange-500 to-amber-600 text-white p-8 sm:p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        {/* Glow & Blurred Decors */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        {/* Top Brand Tag */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
            🥭
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight">
              Mango Sago Tracker
            </h1>
            <p className="text-xs text-amber-100 font-medium">
              Live Google Sheets Sales & Expense Ecosystem
            </p>
          </div>
        </div>

        {/* Middle Feature Showcase */}
        <div className="my-auto space-y-6 relative z-10 py-8">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-amber-100 border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              Sistem Manajemen Usaha Dessert Mangga
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight">
              Pantau Penjualan & Laba Realtime Tanpa Ribet
            </h2>
            <p className="text-sm sm:text-base text-amber-100/90 max-w-lg leading-relaxed">
              Catat penjualan per tanggal, kelola pengeluaran bahan & kemasan, serta pantau buku kas otomatis yang tersinkronisasi langsung dengan Google Sheets Anda.
            </p>
          </div>

          {/* Value props list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 max-w-xl">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-200 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-white">Kalender & Slide Harian</div>
                <div className="text-[11px] text-amber-100/80">Lihat total cup terjual per tanggal tanpa scroll panjang.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-amber-200 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-white">Sync Google Sheets</div>
                <div className="text-[11px] text-amber-100/80">Tersambung langsung dengan data spreadsheet online Anda.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-amber-200 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-white">Analisis Laba & Kasir</div>
                <div className="text-[11px] text-amber-100/80">Kalkulasi omset bersih, biaya modal, dan saldo kas otomatis.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-start gap-3">
              <Layers className="w-5 h-5 text-amber-200 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-white">Hak Akses Admin</div>
                <div className="text-[11px] text-amber-100/80">Khusus admin resmi: Ebi, Tia, dan Sam.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Guarantee */}
        <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs text-amber-100 relative z-10">
          <span>🥭 Versi Produksi Aktif</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-amber-200" />
            Keamanan Sesi Terjamin
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: LOGIN FORM (OPTIMIZED FOR MOBILE & DESKTOP) */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 xl:w-5/12 bg-white flex flex-col justify-center px-5 sm:px-10 lg:px-14 py-8 sm:py-12 min-h-screen">
        <div className="w-full max-w-sm sm:max-w-md mx-auto space-y-6">
          {/* Mobile Top Brand Header (Hanya Tampil di Layar HP) */}
          <div className="lg:hidden text-center space-y-2 mb-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-200 text-3xl shadow-xs">
              🥭
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Mango Sago Tracker</h1>
            <p className="text-xs text-slate-500">Pencatatan Penjualan & Pengeluaran Realtime</p>
          </div>

          {/* Header on form */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 mb-2">
              <span>👑</span> Khusus Admin (Ebi, Tia, Sam)
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Masuk ke Dashboard
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Silakan masukkan akun admin Anda untuk mengelola sistem.
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Username / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ketik: ebi, tia, atau sam"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-60 active:scale-99 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi akun admin...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="text-center pt-4 border-t border-slate-100">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sistem privat terlindungi & data terenkripsi lokal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
