-- Add placement + mobile image support to banners so admin can control
-- a site-wide "shop banner" (homepage hero strip, shop page, offers page).
-- Run this in the Supabase SQL Editor.

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'general'
    CHECK (placement IN ('homepage_hero', 'shop', 'offers', 'general'));

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners(placement, is_active, display_order);
