-- Wholesale (trade) channel.
--
-- Approved buyers see trade prices on a chosen set of products, each with its
-- own minimum order quantity, and submit an *enquiry* rather than paying.
-- Enquiries deliberately live in their own table: investor payouts are computed
-- by walking orders.items, so a wholesale sale written into `orders` would
-- inflate what investors are owed.

-- 1. Product-level wholesale flags (mirrors the investable flag group) --------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_wholesale      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wholesale_price   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS wholesale_min_qty INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_products_wholesale
  ON products(is_wholesale) WHERE is_wholesale = true;

-- 2. Master switch ------------------------------------------------------------
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS wholesale_enabled BOOLEAN NOT NULL DEFAULT false;

-- 3. Trade accounts -----------------------------------------------------------
-- Auth-linked like investor_profiles, so `id = auth.uid()` works in policies.
-- is_active is the approval gate: a buyer registers, an admin flips it on.
CREATE SEQUENCE IF NOT EXISTS wholesale_code_seq START 1;

CREATE TABLE IF NOT EXISTS wholesale_accounts (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_code  TEXT UNIQUE,
  business_name TEXT NOT NULL DEFAULT '',
  contact_name  TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  email         TEXT,
  gst_number    TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  pincode       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_wholesale_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.account_code IS NULL OR NEW.account_code = '' THEN
    NEW.account_code := 'WS-' || LPAD(nextval('wholesale_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_wholesale_code ON wholesale_accounts;
CREATE TRIGGER trg_set_wholesale_code
  BEFORE INSERT ON wholesale_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_wholesale_code();

-- 4. Enquiries ----------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS wholesale_enquiry_seq START 1;

CREATE TABLE IF NOT EXISTS wholesale_enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number  TEXT UNIQUE,
  account_id      UUID NOT NULL REFERENCES wholesale_accounts(id) ON DELETE CASCADE,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_count      INTEGER NOT NULL DEFAULT 0,
  estimated_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','quoted','won','lost')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_enquiries_account
  ON wholesale_enquiries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wholesale_enquiries_status
  ON wholesale_enquiries(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_wholesale_enquiry_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.enquiry_number IS NULL OR NEW.enquiry_number = '' THEN
    NEW.enquiry_number := 'WE-' || LPAD(nextval('wholesale_enquiry_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_wholesale_enquiry_number ON wholesale_enquiries;
CREATE TRIGGER trg_set_wholesale_enquiry_number
  BEFORE INSERT ON wholesale_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_wholesale_enquiry_number();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_wholesale_accounts_updated_at ON wholesale_accounts;
    CREATE TRIGGER update_wholesale_accounts_updated_at BEFORE UPDATE ON wholesale_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_wholesale_enquiries_updated_at ON wholesale_enquiries;
    CREATE TRIGGER update_wholesale_enquiries_updated_at BEFORE UPDATE ON wholesale_enquiries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 5. RLS ----------------------------------------------------------------------
ALTER TABLE wholesale_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_enquiries ENABLE ROW LEVEL SECURITY;

-- A buyer sees only their own row. Trade prices are never public: there is no
-- public SELECT policy here at all.
DROP POLICY IF EXISTS "Buyer reads own account" ON wholesale_accounts;
CREATE POLICY "Buyer reads own account" ON wholesale_accounts
  FOR SELECT USING (id = auth.uid());

-- The one deliberate exception: a signed-up user may create their own row,
-- and only in the un-approved state.
DROP POLICY IF EXISTS "Self register" ON wholesale_accounts;
CREATE POLICY "Self register" ON wholesale_accounts
  FOR INSERT WITH CHECK (id = auth.uid() AND is_active = false);

DROP POLICY IF EXISTS "Buyer reads own enquiries" ON wholesale_enquiries;
CREATE POLICY "Buyer reads own enquiries" ON wholesale_enquiries
  FOR SELECT USING (account_id = auth.uid());

-- Only an approved account may raise an enquiry.
DROP POLICY IF EXISTS "Approved buyer submits enquiry" ON wholesale_enquiries;
CREATE POLICY "Approved buyer submits enquiry" ON wholesale_enquiries
  FOR INSERT WITH CHECK (
    account_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM wholesale_accounts w
       WHERE w.id = auth.uid() AND w.is_active
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_can') THEN
    DROP POLICY IF EXISTS "Admin manage wholesale accounts" ON wholesale_accounts;
    CREATE POLICY "Admin manage wholesale accounts" ON wholesale_accounts
      FOR ALL USING (public.admin_can('wholesale')) WITH CHECK (public.admin_can('wholesale'));

    DROP POLICY IF EXISTS "Admin manage wholesale enquiries" ON wholesale_enquiries;
    CREATE POLICY "Admin manage wholesale enquiries" ON wholesale_enquiries
      FOR ALL USING (public.admin_can('wholesale')) WITH CHECK (public.admin_can('wholesale'));
  ELSE
    DROP POLICY IF EXISTS "Admin manage wholesale accounts" ON wholesale_accounts;
    CREATE POLICY "Admin manage wholesale accounts" ON wholesale_accounts
      FOR ALL USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Admin manage wholesale enquiries" ON wholesale_enquiries;
    CREATE POLICY "Admin manage wholesale enquiries" ON wholesale_enquiries
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 6. Existing admins keep access. permissions is TEXT[], not jsonb — the jsonb
-- || operator throws a type error and rolls the whole migration back.
UPDATE admin_profiles
   SET permissions = array_append(permissions, 'wholesale')
 WHERE NOT ('wholesale' = ANY(permissions));
