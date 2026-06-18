-- Design Investor Portal
-- ---------------------------------------------------------------------------
-- Adds the investor side of the platform:
--   * investable bifurcation + design metadata on products
--   * investor_profiles (auth-linked, like admin_profiles)
--   * investments (M:N investor <-> design, per-unit payout model)
--   * settlements (manual + scheduled disbursements)
--   * investor_documents (private storage), notifications, activity_log
--   * SECURITY DEFINER reporting functions (no raw order access for investors)
--   * RLS scoping every table to the calling investor (auth.uid())
--
-- Payout model (tunable per investment):
--   earnings = LEAST(units_sold, units_allocated) * per_unit_payout
--   default per_unit_payout = 75 (each unit sells at cost + Rs.75 margin)
-- ---------------------------------------------------------------------------

-- 1. Products: investable bifurcation + design fields -------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_investable        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS design_name          TEXT,
  ADD COLUMN IF NOT EXISTS design_code          TEXT,          -- human "Design ID" e.g. DSN-001
  ADD COLUMN IF NOT EXISTS design_preview_url   TEXT,          -- Design Photo (distinct from product photo)
  ADD COLUMN IF NOT EXISTS product_type         TEXT,          -- single_mundu | double_mundu
  ADD COLUMN IF NOT EXISTS manufactured_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost            NUMERIC(10,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_product_type_check
      CHECK (product_type IS NULL OR product_type IN ('single_mundu','double_mundu'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_investable ON products(is_investable) WHERE is_investable = true;

-- 2. Investor profiles (auth-linked) -----------------------------------------
CREATE SEQUENCE IF NOT EXISTS investor_code_seq START 1;

CREATE TABLE IF NOT EXISTS investor_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_code TEXT UNIQUE,
  full_name     TEXT NOT NULL DEFAULT '',
  mobile        TEXT,
  email         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- auto-generate investor_code (INV-00001) on insert when not supplied
CREATE OR REPLACE FUNCTION public.set_investor_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.investor_code IS NULL OR NEW.investor_code = '' THEN
    NEW.investor_code := 'INV-' || LPAD(nextval('investor_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_investor_code ON investor_profiles;
CREATE TRIGGER trg_set_investor_code
  BEFORE INSERT ON investor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_investor_code();

-- 3. Investments (M:N, per-unit payout) --------------------------------------
CREATE TABLE IF NOT EXISTS investments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id          UUID NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  start_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date             DATE,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  amount_invested      NUMERIC(12,2) NOT NULL DEFAULT 0,
  units_allocated      INTEGER NOT NULL DEFAULT 0,
  per_unit_payout      NUMERIC(10,2) NOT NULL DEFAULT 75,
  next_settlement_date DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investments_investor ON investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_product ON investments(product_id);

-- 4. Settlements -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id   UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  period_start    DATE,
  period_end      DATE,
  units_settled   INTEGER NOT NULL DEFAULT 0,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date   DATE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlements_investment ON settlements(investment_id);

-- 5. Investor documents ------------------------------------------------------
CREATE TABLE IF NOT EXISTS investor_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id   UUID NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE SET NULL,
  doc_type      TEXT NOT NULL DEFAULT 'other'
                  CHECK (doc_type IN ('agreement','settlement_statement','sales_report','tax_gst','other')),
  title         TEXT NOT NULL DEFAULT '',
  file_path     TEXT NOT NULL,           -- object path within investor-documents bucket
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investor_documents_investor ON investor_documents(investor_id);

-- 6. Notifications -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_investor ON notifications(investor_id, is_read);

-- 7. Activity / audit log ----------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('admin','investor','system')),
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  UUID,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_actor ON activity_log(actor_id, created_at DESC);

-- updated_at triggers (reuse project fn) -------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_investor_profiles_updated_at ON investor_profiles;
    CREATE TRIGGER update_investor_profiles_updated_at BEFORE UPDATE ON investor_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
    CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 8. Helper: is the caller an active investor? -------------------------------
CREATE OR REPLACE FUNCTION public.is_investor()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM investor_profiles WHERE id = auth.uid() AND is_active
  );
$$;

-- A generic "is this caller any active admin" helper (some tables aren't tied
-- to a single admin section). Reuses admin_profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active
  );
$$;

-- 9. Reporting functions (SECURITY DEFINER: investors never read raw orders) --

-- Per-investment dashboard rollup for the calling investor.
CREATE OR REPLACE FUNCTION public.get_investor_dashboard()
RETURNS TABLE (
  investment_id        UUID,
  product_id           UUID,
  design_code          TEXT,
  design_name          TEXT,
  product_name         TEXT,
  product_image        TEXT,
  design_preview       TEXT,
  category_name        TEXT,
  product_type         TEXT,
  status               TEXT,
  start_date           DATE,
  end_date             DATE,
  next_settlement_date DATE,
  amount_invested      NUMERIC,
  units_allocated      INTEGER,
  per_unit_payout      NUMERIC,
  manufactured_quantity INTEGER,
  remaining_stock      INTEGER,
  units_sold           BIGINT,
  sales_value          NUMERIC,
  earnings             NUMERIC,
  settled_amount       NUMERIC,
  pending_amount       NUMERIC,
  progress_pct         NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    inv.id,
    p.id,
    p.design_code,
    p.design_name,
    p.name,
    p.image_url,
    p.design_preview_url,
    c.name,
    p.product_type,
    inv.status,
    inv.start_date,
    inv.end_date,
    inv.next_settlement_date,
    inv.amount_invested,
    inv.units_allocated,
    inv.per_unit_payout,
    p.manufactured_quantity,
    p.stock_quantity,
    COALESCE(s.units_sold, 0),
    COALESCE(s.sales_value, 0),
    LEAST(COALESCE(s.units_sold, 0), inv.units_allocated) * inv.per_unit_payout AS earnings,
    COALESCE(st.settled, 0) AS settled_amount,
    GREATEST(
      LEAST(COALESCE(s.units_sold, 0), inv.units_allocated) * inv.per_unit_payout
        - COALESCE(st.settled, 0), 0
    ) AS pending_amount,
    CASE WHEN inv.units_allocated > 0
      THEN ROUND(LEAST(COALESCE(s.units_sold, 0), inv.units_allocated)::numeric
                 / inv.units_allocated * 100, 2)
      ELSE 0 END AS progress_pct
  FROM investments inv
  JOIN products p ON p.id = inv.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM((item->>'quantity')::int), 0)::bigint AS units_sold,
           COALESCE(SUM((item->>'subtotal')::numeric), 0)     AS sales_value
    FROM orders o, jsonb_array_elements(o.items) item
    WHERE (item->>'product_id')::uuid = p.id
      AND o.status <> 'cancelled'
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(amount), 0) AS settled
    FROM settlements stt
    WHERE stt.investment_id = inv.id AND stt.status = 'paid'
  ) st ON true
  WHERE inv.investor_id = auth.uid()
  ORDER BY inv.created_at DESC;
