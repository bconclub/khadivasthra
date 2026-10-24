-- Cancellation policy text, edited in Admin → Settings → Policies & Info and
-- shown on the Terms & Conditions page next to shipping and returns.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
