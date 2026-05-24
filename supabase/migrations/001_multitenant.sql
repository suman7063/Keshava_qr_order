-- ============================================================
-- Migration 001: Multi-tenant support for bicres.com SaaS
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- 1. restaurants table (master tenant list)
CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  subdomain     VARCHAR(100) NOT NULL UNIQUE,
  owner_email   VARCHAR(200),
  phone         VARCHAR(20),
  address       TEXT,
  logo_url      TEXT,
  primary_color VARCHAR(7),
  plan          VARCHAR(50)  NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Seed: existing data goes to a "default" restaurant
INSERT INTO restaurants (name, subdomain, plan, status)
VALUES ('The QR Kitchen', 'default', 'pro', 'active')
ON CONFLICT (subdomain) DO NOTHING;

-- 2. Add restaurant_id column to every tenant table
ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

-- 3. restaurant_settings — add restaurant_id if not present
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id              SERIAL       PRIMARY KEY,
  restaurant_id   UUID         UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  show_menu_images BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

-- 4. Migrate ALL existing data to the default restaurant
DO $$
DECLARE
  def_id UUID;
BEGIN
  SELECT id INTO def_id FROM restaurants WHERE subdomain = 'default' LIMIT 1;

  UPDATE restaurant_tables  SET restaurant_id = def_id WHERE restaurant_id IS NULL;
  UPDATE menu_categories    SET restaurant_id = def_id WHERE restaurant_id IS NULL;
  UPDATE menu_items         SET restaurant_id = def_id WHERE restaurant_id IS NULL;
  UPDATE table_sessions     SET restaurant_id = def_id WHERE restaurant_id IS NULL;
  UPDATE orders             SET restaurant_id = def_id WHERE restaurant_id IS NULL;
  UPDATE restaurant_settings SET restaurant_id = def_id WHERE restaurant_id IS NULL;

  -- Ensure a settings row exists for the default restaurant
  INSERT INTO restaurant_settings (restaurant_id, show_menu_images)
  VALUES (def_id, true)
  ON CONFLICT (restaurant_id) DO NOTHING;
END $$;

-- 5. Enforce NOT NULL after migration
ALTER TABLE restaurant_tables ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE menu_categories   ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE menu_items        ALTER COLUMN restaurant_id SET NOT NULL;

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_subdomain         ON restaurants(subdomain);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant  ON restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant    ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant         ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant             ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant     ON table_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_rid       ON restaurant_settings(restaurant_id);

-- 7. RLS for new tables
ALTER TABLE restaurants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings  ENABLE ROW LEVEL SECURITY;

-- Public can read restaurants (subdomain lookup)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Public read restaurants') THEN
    CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (true);
  END IF;
END $$;

-- Full access on restaurant_settings (auth handled at app layer)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurant_settings' AND policyname='Allow all restaurant_settings') THEN
    CREATE POLICY "Allow all restaurant_settings" ON restaurant_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. updated_at trigger for restaurants
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restaurants_updated_at ON restaurants;
CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_restaurants_updated_at();

-- 9. Enable realtime for restaurants
ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;
