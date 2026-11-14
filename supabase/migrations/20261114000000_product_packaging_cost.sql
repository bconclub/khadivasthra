-- Price build-up, all before GST: purchase (production_cost) + packaging_cost
-- + delivery (landing_cost) = cost; selling price = cost x markup (e.g. 1.5, 1.8).
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS markup NUMERIC(5,2);
