-- Migration 002: Create restaurants table and add restaurant_id to all tenant tables
-- Safe to run multiple times (all IF NOT EXISTS)

-- 1. restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Seed default restaurant
INSERT INTO restaurants (name, subdomain, plan, status)
VALUES ('The QR Kitchen', 'default', 'pro', 'active')
ON CONFLICT (subdomain) DO NOTHING;

-- 2. Add restaurant_id to all tenant tables
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

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

-- 3. Migrate existing data to default restaurant
DO $$
DECLARE def_id UUID;
BEGIN
  SELECT id INTO def_id FROM restaurants WHERE subdomain = 'default' LIMIT 1;
  IF def_id IS NOT NULL THEN
    UPDATE restaurant_tables   SET restaurant_id = def_id WHERE restaurant_id IS NULL;
    UPDATE menu_categories     SET restaurant_id = def_id WHERE restaurant_id IS NULL;
    UPDATE menu_items          SET restaurant_id = def_id WHERE restaurant_id IS NULL;
    UPDATE table_sessions      SET restaurant_id = def_id WHERE restaurant_id IS NULL;
    UPDATE orders              SET restaurant_id = def_id WHERE restaurant_id IS NULL;
    UPDATE order_items         SET restaurant_id = def_id WHERE restaurant_id IS NULL;
    UPDATE restaurant_settings SET restaurant_id = def_id WHERE restaurant_id IS NULL;
  END IF;
END $$;

-- 4. RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Public read restaurants'
  ) THEN
    CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (true);
  END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_subdomain        ON restaurants(subdomain);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant ON restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant   ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant        ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant            ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant    ON table_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant       ON order_items(restaurant_id);

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restaurants_updated_at ON restaurants;
CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_restaurants_updated_at();
