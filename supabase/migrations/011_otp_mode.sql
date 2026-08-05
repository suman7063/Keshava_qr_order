-- ============================================================
-- Migration 011: configurable OTP mode per restaurant
--   'customer' (default): the first customer sees the join code on
--                         their own screen and shares it at the table.
--   'manager':            the code is only visible to staff; a manager
--                         tells it to the customer before their first
--                         order can be placed.
-- Existing table_sessions.otp_verified (previously write-only) becomes
-- the staff-dashboard signal: FALSE = customer is still waiting for
-- the code, TRUE = the code has reached the diners.
-- ============================================================

ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS otp_mode VARCHAR(10) NOT NULL DEFAULT 'customer'
  CHECK (otp_mode IN ('customer', 'manager'));
