-- Lets the store run either Razorpay or Easebuzz (Federal Bank) for online
-- payments, switched from Admin → Settings. Defaults to Razorpay so applying
-- this changes nothing for live checkout until someone flips the switch.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT NOT NULL DEFAULT 'razorpay';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_payment_gateway_check'
  ) THEN
    ALTER TABLE settings
      ADD CONSTRAINT settings_payment_gateway_check
      CHECK (payment_gateway IN ('razorpay', 'easebuzz'));
  END IF;
END $$;

-- Gateway-neutral payment columns. Razorpay orders keep using the existing
-- razorpay_* columns; a NULL payment_gateway means a Razorpay (or COD) order.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT,
  -- txnid of the latest attempt sent to the gateway (each retry needs a new one)
  ADD COLUMN IF NOT EXISTS gateway_txn_id TEXT,
  -- the gateway's own payment reference (Easebuzz easepayid)
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  -- last verified response from the gateway, for support and reconciliation
  ADD COLUMN IF NOT EXISTS gateway_response JSONB;

CREATE INDEX IF NOT EXISTS orders_gateway_txn_id_idx ON orders (gateway_txn_id);
