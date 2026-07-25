-- ============================================================
-- Migration 008: fix restaurant_settings for multi-tenant use
-- Leftovers from the original single-tenant design broke per-restaurant
-- settings upserts:
--   1. no UNIQUE on restaurant_id  -> upsert(onConflict) had no target
--   2. id default was the constant 1 (broken SERIAL) -> duplicate pkey
--   3. a "single_row" CHECK constraint allowed only ONE settings row
-- ============================================================

-- 3. Drop the single-row lock (was fine for one global settings row).
ALTER TABLE restaurant_settings DROP CONSTRAINT IF EXISTS single_row;

-- 2. Repair the id sequence so inserts get fresh ids.
CREATE SEQUENCE IF NOT EXISTS restaurant_settings_id_seq;
SELECT setval('restaurant_settings_id_seq'::regclass,
              GREATEST((SELECT COALESCE(MAX(id), 0) FROM restaurant_settings), 1));
ALTER TABLE restaurant_settings ALTER COLUMN id SET DEFAULT nextval('restaurant_settings_id_seq'::regclass);
ALTER SEQUENCE restaurant_settings_id_seq OWNED BY restaurant_settings.id;

-- 1. Dedupe then enforce one settings row per restaurant.
DELETE FROM restaurant_settings a
USING restaurant_settings b
WHERE a.restaurant_id = b.restaurant_id AND a.id > b.id;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_settings_restaurant_id_key'
  ) THEN
    ALTER TABLE restaurant_settings
      ADD CONSTRAINT restaurant_settings_restaurant_id_key UNIQUE (restaurant_id);
  END IF;
END $$;

-- Backfill a settings row for every restaurant that lacks one.
INSERT INTO restaurant_settings (restaurant_id, show_menu_images)
SELECT id, true FROM restaurants
ON CONFLICT (restaurant_id) DO NOTHING;
