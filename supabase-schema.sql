-- QR Restaurant Ordering System — Multi-tenant Schema
-- Run this for a fresh install, THEN run supabase/migrations/003_saas_security.sql
-- (REQUIRED — it replaces the allow-all RLS policies below with real,
-- tenant-scoped policies and adds billing/audit tables).
-- For existing installs, run the files in supabase/migrations/ in order.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Restaurants (master tenant table) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  subdomain     VARCHAR(100) NOT NULL UNIQUE,
  owner_email   VARCHAR(200),
  phone         VARCHAR(20),
  address       TEXT,
  logo_url      TEXT,
  cover_image_url TEXT,
  maps_url      TEXT,
  opening_hours TEXT,
  accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
  cover_overlay INTEGER      NOT NULL DEFAULT 62 CHECK (cover_overlay BETWEEN 0 AND 90),
  primary_color VARCHAR(7),
  plan          VARCHAR(50)  NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Restaurant Tables ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id            UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID         NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number  VARCHAR(20)  NOT NULL,
  capacity      INTEGER      NOT NULL DEFAULT 4,
  status        VARCHAR(20)  NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  qr_code_url   TEXT,
  card_image    TEXT,
  card_template VARCHAR(50),
  card_bg_color VARCHAR(7),
  card_bg_image TEXT,
  card_text_color VARCHAR(7),
  card_heading  TEXT,
  card_subtext  TEXT,
  card_label    TEXT,
  card_overlay  INTEGER      NOT NULL DEFAULT 0 CHECK (card_overlay BETWEEN 0 AND 80),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

-- ── Menu Categories ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id            UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID         NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Menu Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id                UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id     UUID         NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id       UUID         NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  price             DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  image_url         TEXT,
  is_available      BOOLEAN      NOT NULL DEFAULT TRUE,
  is_vegetarian     BOOLEAN      NOT NULL DEFAULT FALSE,
  is_vegan          BOOLEAN      NOT NULL DEFAULT FALSE,
  allergens         TEXT[]       DEFAULT '{}',
  prep_time_minutes INTEGER,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Table Sessions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_sessions (
  id             UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id  UUID         REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id       UUID         NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  customer_name  VARCHAR(200),
  customer_count INTEGER,
  phone          VARCHAR(20),
  otp            VARCHAR(6),
  otp_verified   BOOLEAN      DEFAULT FALSE,
  bill_requested BOOLEAN      NOT NULL DEFAULT FALSE,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_at     TIMESTAMPTZ  DEFAULT NOW(),
  ended_at       TIMESTAMPTZ
);

-- ── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID          REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id    UUID          NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  table_id      UUID          NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  customer_name VARCHAR(200),
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
  total_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Order Items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id     UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID          NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity     INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price   DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price  DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  notes        TEXT,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Kitchen Stations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id            UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(100)  NOT NULL,
  display_order INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (restaurant_id, name)
);

-- KOT routing: item override wins, else category default, else "Main Kitchen".
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS default_station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL;
ALTER TABLE menu_items      ADD COLUMN IF NOT EXISTS station_id         UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL;

-- ── Restaurant Settings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id               SERIAL       PRIMARY KEY,
  restaurant_id    UUID         UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  show_menu_images BOOLEAN      NOT NULL DEFAULT TRUE,
  otp_mode         VARCHAR(10)  NOT NULL DEFAULT 'customer' CHECK (otp_mode IN ('customer', 'manager')),
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ── User Roles ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id            UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID         NOT NULL,
  restaurant_id UUID         REFERENCES restaurants(id) ON DELETE CASCADE,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'manager')),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- ── Triggers ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_restaurants_updated_at();

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_restaurants_subdomain         ON restaurants(subdomain);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant  ON restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant    ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant         ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category           ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant             ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_session                ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_table                  ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status                 ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order             ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant     ON table_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table          ON table_sessions(table_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE restaurants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_stations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read restaurants"         ON restaurants         FOR SELECT USING (true);
CREATE POLICY "Allow all restaurant_tables"     ON restaurant_tables   FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow all menu_categories"       ON menu_categories     FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow all menu_items"            ON menu_items          FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow all table_sessions"        ON table_sessions      FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow all orders"                ON orders              FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow all order_items"           ON order_items         FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow all restaurant_settings"   ON restaurant_settings FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_roles"            ON user_roles          FOR ALL    USING (true) WITH CHECK (true);
