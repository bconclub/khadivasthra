-- Allow a 'heritage' banner placement: the story photo beside the
-- "Since 2007 / Preserving Kerala's Handloom Heritage" section on the homepage.
ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_placement_check;

ALTER TABLE banners ADD CONSTRAINT banners_placement_check
  CHECK (placement IN ('hero_background', 'homepage_hero', 'heritage', 'shop', 'offers', 'general'));
