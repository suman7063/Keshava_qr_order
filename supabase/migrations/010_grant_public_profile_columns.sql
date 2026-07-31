-- ============================================================
-- Migration 010: expose the new public-profile columns to
-- client roles. 006 switched restaurants to per-column SELECT
-- grants, so columns added in 009 must be granted explicitly
-- or the public restaurant/menu pages cannot read them.
-- ============================================================

GRANT SELECT (cover_image_url, maps_url, opening_hours, accepting_orders)
  ON restaurants TO anon;

GRANT SELECT (cover_image_url, maps_url, opening_hours, accepting_orders)
  ON restaurants TO authenticated;
