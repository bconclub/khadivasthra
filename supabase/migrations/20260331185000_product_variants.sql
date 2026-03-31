-- Product Variants Migration
-- Adds product_variants table and updates products table for variant support

-- Add has_variants to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN NOT NULL DEFAULT false;

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#000000',
  size TEXT NOT NULL,
  price_adjustment INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  variant_image TEXT,
  variant_images TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON product_variants(color_name);
CREATE INDEX IF NOT EXISTS idx_product_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_variants_default ON product_variants(is_default) WHERE is_default = true;

-- Unique constraint: one variant per color+size per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique_color_size
  ON product_variants(product_id, color_name, size)
  WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Public read access for storefront
CREATE POLICY IF NOT EXISTS "Public read product variants" ON product_variants FOR SELECT USING (true);

-- Authenticated (admin) full access
CREATE POLICY IF NOT EXISTS "Admin manage product variants" ON product_variants FOR ALL USING (auth.role() = 'authenticated');

-- Update decrement_stock function to support variants
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER, p_variant_id UUID DEFAULT NULL)
RETURNS VOID AS $$
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
