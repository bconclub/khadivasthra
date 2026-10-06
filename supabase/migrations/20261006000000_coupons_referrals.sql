-- Coupons and influencer referrals.
--
-- One coupon powers two doors: a code typed at checkout, or a referral link
-- (?ref=CODE) that remembers the code for the visitor and applies it on its
-- own. Each coupon carries who it belongs to (the influencer), so every order
-- that used it is attributed to them.
--
-- The discount is enforced in the database, not trusted from the browser: a
-- BEFORE INSERT trigger on orders recomputes it from the coupon and the
-- subtotal, and bumps the use count. The storefront only previews it.

CREATE TABLE IF NOT EXISTS coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,
  -- Who this belongs to. Shown to the shopper at checkout ("15% off via Priya").
  owner_name     TEXT NOT NULL DEFAULT '',
  owner_handle   TEXT,                        -- @instagram, optional
  source         TEXT NOT NULL DEFAULT 'influencer'
                 CHECK (source IN ('influencer','campaign','partner','other')),
  kind           TEXT NOT NULL DEFAULT 'percent'
                 CHECK (kind IN ('percent','flat')),
  value          NUMERIC(10,2) NOT NULL DEFAULT 15,   -- 15 = 15% or ₹15
  min_subtotal   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount   NUMERIC(10,2),                        -- cap for percent coupons
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  usage_limit    INTEGER,                              -- NULL = unlimited
  used_count     INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Codes are matched case-insensitively; store them upper so the index is exact.
CREATE OR REPLACE FUNCTION public.normalise_coupon_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.code := upper(regexp_replace(trim(NEW.code), '\s+', '', 'g'));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalise_coupon_code ON coupons;
CREATE TRIGGER trg_normalise_coupon_code
  BEFORE INSERT OR UPDATE OF code ON coupons
  FOR EACH ROW EXECUTE FUNCTION public.normalise_coupon_code();

CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, code);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
    CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Attribution on the order itself.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code     TEXT,
  ADD COLUMN IF NOT EXISTS discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_name   TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT CHECK (referral_source IN ('code','link'));

CREATE INDEX IF NOT EXISTS idx_orders_coupon ON orders(coupon_code) WHERE coupon_code IS NOT NULL;

-- Work out what a coupon is worth against a subtotal. Returns one row either
-- way; `valid` says whether to apply it and `message` says why not.
CREATE OR REPLACE FUNCTION public.evaluate_coupon(p_code TEXT, p_subtotal NUMERIC)
RETURNS TABLE (
  valid       BOOLEAN,
  code        TEXT,
  owner_name  TEXT,
  kind        TEXT,
  value       NUMERIC,
  discount    NUMERIC,
  message     TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c coupons%ROWTYPE;
  d NUMERIC := 0;
BEGIN
  SELECT * INTO c FROM coupons
   WHERE coupons.code = upper(regexp_replace(trim(coalesce(p_code,'')), '\s+', '', 'g'))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, 0::NUMERIC, 'That code is not valid.';
    RETURN;
  END IF;
  IF NOT c.is_active THEN
    RETURN QUERY SELECT false, c.code, c.owner_name, c.kind, c.value, 0::NUMERIC, 'That code is no longer active.';
    RETURN;
  END IF;
  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN
    RETURN QUERY SELECT false, c.code, c.owner_name, c.kind, c.value, 0::NUMERIC, 'That code is not live yet.';
    RETURN;
  END IF;
  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN
    RETURN QUERY SELECT false, c.code, c.owner_name, c.kind, c.value, 0::NUMERIC, 'That code has expired.';
    RETURN;
  END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN QUERY SELECT false, c.code, c.owner_name, c.kind, c.value, 0::NUMERIC, 'That code has been fully used.';
    RETURN;
  END IF;
  IF coalesce(p_subtotal,0) < c.min_subtotal THEN
    RETURN QUERY SELECT false, c.code, c.owner_name, c.kind, c.value, 0::NUMERIC,
      format('Add ₹%s more to use this code.', to_char(c.min_subtotal - coalesce(p_subtotal,0), 'FM999999990'));
    RETURN;
  END IF;

  IF c.kind = 'percent' THEN
    d := round(coalesce(p_subtotal,0) * c.value / 100.0, 2);
    IF c.max_discount IS NOT NULL THEN d := least(d, c.max_discount); END IF;
  ELSE
    d := least(c.value, coalesce(p_subtotal,0));
  END IF;

  RETURN QUERY SELECT true, c.code, c.owner_name, c.kind, c.value, d, NULL::TEXT;
END $$;

GRANT EXECUTE ON FUNCTION public.evaluate_coupon(TEXT, NUMERIC) TO anon, authenticated;

-- The browser cannot be trusted with the maths. Recompute discount and total
-- here from the subtotal and the coupon, and count the use.
CREATE OR REPLACE FUNCTION public.orders_apply_coupon()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.coupon_code IS NULL OR trim(NEW.coupon_code) = '' THEN
    NEW.coupon_code := NULL;
    NEW.discount := 0;
    NEW.referrer_name := NULL;
    NEW.referral_source := NULL;
  ELSE
    SELECT * INTO r FROM public.evaluate_coupon(NEW.coupon_code, NEW.subtotal);
    IF NOT r.valid THEN
      RAISE EXCEPTION 'Coupon %: %', NEW.coupon_code, r.message USING ERRCODE = 'check_violation';
    END IF;
    NEW.coupon_code := r.code;
    NEW.discount := r.discount;
    NEW.referrer_name := nullif(r.owner_name, '');
    IF NEW.referral_source IS NULL THEN NEW.referral_source := 'code'; END IF;
    UPDATE coupons SET used_count = used_count + 1 WHERE coupons.code = r.code;
  END IF;

  -- COD charge and total follow the discounted amount.
  IF NEW.payment_method = 'cod' THEN
    NEW.cod_charges := round((NEW.subtotal - NEW.discount + coalesce(NEW.shipping,0)) * 0.016);
  ELSE
    NEW.cod_charges := 0;
  END IF;
  NEW.total := NEW.subtotal - NEW.discount + coalesce(NEW.shipping,0) + coalesce(NEW.cod_charges,0);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_apply_coupon ON orders;
CREATE TRIGGER trg_orders_apply_coupon
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_apply_coupon();

-- RLS: codes are public by nature (they are handed out), but the list of all
-- coupons, limits and notes is not. Shoppers never read the table directly;
-- they go through evaluate_coupon(). Admins manage it.
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_can') THEN
    DROP POLICY IF EXISTS "Admin manage coupons" ON coupons;
    CREATE POLICY "Admin manage coupons" ON coupons
      FOR ALL USING (public.admin_can('offers')) WITH CHECK (public.admin_can('offers'));
  ELSE
    DROP POLICY IF EXISTS "Admin manage coupons" ON coupons;
    CREATE POLICY "Admin manage coupons" ON coupons
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- permissions is TEXT[], not jsonb.
UPDATE admin_profiles
   SET permissions = array_append(permissions, 'offers')
 WHERE NOT ('offers' = ANY(permissions));
