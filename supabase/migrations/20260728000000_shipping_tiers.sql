-- Flat customer-facing shipping tiers by cart item count.
-- Customer pays the tier rate; the real Shiprocket cost difference is
-- absorbed by the brand. Quote API is still used for availability/ETA only.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shipping_tiers JSONB
  DEFAULT '[{"max_items":1,"rate":89},{"max_items":3,"rate":119},{"max_items":99,"rate":189}]';

UPDATE settings SET shipping_tiers =
  '[{"max_items":1,"rate":89},{"max_items":3,"rate":119},{"max_items":99,"rate":189}]'
  WHERE shipping_tiers IS NULL;
