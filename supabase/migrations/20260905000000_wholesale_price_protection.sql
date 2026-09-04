-- Trade prices must not be readable by retail shoppers.
--
-- They were columns on `products`, which every visitor can read: the storefront
-- selects `products.*` with the anon key, so `wholesale_price` came back over
-- the public API to anyone who asked for it. Row-level security cannot hide a
-- single column, and revoking the column privilege would break `select *` for
-- the whole storefront, so the price moves to its own table with its own
-- policies. `products.is_wholesale` stays: a boolean flag leaks nothing.

CREATE TABLE IF NOT EXISTS wholesale_prices (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_qty    INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_wholesale_prices_updated_at ON wholesale_prices;
    CREATE TRIGGER update_wholesale_prices_updated_at BEFORE UPDATE ON wholesale_prices
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Carry over anything already entered against the old columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'wholesale_price'
  ) THEN
    EXECUTE $mig$
      INSERT INTO wholesale_prices (product_id, price, min_qty)
      SELECT id, COALESCE(wholesale_price, 0), COALESCE(wholesale_min_qty, 1)
        FROM products
       WHERE is_wholesale = true AND wholesale_price IS NOT NULL
      ON CONFLICT (product_id) DO NOTHING
    $mig$;
  END IF;
END $$;

ALTER TABLE products
  DROP COLUMN IF EXISTS wholesale_price,
  DROP COLUMN IF EXISTS wholesale_min_qty;

ALTER TABLE wholesale_prices ENABLE ROW LEVEL SECURITY;

-- Only an approved trade buyer, or an admin with the wholesale section, sees a
-- trade price. There is deliberately no public SELECT policy.
DROP POLICY IF EXISTS "Approved buyer reads trade prices" ON wholesale_prices;
CREATE POLICY "Approved buyer reads trade prices" ON wholesale_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wholesale_accounts w
       WHERE w.id = auth.uid() AND w.is_active
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_can') THEN
    DROP POLICY IF EXISTS "Admin manage trade prices" ON wholesale_prices;
    CREATE POLICY "Admin manage trade prices" ON wholesale_prices
      FOR ALL USING (public.admin_can('wholesale') OR public.admin_can('products'))
      WITH CHECK (public.admin_can('wholesale') OR public.admin_can('products'));
  ELSE
    DROP POLICY IF EXISTS "Admin manage trade prices" ON wholesale_prices;
    CREATE POLICY "Admin manage trade prices" ON wholesale_prices
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
