-- ============================================================
-- Migration 006: hide restaurants.owner_email from client roles
-- 003's column REVOKE was overridden by the table-level SELECT
-- grant that Supabase (re)applies. Convert the anon/authenticated
-- SELECT to explicit per-column grants that exclude owner_email.
-- ============================================================

REVOKE SELECT ON restaurants FROM anon;
REVOKE SELECT ON restaurants FROM authenticated;

GRANT SELECT (
  id, name, subdomain, phone, address, logo_url, primary_color,
  plan, status, created_at, updated_at, trial_ends_at, suspended_reason
) ON restaurants TO anon;

GRANT SELECT (
  id, name, subdomain, phone, address, logo_url, primary_color,
  plan, status, created_at, updated_at, trial_ends_at, suspended_reason
) ON restaurants TO authenticated;
