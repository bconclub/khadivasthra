-- Allow a 'hero_background' banner placement: the large cover image behind
-- the logo at the top of the homepage (separate mobile/desktop images).
ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_placement_check;

ALTER TABLE banners ADD CONSTRAINT banners_placement_check
  CHECK (placement IN ('hero_background', 'homepage_hero', 'shop', 'offers', 'general'));
