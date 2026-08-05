-- ============================================================
-- Migration 015: optional subcategory label on menu items
-- Display-only grouping inside a category (e.g. SOUTH INDIAN →
-- "Idly Varieties", "Vada", "Plain Dosa") used by the price-list
-- PDF template. Plain text, no separate table.
-- ============================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
