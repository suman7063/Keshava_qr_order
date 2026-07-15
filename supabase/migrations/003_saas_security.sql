-- ============================================================
-- Migration 003: SaaS security hardening
--
-- 1. Locks down RLS: replaces the allow-all policies with
--    auth.uid()-based tenant policies. All writes now go through
--    the Next.js API routes (service role) after authorization.
-- 2. Fixes user_roles (superadmin role, FK to auth.users).
-- 3. Unifies plans to free/pro/enterprise + trial & billing fields.
-- 4. Session join-code hardening (attempt counter, single active
--    session per table).
-- 5. Audit log table, missing indexes and constraints.
-- ============================================================

-- ── 1. user_roles fixes ─────────────────────────────────────

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'manager', 'superadmin'));

-- FK to auth.users so deleting a user cleans up their roles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_roles' AND constraint_name = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ── 2. Plan unification + billing fields ────────────────────

UPDATE restaurants SET plan = 'pro' WHERE plan = 'starter';
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_plan_check;
ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_plan_check CHECK (plan IN ('free', 'pro', 'enterprise'));

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Subscription skeleton for payment-gateway integration
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id            UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  plan                     VARCHAR(50) NOT NULL CHECK (plan IN ('pro', 'enterprise')),
  status                   VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled')),
  provider                 VARCHAR(50),
  provider_subscription_id TEXT,
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant ON subscriptions(restaurant_id);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ── 3. Audit log ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID         REFERENCES restaurants(id) ON DELETE SET NULL,
  actor_id      UUID,
  action        VARCHAR(100) NOT NULL,
  entity        VARCHAR(50),
  entity_id     TEXT,
  details       JSONB,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant ON audit_logs(restaurant_id, created_at DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ── 4. Session hardening ─────────────────────────────────────

ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;

-- Close duplicate active sessions (keep the newest per table)…
UPDATE table_sessions s
SET status = 'closed', ended_at = NOW()
WHERE s.status = 'active'
  AND EXISTS (
    SELECT 1 FROM table_sessions newer
    WHERE newer.table_id = s.table_id
      AND newer.status = 'active'
      AND newer.started_at > s.started_at
  );

-- …then guarantee only one active session per table
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_session_per_table
  ON table_sessions(table_id) WHERE status = 'active';

-- Backfill restaurant_id on order_items (002 added the column on
-- migrated DBs; fresh installs from supabase-schema.sql lack it)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
UPDATE order_items oi
SET restaurant_id = o.restaurant_id
FROM orders o
WHERE oi.order_id = o.id AND oi.restaurant_id IS NULL;

-- ── 5. Missing indexes & constraints ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant   ON order_items(restaurant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_category_name_per_restaurant
  ON menu_categories(restaurant_id, lower(name));

-- ── 6. RLS helper functions ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_of(rid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND (restaurant_id = rid OR role = 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(rid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND ((restaurant_id = rid AND role = 'admin') OR role = 'superadmin')
  );
$$;

-- ── 7. Replace allow-all policies ────────────────────────────

DROP POLICY IF EXISTS "Allow all restaurant_tables"   ON restaurant_tables;
DROP POLICY IF EXISTS "Allow all menu_categories"     ON menu_categories;
DROP POLICY IF EXISTS "Allow all menu_items"          ON menu_items;
DROP POLICY IF EXISTS "Allow all table_sessions"      ON table_sessions;
DROP POLICY IF EXISTS "Allow all orders"              ON orders;
DROP POLICY IF EXISTS "Allow all order_items"         ON order_items;
DROP POLICY IF EXISTS "Allow all restaurant_settings" ON restaurant_settings;
DROP POLICY IF EXISTS "Allow all user_roles"          ON user_roles;

-- restaurants: public row read stays (subdomain lookup, menus, sitemap)
-- but owner_email is hidden from client roles via column privileges.
REVOKE SELECT (owner_email) ON restaurants FROM anon;
REVOKE SELECT (owner_email) ON restaurants FROM authenticated;
-- No INSERT/UPDATE/DELETE policies: tenant writes happen through the
-- API with the service role only.

-- Menu data is public to read (customer menu), admin-managed to write.
CREATE POLICY "Public read menu_categories" ON menu_categories
  FOR SELECT USING (true);
CREATE POLICY "Admin write menu_categories" ON menu_categories
  FOR ALL USING (is_admin_of(restaurant_id)) WITH CHECK (is_admin_of(restaurant_id));

CREATE POLICY "Public read menu_items" ON menu_items
  FOR SELECT USING (true);
CREATE POLICY "Admin write menu_items" ON menu_items
  FOR ALL USING (is_admin_of(restaurant_id)) WITH CHECK (is_admin_of(restaurant_id));

-- Tables: public read (QR landing shows table number), staff write.
CREATE POLICY "Public read restaurant_tables" ON restaurant_tables
  FOR SELECT USING (true);
CREATE POLICY "Staff write restaurant_tables" ON restaurant_tables
  FOR ALL USING (is_staff_of(restaurant_id)) WITH CHECK (is_staff_of(restaurant_id));

-- Settings: public read (menu display options), admin write.
CREATE POLICY "Public read restaurant_settings" ON restaurant_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin write restaurant_settings" ON restaurant_settings
  FOR ALL USING (is_admin_of(restaurant_id)) WITH CHECK (is_admin_of(restaurant_id));

-- Sessions & orders hold customer PII and join codes: staff only.
-- Customers access them through the API (service role + session code).
CREATE POLICY "Staff read table_sessions" ON table_sessions
  FOR SELECT USING (is_staff_of(restaurant_id));
CREATE POLICY "Staff write table_sessions" ON table_sessions
  FOR UPDATE USING (is_staff_of(restaurant_id)) WITH CHECK (is_staff_of(restaurant_id));

CREATE POLICY "Staff read orders" ON orders
  FOR SELECT USING (is_staff_of(restaurant_id));
CREATE POLICY "Staff write orders" ON orders
  FOR UPDATE USING (is_staff_of(restaurant_id)) WITH CHECK (is_staff_of(restaurant_id));

CREATE POLICY "Staff read order_items" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND is_staff_of(o.restaurant_id))
  );

-- user_roles: users can read their own roles (login/middleware checks);
-- superadmin can read all. Writes only via service role.
CREATE POLICY "Read own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid() OR is_superadmin());

-- subscriptions / audit_logs: admin of the restaurant may read.
CREATE POLICY "Admin read subscriptions" ON subscriptions
  FOR SELECT USING (is_admin_of(restaurant_id));
CREATE POLICY "Admin read audit_logs" ON audit_logs
  FOR SELECT USING (restaurant_id IS NOT NULL AND is_admin_of(restaurant_id));
