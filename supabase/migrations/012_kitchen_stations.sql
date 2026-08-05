-- ============================================================
-- Migration 012: dynamic kitchen stations (per restaurant)
-- A station is where food is physically prepared (South Kitchen,
-- North Kitchen, Beverages, Tandoor...). Each restaurant defines
-- its own set — this is SaaS, nothing is hardcoded.
--
-- KOT routing resolves per item:
--   menu_items.station_id            (item override, wins)
--   -> menu_categories.default_station_id  (category default)
--   -> NULL = "Main Kitchen"         (single-slip behavior, as today)
-- ON DELETE SET NULL keeps orders flowing if a station is removed.
-- ============================================================

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id            UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(100)  NOT NULL,
  display_order INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (restaurant_id, name)
);

ALTER TABLE kitchen_stations ENABLE ROW LEVEL SECURITY;

ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS default_station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL;
