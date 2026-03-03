-- Add banners table for promotions/offers management
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS banners (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, display_order);

-- Updated_at trigger
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Public can read banners (for storefront)
CREATE POLICY "Public read banners" ON banners FOR SELECT USING (true);

-- Authenticated (admin) can manage banners
CREATE POLICY "Admin manage banners" ON banners FOR ALL USING (auth.role() = 'authenticated');

-- Banner images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banner-images', 'banner-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for banner images
CREATE POLICY "Public read banner images" ON storage.objects
  FOR SELECT USING (bucket_id = 'banner-images');

CREATE POLICY "Admin upload banner images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banner-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admin update banner images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'banner-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admin delete banner images" ON storage.objects
  FOR DELETE USING (bucket_id = 'banner-images' AND auth.role() = 'authenticated');
