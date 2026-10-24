-- Business details as registered for GST. Shown on the Terms & Conditions
-- page (payment gateways require them) and on printed tax invoices.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS registered_address TEXT;
