-- Color-First Product Variation System
-- Separates colors (with images) from size variants

-- Step 1: Add has_variants to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Step 2: Create product_colors table
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL DEFAULT '#000000',
  images TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id UUID NOT NULL REFERENCES product_colors(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  price_adjustment INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_colors_product ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_sort ON product_colors(sort_order);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON product_variants(color_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active) WHERE is_active = true;

-- Step 5: Unique constraint for size per color
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique_size_color
  ON product_variants(product_id, color_id, size)
  WHERE is_active = true;

-- Step 6: Enable RLS
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies (if any)
DO $$
BEGIN
  DROP POLICY IF EXISTS "public_read_colors" ON product_colors;
  DROP POLICY IF EXISTS "public_read_variants" ON product_variants;
  DROP POLICY IF EXISTS "admin_manage_colors" ON product_colors;
  DROP POLICY IF EXISTS "admin_manage_variants" ON product_variants;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Step 8: Create policies
CREATE POLICY "public_read_colors" ON product_colors FOR SELECT USING (true);
CREATE POLICY "public_read_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "admin_manage_colors" ON product_colors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_manage_variants" ON product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 9: Drop and recreate stock function
DROP FUNCTION IF EXISTS decrement_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS decrement_stock(UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_variant_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF p_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0)
    WHERE id = p_variant_id;
  ELSE
    UPDATE products
    SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0),
        in_stock = CASE WHEN stock_quantity - p_quantity > 0 THEN true ELSE false END
    WHERE id = p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
