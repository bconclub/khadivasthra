-- Master switch for the whole "Shop the Look" feature. Defaults to OFF so the
-- section and its pages stay hidden until the looks are actually ready.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS looks_enabled BOOLEAN NOT NULL DEFAULT false;
