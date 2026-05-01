-- QR Restaurant Ordering System - Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables (restaurant tables)
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_number VARCHAR(20) NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  qr_code_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
  is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
  allergens TEXT[] DEFAULT '{}',
  prep_time_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Sessions (created when customer scans QR)
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  customer_name VARCHAR(200),
  customer_count INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update orders.updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Realtime for orders and order_items
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_sessions_table ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Row Level Security (disable for simplicity - enable auth later)
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (remove in production and add proper auth)
CREATE POLICY "Allow all on restaurant_tables" ON restaurant_tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on menu_categories" ON menu_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on table_sessions" ON table_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- Sample data
INSERT INTO menu_categories (name, description, display_order) VALUES
  ('Starters', 'Appetizers and small bites', 1),
  ('Main Course', 'Hearty mains and entrees', 2),
  ('Desserts', 'Sweet treats to finish', 3),
  ('Drinks', 'Beverages and refreshments', 4);

INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, prep_time_minutes, display_order)
SELECT id, 'Garlic Bread', 'Toasted bread with garlic butter', 5.99, true, 10, 1 FROM menu_categories WHERE name = 'Starters'
UNION ALL
SELECT id, 'Caesar Salad', 'Romaine lettuce, croutons, parmesan, caesar dressing', 9.99, true, 10, 2 FROM menu_categories WHERE name = 'Starters'
UNION ALL
SELECT id, 'Grilled Chicken', 'Marinated chicken breast with seasonal vegetables', 18.99, false, 25, 1 FROM menu_categories WHERE name = 'Main Course'
UNION ALL
SELECT id, 'Margherita Pizza', 'Classic tomato, mozzarella, fresh basil', 16.99, true, 20, 2 FROM menu_categories WHERE name = 'Main Course'
UNION ALL
SELECT id, 'Beef Burger', 'Angus beef patty with lettuce, tomato, special sauce', 15.99, false, 20, 3 FROM menu_categories WHERE name = 'Main Course'
UNION ALL
SELECT id, 'Chocolate Lava Cake', 'Warm chocolate cake with vanilla ice cream', 8.99, true, 15, 1 FROM menu_categories WHERE name = 'Desserts'
UNION ALL
SELECT id, 'Coca-Cola', 'Classic cola drink, 330ml', 2.99, true, 2, 1 FROM menu_categories WHERE name = 'Drinks'
UNION ALL
SELECT id, 'Fresh Lemonade', 'Freshly squeezed lemon juice with mint', 4.99, true, 5, 2 FROM menu_categories WHERE name = 'Drinks';

INSERT INTO restaurant_tables (table_number, capacity) VALUES
  ('T1', 2),
  ('T2', 4),
  ('T3', 4),
  ('T4', 6),
  ('T5', 8);
