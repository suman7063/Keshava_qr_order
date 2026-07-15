-- ============================================================
-- Migration 005: drop legacy allow-all policies
-- The live DB's original policies were named "Allow all on X"
-- (003 dropped the "Allow all X" variant from supabase-schema.sql).
-- Any permissive policy ORs with the rest, so these left the
-- tables wide open despite the new tenant-scoped policies.
-- ============================================================

DROP POLICY IF EXISTS "Allow all on restaurant_tables"   ON restaurant_tables;
DROP POLICY IF EXISTS "Allow all on menu_categories"     ON menu_categories;
DROP POLICY IF EXISTS "Allow all on menu_items"          ON menu_items;
DROP POLICY IF EXISTS "Allow all on table_sessions"      ON table_sessions;
DROP POLICY IF EXISTS "Allow all on orders"              ON orders;
DROP POLICY IF EXISTS "Allow all on order_items"         ON order_items;
DROP POLICY IF EXISTS "Allow all on restaurant_settings" ON restaurant_settings;
DROP POLICY IF EXISTS "Allow all on user_roles"          ON user_roles;

-- USING(true) — the service role bypasses RLS anyway, so this was
-- effectively "everyone can manage roles". Gone.
DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;

-- Duplicate of 003's "Read own roles"
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
