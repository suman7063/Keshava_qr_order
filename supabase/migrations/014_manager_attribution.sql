-- ============================================================
-- Migration 014: who did it — staff attribution
-- orders.handled_by:        staff user who last changed the status
--                           (accept / cooking / served / cancel)
-- table_sessions.closed_by: staff user who closed the session
-- Powers the per-manager activity view in the admin panel.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS handled_by UUID;

ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS closed_by UUID;

CREATE INDEX IF NOT EXISTS idx_orders_handled_by ON orders(handled_by);
