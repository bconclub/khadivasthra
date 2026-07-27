-- Add invoice number field to orders (COD Details section, admin orders page)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
