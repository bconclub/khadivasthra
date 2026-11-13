-- How a product's price is built in Admin: production cost + landing cost,
-- plus the profit margin, gives the product price (base_price). The offer
-- comes off that, then GST at gst_rate is added (0 = GST switched off).
-- Keeping the inputs lets the form reopen exactly as the brand typed it.
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS production_cost NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS landing_cost NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(6,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 5;
