-- ============================================================
-- Migration 007: defensively ENABLE RLS on every tenant table
-- 003 created tenant-scoped policies and 005 dropped the legacy
-- allow-all ones, but neither ran ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY on the core tenant tables. Policies are inert if RLS is
-- off, so make sure it's on everywhere (idempotent).
-- ============================================================

ALTER TABLE restaurant_tables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;
