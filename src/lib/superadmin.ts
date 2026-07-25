export interface SaRestaurant {
  id: string
  name: string
  subdomain: string
  plan: string
  status: string
  owner_email: string | null
  phone: string | null
  created_at: string
}

export type SaBilling =
  | { status: 'paying'; plan: string }
  | { status: 'trial'; plan: string; trialDaysLeft: number }
  | { status: 'comp'; plan: string }
  | { status: 'free' }

export interface SaActivity {
  orders: number
  tables: number
  lastActive: string | null
  gmv: number
}

export interface SaStats {
  mrr: number
  paying: number
  onTrial: number
  trialsEndingSoon: number
  comped: number
  churned: number
  total: number
  active: number
  totalOrders: number
  gmv: number
  signups: { month: string; label: string; count: number }[]
  billing: Record<string, SaBilling>
  activity: Record<string, SaActivity>
}

export interface SaAuditEntry {
  id: string
  action: string
  entity: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  restaurant: { name: string } | null
}
