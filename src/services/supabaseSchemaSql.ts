export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- MANGO SAGO TRACKER - SUPABASE DATABASE SCHEMA & INITIAL DATA
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
    sisa_qty VARCHAR(50) DEFAULT '',
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

-- DATA AWAL (SEED DATA)
INSERT INTO public.orders (tanggal, nama_pemesan, qty, amount, status, note, pembayaran, batch)
SELECT * FROM (VALUES
  ('26 Oct 26', 'Della', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('26 Oct 26', 'Milla', 1, 21000, 'Paid', 'Sudah diterima', 'Cash', NULL),
  ('26 Oct 26', 'Citra', 3, 63000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('26 Oct 26', 'Anggreta', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('26 Oct 26', 'Andrew Doloksaribu', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('26 Oct 26', 'Hayu', 5, 100000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('26 Oct 26', 'Caca', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'Finance Dhost', 6, 126000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'SMT Dhost', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'Sales Dhost', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'Ellen', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'Bg Barth', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'Tuti', 3, 63000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'Bayu', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('27 Oct 26', 'El', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Pak Dex Dhost', 5, 105000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Pak Ismart Dhost', 10, 210000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Oslo', 1, 21000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Mba Tari', 2, 42000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Ci Santina Dhost', 2, 42000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Sasa', 1, 21000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Farid', 1, 21000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Mba Atty', 1, 21000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Anggreta', 3, 63000, 'Not Paid', 'Belum diterima', '-', 'Malam'),
  ('3 Nov 26', 'Renold', 2, 42000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Teman Ellen', 4, 84000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Ka Oik', 2, 21000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Ka Citra', 2, 42000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('3 Nov 26', 'Mba Juni Dhost', 3, 63000, 'Not Paid', 'Belum diterima', '-', 'Pagi'),
  ('5 Nov 26', 'Ka Niken', 1, 21000, 'Not Paid', 'Belum diterima', '-', NULL)
) AS v(tanggal, nama_pemesan, qty, amount, status, note, pembayaran, batch)
WHERE NOT EXISTS (SELECT 1 FROM public.orders LIMIT 1);

INSERT INTO public.expenses (tanggal, item, unit_price, qty, total_amount, sisa_qty, category, row_index)
SELECT * FROM (VALUES
  ('25 Oct 26', 'Evaporasi Carnation', 19200, 5, 96000, '1', 'Bahan Baku', 2),
  ('25 Oct 26', 'Gula Pasir', 18, 1000, 17500, '0.75', 'Bahan Baku', 3),
  ('25 Oct 26', 'Kental Manis Carnation', 1308, 6, 7850, '5', 'Bahan Baku', 4),
  ('25 Oct 26', 'Nutrijell', 5115, 6, 30690, '1', 'Bahan Baku', 5),
  ('25 Oct 26', 'Mangga Golek', 3600, 5, 18000, '0', 'Bahan Baku', 6),
  ('25 Oct 26', 'Mangga Harum Manis', 3750, 4, 15000, '1', 'Bahan Baku', 7),
  ('25 Oct 26', 'Sagu Mutiara', 17000, 1, 17000, '0', 'Bahan Baku', 8),
  ('25 Oct 26', 'Nata Coco', 19600, 1, 19600, '0', 'Bahan Baku', 9),
  ('25 Oct 26', 'Plastik 20x40', 571, 28, 15996, '26', 'Kemasan', 10),
  ('25 Oct 26', 'Plastik 15x33', 381, 42, 15996, '33', 'Kemasan', 11),
  ('25 Oct 26', 'Sendok Plastik Putih', 310, 50, 15500, '18', 'Kemasan', 12),
  ('25 Oct 26', 'Sendok Plastik HItam', 443, 50, 22161, '50', 'Kemasan', 13),
  ('25 Oct 26', 'Thinwall', 516, 25, 12904, '0', 'Kemasan', 14),
  ('26 Oct 26', 'Cup 25 pcs', 703, 25, 17580, '18', 'Kemasan', 15),
  ('26 Oct 26', 'Mangga Golek', 18000, 1, 18000, '0', 'Bahan Baku', 16),
  ('26 Oct 26', 'Mangga Harum Manis', 14000, 1, 14000, '0', 'Bahan Baku', 17),
  ('26 Oct 26', 'Nata Coco', 19600, 1, 19600, '0', 'Bahan Baku', 18),
  ('26 Oct 26', 'Sagu Mutiara', 40, 250, 10000, '125', 'Bahan Baku', 19),
  ('26 Oct 26', 'Nutrijell Mangga', 4000, 1, 4000, '1', 'Bahan Baku', 20),
  ('26 Oct 26', 'Gas', 5000, 2, 10000, '0', 'Operasional', 21),
  ('26 Oct 26', 'Air', 5000, 2, 10000, '0', 'Operasional', 22),
  ('26 Oct 26', 'Stiker Bulat', 98, 98, 9604, '66', 'Kemasan', 23),
  ('26 Oct 26', 'Stiker Panjang', 286, 49, 14014, '49', 'Kemasan', 24),
  ('26 Oct 26', 'Stiker Kotak', 110, 33, 3630, '33', 'Kemasan', 25)
) AS v(tanggal, item, unit_price, qty, total_amount, sisa_qty, category, row_index)
WHERE NOT EXISTS (SELECT 1 FROM public.expenses LIMIT 1);

INSERT INTO public.cashflows (tanggal, transaksi, debit, kredit, balance, tipe)
SELECT * FROM (VALUES
  ('25 Oct 26', 'Mangga', 0, 33000, -33000, 'Keluar'),
  ('25 Oct 26', 'Susu Evaporasi', 0, 96000, -129000, 'Keluar'),
  ('25 Oct 26', 'Susu SKM', 0, 7850, -136850, 'Keluar'),
  ('25 Oct 26', 'Jelly Mangga', 0, 30690, -167540, 'Keluar'),
  ('26 Oct 26', 'Mila', 21000, 0, -283197, 'Masuk'),
  ('26 Oct 26', 'Citra', 63000, 0, -220197, 'Masuk'),
  ('26 Oct 26', 'Andrew', 42000, 0, -178197, 'Masuk'),
  ('26 Oct 26', 'Hayu', 100000, 0, -78197, 'Masuk'),
  ('27 Oct 26', 'Finance Dhost', 126000, 0, 1375, 'Masuk'),
  ('27 Oct 26', 'SMT Dhost', 42000, 0, 43375, 'Masuk'),
  ('27 Oct 26', 'Sales Dhost', 42000, 0, 85375, 'Masuk'),
  ('27 Oct 26', 'Ellen', 21000, 0, 106375, 'Masuk'),
  ('27 Oct 26', 'Bg Barth', 21000, 0, 127375, 'Masuk'),
  ('27 Oct 26', 'Tuti', 63000, 0, 190375, 'Masuk'),
  ('27 Oct 26', 'Bayu', 21000, 0, 211375, 'Masuk'),
  ('27 Oct 26', 'El', 21000, 0, 232375, 'Masuk')
) AS v(tanggal, transaksi, debit, kredit, balance, tipe)
WHERE NOT EXISTS (SELECT 1 FROM public.cashflows LIMIT 1);
`;
