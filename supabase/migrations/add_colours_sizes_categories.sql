-- Add colour and size options to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS colours TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}';

-- Insert new categories
INSERT INTO categories (name, slug, description, display_order, is_active)
VALUES
  ('Settu Mundu',  'settu-mundu',  '', 1, true),
  ('Settu Sarees', 'settu-sarees', '', 2, true),
  ('Shirts',       'shirts',       '', 3, true),
  ('Shirt Bites',  'shirt-bites',  '', 4, true)
ON CONFLICT (slug) DO NOTHING;
