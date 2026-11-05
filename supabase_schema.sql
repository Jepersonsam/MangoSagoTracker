-- ==============================================================================
-- MANGO SAGO TRACKER - SUPABASE DATABASE SCHEMA (MULAI DARI 0 / BERSIH)
-- ==============================================================================
-- Cara Menggunakan:
-- 1. Buka dashboard Supabase (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor" di bilah kiri
-- 3. Tempel (Paste) seluruh isi skrip ini ke SQL Editor
-- 4. Klik tombol "Run" (Jalankan)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL ORDERS (Pesanan Mango Sago)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal VARCHAR(50) NOT NULL,
    nama_pemesan VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    amount NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Not Paid',
    note TEXT DEFAULT '',
    pembayaran VARCHAR(100) DEFAULT '-',
    batch VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL EXPENSES (Pengeluaran & Belanja Bahan)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal VARCHAR(50) NOT NULL,
    item VARCHAR(255) NOT NULL,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    qty NUMERIC NOT NULL DEFAULT 1,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    sisa_qty VARCHAR(50) DEFAULT '0',
    category VARCHAR(100) NOT NULL DEFAULT 'Bahan Baku',
    row_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABEL CASHFLOWS (Arus Kas Masuk & Keluar)
CREATE TABLE IF NOT EXISTS public.cashflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal VARCHAR(50) NOT NULL,
    transaksi VARCHAR(255) NOT NULL,
    debit NUMERIC NOT NULL DEFAULT 0,
    kredit NUMERIC NOT NULL DEFAULT 0,
    balance NUMERIC NOT NULL DEFAULT 0,
    tipe VARCHAR(50) NOT NULL DEFAULT 'Masuk',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABEL AUDIT_LOGS (Aktivitas Sistem & Admin)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    formatted_date VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KEAMANAN: ROW LEVEL SECURITY (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Public full access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public full access to cashflows" ON public.cashflows;
DROP POLICY IF EXISTS "Public full access to audit_logs" ON public.audit_logs;

CREATE POLICY "Public full access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to cashflows" ON public.cashflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- REALTIME REPLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'cashflows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cashflows;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;

-- KOSONGKAN TABEL (MULAI DARI 0 / FRESH START)
TRUNCATE TABLE public.orders;
TRUNCATE TABLE public.expenses;
TRUNCATE TABLE public.cashflows;

-- INISIALISASI LOG SISTEM
INSERT INTO public.audit_logs (timestamp, formatted_date, user_name, user_role, action, category, description, details) VALUES
  (NOW(), 'Inisialisasi', 'System', 'Admin', 'SYNC_SHEETS', 'Sistem', 'Database Supabase aktif bersih (Mulai dari 0)', 'Semua data penjualan, belanja, dan buku kas mulai dari nol');
