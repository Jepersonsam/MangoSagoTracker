-- ==============================================================================
-- MANGO SAGO TRACKER - SUPABASE DATABASE SCHEMA & INITIAL DATA (LATEST LIVE SNAPSHOT)
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

-- KOSONGKAN TABEL SEBELUM MENGISI ULANG (RESET DENGAN DATA TERBARU)
TRUNCATE TABLE public.orders;
TRUNCATE TABLE public.expenses;
TRUNCATE TABLE public.cashflows;

-- SEED ORDERS (39 baris pesanan terbaru)
INSERT INTO public.orders (tanggal, nama_pemesan, qty, amount, status, note, pembayaran, batch) VALUES
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
  ('3 Nov 26', 'Pak Dex Dhost', 5, 105000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Pak Ismart Dhost', 10, 210000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Oslo', 1, 21000, 'Not Paid', 'Sudah diterima', '-', NULL),
  ('3 Nov 26', 'Mba Tari', 2, 42000, 'Paid', 'Belum diterima', 'BCA', NULL),
  ('3 Nov 26', 'Ci Santina Dhost', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Sasa', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Farid', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Mba Atty', 1, 21000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Anggreta', 3, 63000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Renold', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Teman Ellen', 4, 84000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Ka Oik', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Ka Citra', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Mba Juni Dhost', 3, 63000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('3 Nov 26', 'Tian', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('5 Nov 26', 'Ka Niken', 1, 21000, 'Not Paid', 'Belum diterima', '-', NULL),
  ('5 Nov 26', 'Ka Nancy', 5, 105000, 'Not Paid', 'Belum diterima', '-', NULL),
  ('5 Nov 26', 'Mba Pipit', 1, 21000, 'Not Paid', 'Belum diterima', '-', NULL),
  ('5 Nov 26', 'Tata', 1, 21000, 'Not Paid', 'Belum diterima', '-', NULL),
  ('5 Nov 26', 'Oslo', 7, 147000, 'Not Paid', 'Sudah diterima', '-', NULL),
  ('5 Nov 26', 'Ka Lugina', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('5 Nov 26', 'Iga', 2, 42000, 'Paid', 'Sudah diterima', 'BCA', NULL),
  ('5 Nov 26', 'Ka Oik', 2, 42000, 'Not Paid', 'Belum diterima', '-', NULL),
  ('5 Nov 26', 'Ci Santina Dhost', 2, 42000, 'Not Paid', 'Belum diterima', '-', NULL);

-- SEED EXPENSES (18 baris pengeluaran & sisa stok terbaru)
INSERT INTO public.expenses (tanggal, item, unit_price, qty, total_amount, sisa_qty, category, row_index) VALUES
  ('25 Oct 26', 'Gula Pasir', 18, 1000, 17500, '0.21', 'Bahan Baku', 2),
  ('25 Oct 26', 'Kental Manis Carnation', 1308, 6, 7850, '4', 'Bahan Baku', 3),
  ('25 Oct 26', 'Plastik 20x40', 571, 28, 15996, '11', 'Kemasan', 4),
  ('25 Oct 26', 'Plastik 15x33', 381, 42, 15996, '23', 'Kemasan', 5),
  ('25 Oct 26', 'Sendok Plastik HItam', 443, 50, 22161, '21', 'Kemasan', 6),
  ('26 Oct 26', 'Stiker Bulat', 98, 98, 9604, '2', 'Kemasan', 8),
  ('26 Oct 26', 'Stiker Panjang', 286, 49, 14014, '49', 'Kemasan', 9),
  ('26 Oct 26', 'Stiker Kotak', 110, 33, 3630, '33', 'Kemasan', 10),
  ('1 Nov 26', 'Nutrijell', 4583, 12, 55000, '4', 'Bahan Baku', 12),
  ('1 Nov 26', 'Cup', 636, 50, 31822, '4', 'Kemasan', 13),
  ('1 Nov 26', 'Gula', 18, 1000, 17500, '750', 'Bahan Baku', 14),
  ('1 Nov 26', 'Mangga harum Manis', 5199, 16, 83191, '8', 'Bahan Baku', 15),
  ('2 Nov 26', 'Kabel Ties', 0, 100, 0, '83', 'Kemasan', 16),
  ('2 Nov 26', 'Paper Leakproof', 0, 100, 0, '58', 'Kemasan', 17),
  ('4 Nov 26', 'Mangga Golek', 2778, 9, 25000, '0', 'Bahan Baku', 19),
  ('4 Nov 26', 'Evaporasi', 19900, 2, 39800, '1', 'Bahan Baku', 20),
  ('4 Nov 26', 'Sagu Mutiara', 20, 250, 10000, '150', 'Bahan Baku', 21),
  ('4 Nov 26', 'Natadecoco', 23800, 1, 23800, '0', 'Bahan Baku', 22);

-- SEED CASHFLOWS (71 baris buku kas terbaru)
INSERT INTO public.cashflows (tanggal, transaksi, debit, kredit, balance, tipe) VALUES
  ('25 Oct 26', 'Mangga', 0, 33000, -33000, 'Keluar'),
  ('25 Oct 26', 'Susu Evaporasi', 0, 96000, -129000, 'Keluar'),
  ('25 Oct 26', 'Susu SKM', 0, 7850, -136850, 'Keluar'),
  ('25 Oct 26', 'Jelly Mangga', 0, 30690, -167540, 'Keluar'),
  ('25 Oct 26', 'Sagu Mutiara', 0, 17000, -184540, 'Keluar'),
  ('25 Oct 26', 'Gula', 0, 17500, -202040, 'Keluar'),
  ('25 Oct 26', 'Nata De Coco', 0, 19600, -221640, 'Keluar'),
  ('25 Oct 26', 'Cup', 0, 12904, -234544, 'Keluar'),
  ('25 Oct 26', 'Plastik', 0, 31992, -266536, 'Keluar'),
  ('25 Oct 26', 'Sendok', 0, 37661, -304197, 'Keluar'),
  ('26 Oct 26', 'Mila', 21000, 0, -283197, 'Masuk'),
  ('26 Oct 26', 'Citra', 63000, 0, -220197, 'Masuk'),
  ('26 Oct 26', 'Andrew', 42000, 0, -178197, 'Masuk'),
  ('26 Oct 26', 'Hayu', 100000, 0, -78197, 'Masuk'),
  ('26 Oct 26', 'Caca', 21000, 0, -57197, 'Masuk'),
  ('26 Oct 26', 'Della', 21000, 0, -36197, 'Masuk'),
  ('26 Oct 26', 'Anggreta', 42000, 0, 5803, 'Masuk'),
  ('26 Oct 26', 'Thinwall', 0, 17580, -11777, 'Keluar'),
  ('26 Oct 26', 'Mangga Golek', 0, 18000, -29777, 'Keluar'),
  ('26 Oct 26', 'Mangga Harum Manis', 0, 14000, -43777, 'Keluar'),
  ('26 Oct 26', 'Nata Coco', 0, 19600, -63377, 'Keluar'),
  ('26 Oct 26', 'Sagu Mutiara', 0, 10000, -73377, 'Keluar'),
  ('26 Oct 26', 'Nutrijell Mangga', 0, 4000, -77377, 'Keluar'),
  ('26 Oct 26', 'Gas', 0, 10000, -87377, 'Keluar'),
  ('26 Oct 26', 'Air Minum', 0, 10000, -97377, 'Keluar'),
  ('26 Oct 26', 'Stiker', 0, 27248, -124625, 'Keluar'),
  ('27 Oct 26', 'Finance Dhost', 126000, 0, 1375, 'Masuk'),
  ('27 Oct 26', 'SMT Dhost', 42000, 0, 43375, 'Masuk'),
  ('27 Oct 26', 'Sales Dhost', 42000, 0, 85375, 'Masuk'),
  ('27 Oct 26', 'Ellen', 21000, 0, 106375, 'Masuk'),
  ('27 Oct 26', 'Bg Barth', 21000, 0, 127375, 'Masuk'),
  ('27 Oct 26', 'Tuti', 63000, 0, 190375, 'Masuk'),
  ('27 Oct 26', 'Bayu', 21000, 0, 211375, 'Masuk'),
  ('27 Oct 26', 'El', 21000, 0, 232375, 'Masuk'),
  ('1 Nov 26', 'Nutrijell Mangga', 0, 55000, 177375, 'Keluar'),
  ('1 Nov 26', 'Sagu Mutiara', 0, 20000, 157375, 'Keluar'),
  ('1 Nov 26', 'Mangga Harum Manis + Golek', 0, 21000, 136375, 'Keluar'),
  ('1 Nov 26', 'Mangga Harum Manis', 0, 83191, 53184, 'Keluar'),
  ('1 Nov 26', 'Mangga Golek', 0, 46000, 7184, 'Keluar'),
  ('1 Nov 26', 'Susu Evaporasi', 0, 139300, -132116, 'Keluar'),
  ('1 Nov 26', 'Gula', 0, 17500, -149616, 'Keluar'),
  ('2 Nov 26', 'Nata De Coco', 0, 39200, -188816, 'Keluar'),
  ('2 Nov 26', 'Aqua', 0, 25000, -213816, 'Keluar'),
  ('3 Nov 26', 'Renold', 42000, 0, -171816, 'Masuk'),
  ('3 Nov 26', 'Farid', 21000, 0, -150816, 'Masuk'),
  ('3 Nov 26', 'Pak Dex Dhost', 105000, 0, -45816, 'Masuk'),
  ('3 Nov 26', 'Pak Ismart Dhost', 210000, 0, 164184, 'Masuk'),
  ('3 Nov 26', 'Oslo', 0, 0, 164184, 'Keluar'),
  ('3 Nov 26', 'Mba Tari', 21000, 0, 185184, 'Masuk'),
  ('3 Nov 26', 'Ci Santina Dhost', 42000, 0, 227184, 'Masuk'),
  ('3 Nov 26', 'Sasa', 21000, 0, 248184, 'Masuk'),
  ('3 Nov 26', 'Mba Atty', 21000, 0, 269184, 'Masuk'),
  ('3 Nov 26', 'Anggreta', 63000, 0, 332184, 'Masuk'),
  ('3 Nov 26', 'Teman Ellen', 84000, 0, 416184, 'Masuk'),
  ('3 Nov 26', 'Ka Oik', 42000, 0, 458184, 'Masuk'),
  ('3 Nov 26', 'Ka Citra', 42000, 0, 500184, 'Masuk'),
  ('3 Nov 26', 'Mba Juni Dhost', 63000, 0, 563184, 'Masuk'),
  ('3 Nov 26', 'Tian', 42000, 0, 605184, 'Masuk'),
  ('3 Nov 26', 'Evaporasi', 0, 39800, 565384, 'Keluar'),
  ('3 Nov 26', 'Nata De Coco', 0, 23800, 541584, 'Keluar'),
  ('4 Nov 26', 'Mangga Golek', 0, 25000, 516584, 'Keluar'),
  ('4 Nov 26', 'Sagu Mutiara', 0, 10000, 506584, 'Keluar'),
  ('5 Nov 26', 'Ka Niken', 0, 0, 506584, 'Keluar'),
  ('5 Nov 26', 'Ka Nancy', 0, 0, 506584, 'Keluar'),
  ('5 Nov 26', 'Mba Pipit', 0, 0, 506584, 'Keluar'),
  ('5 Nov 26', 'Tata', 0, 0, 506584, 'Keluar'),
  ('5 Nov 26', 'Oslo', 0, 0, 506584, 'Keluar'),
  ('5 Nov 26', 'Ka Lugina', 42000, 0, 548584, 'Masuk'),
  ('5 Nov 26', 'Iga', 42000, 0, 590584, 'Masuk'),
  ('5 Nov 26', 'Ka Oik', 0, 0, 590584, 'Keluar'),
  ('5 Nov 26', 'Ci Santina Dhost', 0, 0, 590584, 'Keluar');

-- SEED AUDIT LOGS
INSERT INTO public.audit_logs (timestamp, formatted_date, user_name, user_role, action, category, description, details) VALUES
  (NOW(), 'Inisialisasi Sistem', 'System', 'Admin', 'SYNC_SHEETS', 'Sistem', 'Sinkronisasi lengkap database Supabase dengan snapshot Google Spreadsheet', 'Orders: 39, Expenses: 18, Cashflows: 71');
