-- Menu Card QR: the owner's chosen PDF template (+ colour overrides) is
-- saved per restaurant so the public /{slug}/menu-card page can render
-- the menu in exactly that design.
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS menu_pdf jsonb;

-- Menu QR card design (same editor as table QR cards, saved per restaurant)
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS menu_qr jsonb;
