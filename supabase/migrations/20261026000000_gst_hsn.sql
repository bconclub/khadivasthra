-- HSN codes for GST tax invoices. Each product can carry its own; products
-- without one use the default set in Admin → Settings.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hsn_code TEXT;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS default_hsn TEXT;
