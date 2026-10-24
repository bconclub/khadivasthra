-- Master switch for the festive (Diwali) homepage section. Defaults to OFF so
-- the section only appears once someone turns it on in Admin → Settings.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS festive_enabled BOOLEAN NOT NULL DEFAULT false;
