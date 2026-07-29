-- ── Restaurant public profile fields ─────────────────────────────────────────
-- Powers the public restaurant home page (bicres.com/<subdomain>):
--   cover_image_url  — hero background photo (replaces the stock Unsplash image)
--   maps_url         — Google Maps link for the "Directions" button
--   opening_hours    — free-text display hours, e.g. "10 AM – 11 PM"
--   accepting_orders — admin toggle driving the Open/Closed badge

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS maps_url         TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours    TEXT,
  ADD COLUMN IF NOT EXISTS accepting_orders BOOLEAN NOT NULL DEFAULT TRUE;
