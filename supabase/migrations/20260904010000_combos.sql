-- Combos: "any 3 mundus for a fixed price". The shopper picks N items from a
-- hand-picked pool, on-site, and pays one combo price.
--
-- Combos are retail and do land in `orders`, so an order carries one line per
-- constituent product (sharing a combo_id) rather than one opaque wrapper line.
-- That keeps stock decrement and the investor payout functions, which walk
-- orders.items looking for product_id, working unchanged.

CREATE TABLE IF NOT EXISTS combos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  image_url        TEXT,
  mobile_image_url TEXT,
  combo_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  choose_count     INTEGER NOT NULL DEFAULT 3,
  allow_duplicates BOOLEAN NOT NULL DEFAULT false,
  is_featured      BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combos_active ON combos(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_combos_featured ON combos(is_featured, display_order) WHERE is_featured;

-- The pool a shopper chooses from.
CREATE TABLE IF NOT EXISTS combo_products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id   UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (combo_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_combo_products_combo ON combo_products(combo_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_combo_products_product ON combo_products(product_id);

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS combos_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_combos_updated_at ON combos;
    CREATE TRIGGER update_combos_updated_at BEFORE UPDATE ON combos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE combos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read combos" ON combos;
CREATE POLICY "Public read combos" ON combos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read combo products" ON combo_products;
CREATE POLICY "Public read combo products" ON combo_products FOR SELECT USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_can') THEN
    DROP POLICY IF EXISTS "Admin manage combos" ON combos;
    CREATE POLICY "Admin manage combos" ON combos
      FOR ALL USING (public.admin_can('combos')) WITH CHECK (public.admin_can('combos'));

    DROP POLICY IF EXISTS "Admin manage combo products" ON combo_products;
    CREATE POLICY "Admin manage combo products" ON combo_products
      FOR ALL USING (public.admin_can('combos')) WITH CHECK (public.admin_can('combos'));
  ELSE
    DROP POLICY IF EXISTS "Admin manage combos" ON combos;
    CREATE POLICY "Admin manage combos" ON combos
      FOR ALL USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Admin manage combo products" ON combo_products;
    CREATE POLICY "Admin manage combo products" ON combo_products
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- permissions is TEXT[], not jsonb.
UPDATE admin_profiles
   SET permissions = array_append(permissions, 'combos')
 WHERE NOT ('combos' = ANY(permissions));
