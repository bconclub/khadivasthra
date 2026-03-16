-- Khadi Vasthra Supabase Schema
-- Run this in the Supabase SQL Editor

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(10,2),
  description TEXT NOT NULL DEFAULT '',
  long_description TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  material TEXT,
  care_instructions TEXT[] DEFAULT '{}',
  details JSONB,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_best_seller BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC(6,2) NOT NULL DEFAULT 0.2,
  length NUMERIC(6,2) NOT NULL DEFAULT 13,
  breadth NUMERIC(6,2) NOT NULL DEFAULT 7,
  height NUMERIC(6,2) NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL DEFAULT '',
  customer_city TEXT NOT NULL DEFAULT '',
  customer_state TEXT NOT NULL DEFAULT 'Kerala',
  customer_pincode TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  notes TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','cod')),
  payment_method TEXT NOT NULL DEFAULT 'online' CHECK (payment_method IN ('online','cod')),
  shiprocket_order_id TEXT,
  shipment_id TEXT,
  awb_code TEXT,
  courier_name TEXT,
  tracking_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Site settings (singleton row)
CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number TEXT NOT NULL DEFAULT '919745512345',
  store_name TEXT NOT NULL DEFAULT 'Khadi Vasthra',
  store_email TEXT,
  store_phone TEXT NOT NULL DEFAULT '+91 97455 12345',
  store_address TEXT NOT NULL DEFAULT 'Kurumassery P.O, Aluva, Ernakulam, Kerala - 683579',
  shipping_info TEXT,
  return_policy TEXT,
  announcement_text TEXT,
  cod_enabled BOOLEAN NOT NULL DEFAULT true,
  is_store_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product views for analytics
CREATE TABLE product_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  session_id TEXT
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_bestseller ON products(is_best_seller) WHERE is_best_seller = true;
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_product_views_product ON product_views(product_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

-- Public read access for storefront
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- Public can create orders and product views
CREATE POLICY "Public create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public create views" ON product_views FOR INSERT WITH CHECK (true);

-- Authenticated (admin) full access
CREATE POLICY "Admin manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage settings" ON settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin read views" ON product_views FOR SELECT USING (auth.role() = 'authenticated');

-- Storage buckets (run these separately if they fail - buckets may need to be created via dashboard)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Public read category images" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin upload category images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin update category images" ON storage.objects FOR UPDATE USING (bucket_id = 'category-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin delete category images" ON storage.objects FOR DELETE USING (bucket_id = 'category-images' AND auth.role() = 'authenticated');

-- Banners table
CREATE TABLE banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'wide' CHECK (size IN ('hero', 'wide', 'square', 'tall')),
  link_type TEXT NOT NULL DEFAULT 'none' CHECK (link_type IN ('product', 'category', 'url', 'none')),
  link_value TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_banners_active ON banners(is_active, display_order);
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read banners" ON banners FOR SELECT USING (true);
CREATE POLICY "Admin manage banners" ON banners FOR ALL USING (auth.role() = 'authenticated');

-- Banner images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('banner-images', 'banner-images', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read banner images" ON storage.objects FOR SELECT USING (bucket_id = 'banner-images');
CREATE POLICY "Admin upload banner images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banner-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin update banner images" ON storage.objects FOR UPDATE USING (bucket_id = 'banner-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin delete banner images" ON storage.objects FOR DELETE USING (bucket_id = 'banner-images' AND auth.role() = 'authenticated');

-- Decrement stock on order (called from client after order creation)
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0),
      in_stock = CASE WHEN stock_quantity - p_quantity > 0 THEN true ELSE false END
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default settings row
INSERT INTO settings (whatsapp_number, store_name, store_phone, store_address)
VALUES ('919745512345', 'Khadi Vasthra', '+91 97455 12345', 'Kurumassery P.O, Aluva, Ernakulam, Kerala - 683579');
