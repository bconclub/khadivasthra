-- Generic shipment fields let Shipway run beside the existing Shiprocket code.
-- No provider is activated by this migration.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_provider TEXT,
  ADD COLUMN IF NOT EXISTS shipping_provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_provider_shipment_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_status TEXT,
  ADD COLUMN IF NOT EXISTS shipping_label_url TEXT,
  ADD COLUMN IF NOT EXISTS courier_id TEXT,
  ADD COLUMN IF NOT EXISTS awb_code TEXT,
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS charged_weight NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS shipping_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_shipping_provider
  ON public.orders (shipping_provider);

CREATE INDEX IF NOT EXISTS idx_orders_awb_code
  ON public.orders (awb_code)
  WHERE awb_code IS NOT NULL;

COMMENT ON COLUMN public.orders.shipping_provider IS
  'Courier aggregator used for this order, for example shipway or shiprocket.';
COMMENT ON COLUMN public.orders.shipping_metadata IS
  'Provider response and parcel calculation retained for support and reconciliation.';
