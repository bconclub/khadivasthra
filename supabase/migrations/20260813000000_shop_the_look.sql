-- "Shop the Look" — curated outfits that behave like a shop surface but are
-- their own thing: a look is a styled photo plus a hand-picked set of products
-- (a shirt, a mundu, the combination, accessories, and so on).

CREATE TABLE IF NOT EXISTS looks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  image_url        TEXT NOT NULL,          -- the styled hero shot
  mobile_image_url TEXT,                   -- optional portrait crop for phones
  is_featured      BOOLEAN NOT NULL DEFAULT false,  -- surfaced on the homepage
  is_active        BOOLEAN NOT NULL DEFAULT true,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_looks_active ON looks(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_looks_featured ON looks(is_featured, display_order) WHERE is_featured;

-- A look holds many products; a product can appear in many looks.
CREATE TABLE IF NOT EXISTS look_products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  look_id    UUID NOT NULL REFERENCES looks(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (look_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_look_products_look ON look_products(look_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_look_products_product ON look_products(product_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_looks_updated_at ON looks;
    CREATE TRIGGER update_looks_updated_at BEFORE UPDATE ON looks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE looks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_products ENABLE ROW LEVEL SECURITY;

-- Storefront reads everything; only admins with the 'looks' section write.
DROP POLICY IF EXISTS "Public read looks" ON looks;
CREATE POLICY "Public read looks" ON looks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read look products" ON look_products;
CREATE POLICY "Public read look products" ON look_products FOR SELECT USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_can') THEN
    DROP POLICY IF EXISTS "Admin manage looks" ON looks;
    CREATE POLICY "Admin manage looks" ON looks
      FOR ALL USING (public.admin_can('looks')) WITH CHECK (public.admin_can('looks'));

    DROP POLICY IF EXISTS "Admin manage look products" ON look_products;
    CREATE POLICY "Admin manage look products" ON look_products
      FOR ALL USING (public.admin_can('looks')) WITH CHECK (public.admin_can('looks'));
  ELSE
    DROP POLICY IF EXISTS "Admin manage looks" ON looks;
    CREATE POLICY "Admin manage looks" ON looks
      FOR ALL USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Admin manage look products" ON look_products;
    CREATE POLICY "Admin manage look products" ON look_products
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Existing admins should not lose access the moment this ships.
UPDATE admin_profiles
   SET permissions = permissions || '["looks"]'::jsonb
 WHERE role = 'super_admin'
   AND NOT (permissions ? 'looks');

-- Reuse the public banner bucket for look photography.
INSERT INTO storage.buckets (id, name, public)
VALUES ('banner-images', 'banner-images', true)
ON CONFLICT (id) DO NOTHING;