$$;

-- Date-wise sales trend for one design. Guarded: caller must hold an
-- investment in that design, or be an admin.
CREATE OR REPLACE FUNCTION public.get_design_sales_trend(
  p_product_id UUID,
  p_granularity TEXT DEFAULT 'day'
)
RETURNS TABLE (period DATE, units BIGINT, sales_value NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    date_trunc(CASE WHEN p_granularity = 'month' THEN 'month' ELSE 'day' END,
               o.created_at)::date AS period,
    COALESCE(SUM((item->>'quantity')::int), 0)::bigint,
    COALESCE(SUM((item->>'subtotal')::numeric), 0)
  FROM orders o, jsonb_array_elements(o.items) item
  WHERE (item->>'product_id')::uuid = p_product_id
    AND o.status <> 'cancelled'
    AND (
      EXISTS (SELECT 1 FROM investments i
              WHERE i.product_id = p_product_id AND i.investor_id = auth.uid())
      OR public.is_admin()
    )
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_investor_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_design_sales_trend(UUID, TEXT) TO authenticated;

-- 10. RLS --------------------------------------------------------------------
ALTER TABLE investor_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log       ENABLE ROW LEVEL SECURITY;

-- investor_profiles: investor reads own; admins (with 'investors') manage all
DROP POLICY IF EXISTS "investor read own profile" ON investor_profiles;
CREATE POLICY "investor read own profile" ON investor_profiles
  FOR SELECT USING (id = auth.uid() OR public.admin_can('investors'));
DROP POLICY IF EXISTS "admin manage investor profiles" ON investor_profiles;
CREATE POLICY "admin manage investor profiles" ON investor_profiles
  FOR ALL USING (public.admin_can('investors')) WITH CHECK (public.admin_can('investors'));

-- investments
DROP POLICY IF EXISTS "investor read own investments" ON investments;
CREATE POLICY "investor read own investments" ON investments
  FOR SELECT USING (investor_id = auth.uid() OR public.admin_can('investors'));
DROP POLICY IF EXISTS "admin manage investments" ON investments;
CREATE POLICY "admin manage investments" ON investments
  FOR ALL USING (public.admin_can('investors')) WITH CHECK (public.admin_can('investors'));

-- settlements (investor reads settlements for their own investments)
DROP POLICY IF EXISTS "investor read own settlements" ON settlements;
CREATE POLICY "investor read own settlements" ON settlements
  FOR SELECT USING (
    public.admin_can('investors')
    OR EXISTS (SELECT 1 FROM investments i
               WHERE i.id = settlements.investment_id AND i.investor_id = auth.uid())
  );
DROP POLICY IF EXISTS "admin manage settlements" ON settlements;
CREATE POLICY "admin manage settlements" ON settlements
  FOR ALL USING (public.admin_can('investors')) WITH CHECK (public.admin_can('investors'));

-- investor_documents
DROP POLICY IF EXISTS "investor read own documents" ON investor_documents;
CREATE POLICY "investor read own documents" ON investor_documents
  FOR SELECT USING (investor_id = auth.uid() OR public.admin_can('investors'));
DROP POLICY IF EXISTS "admin manage documents" ON investor_documents;
CREATE POLICY "admin manage documents" ON investor_documents
  FOR ALL USING (public.admin_can('investors')) WITH CHECK (public.admin_can('investors'));

-- notifications (investor can read + mark own read; admin manages all)
DROP POLICY IF EXISTS "investor read own notifications" ON notifications;
CREATE POLICY "investor read own notifications" ON notifications
  FOR SELECT USING (investor_id = auth.uid() OR public.admin_can('investors'));
DROP POLICY IF EXISTS "investor update own notifications" ON notifications;
CREATE POLICY "investor update own notifications" ON notifications
  FOR UPDATE USING (investor_id = auth.uid()) WITH CHECK (investor_id = auth.uid());
DROP POLICY IF EXISTS "admin manage notifications" ON notifications;
CREATE POLICY "admin manage notifications" ON notifications
  FOR ALL USING (public.admin_can('investors')) WITH CHECK (public.admin_can('investors'));

-- activity_log (investor reads own rows; admin reads all; authenticated insert)
DROP POLICY IF EXISTS "read own or all activity" ON activity_log;
CREATE POLICY "read own or all activity" ON activity_log
  FOR SELECT USING (actor_id = auth.uid() OR public.admin_can('investors'));
DROP POLICY IF EXISTS "authenticated insert activity" ON activity_log;
CREATE POLICY "authenticated insert activity" ON activity_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 11. Private storage bucket for investor documents --------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('investor-documents', 'investor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Files are stored under "<investor_id>/<filename>". Investor reads own folder;
-- admins with 'investors' manage everything.
DROP POLICY IF EXISTS "Investor read own documents" ON storage.objects;
CREATE POLICY "Investor read own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'investor-documents'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.admin_can('investors'))
  );
DROP POLICY IF EXISTS "Admin manage investor documents" ON storage.objects;
CREATE POLICY "Admin manage investor documents" ON storage.objects
  FOR ALL USING (bucket_id = 'investor-documents' AND public.admin_can('investors'))
  WITH CHECK (bucket_id = 'investor-documents' AND public.admin_can('investors'));
