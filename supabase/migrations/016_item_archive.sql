-- ============================================================
-- Migration 016: soft-delete for menu items
-- Items referenced by past orders cannot be hard-deleted (order
-- history keeps its references). Archiving hides them everywhere
-- (admin list, customer menu, PDFs) while keeping history intact.
-- ============================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
