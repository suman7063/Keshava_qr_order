-- ============================================================
-- Migration 013: adjustable dark layer over background images
-- so text stays readable on any photo.
--   restaurant_tables.card_overlay: QR card photo layer (0-80%)
--   restaurants.cover_overlay:      public-page cover layer (0-90%)
-- Defaults preserve today's look exactly: cards had no layer (0),
-- the public page had a hardcoded 62% overlay.
-- ============================================================

ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS card_overlay INTEGER NOT NULL DEFAULT 0
  CHECK (card_overlay BETWEEN 0 AND 80);

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS cover_overlay INTEGER NOT NULL DEFAULT 62
  CHECK (cover_overlay BETWEEN 0 AND 90);

-- restaurants uses per-column SELECT grants (006/010) — expose the new
-- public column or the public restaurant page cannot read it.
GRANT SELECT (cover_overlay) ON restaurants TO anon;
GRANT SELECT (cover_overlay) ON restaurants TO authenticated;
