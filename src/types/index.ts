export type TableStatus = 'available' | 'occupied' | 'reserved'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'
export type SessionStatus = 'active' | 'closed'

export interface RestaurantTable {
  id: string
  table_number: string
  capacity: number
  status: TableStatus
  qr_code_url?: string
  created_at: string
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  is_available: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  allergens?: string[]
  prep_time_minutes?: number
  display_order: number
  created_at: string
  category?: MenuCategory
}

export interface TableSession {
  id: string
  table_id: string
  customer_name?: string
  customer_count?: number
  status: SessionStatus
  started_at: string
  ended_at?: string
  table?: RestaurantTable
}

export interface Order {
  id: string
  session_id: string
  table_id: string
  status: OrderStatus
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
  session?: TableSession
  table?: RestaurantTable
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
  created_at: string
  menu_item?: MenuItem
}

export interface CartItem {
  menu_item: MenuItem
  quantity: number
  notes?: string
}
