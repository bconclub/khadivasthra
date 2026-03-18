-- Add billing tracking fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_billed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ;
