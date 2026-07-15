/** Whitelisted client-updatable columns for menu items. */
export const ITEM_FIELDS = [
  'category_id', 'name', 'description', 'price', 'image_url', 'is_available',
  'is_vegetarian', 'is_vegan', 'allergens', 'prep_time_minutes', 'display_order',
] as const

/** Subdomains that can never be registered as tenant names. */
export const RESERVED_SUBDOMAINS = [
  'www', 'api', 'app', 'admin', 'superadmin', 'manager', 'kitchen', 'table',
  'mail', 'smtp', 'ftp', 'default', 'onboard', 'blog', 'help', 'support',
  'docs', 'status', 'static', 'cdn', 'assets', 'dashboard', 'billing',
]
