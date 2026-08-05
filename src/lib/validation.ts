/** Whitelisted client-updatable columns for menu items. */
export const ITEM_FIELDS = [
  'category_id', 'station_id', 'name', 'subcategory', 'description', 'price', 'image_url', 'is_available',
  'is_vegetarian', 'is_vegan', 'allergens', 'prep_time_minutes', 'display_order',
] as const

/**
 * Validate/normalize whitelisted menu-item fields. Returns an error string, or
 * null if the (mutated) object is clean.
 */
export function validateMenuItemFields(obj: Record<string, unknown>): string | null {
  if ('price' in obj) {
    const p = Number(obj.price)
    if (Number.isNaN(p) || p < 0 || p > 1_000_000) return 'Invalid price'
    obj.price = p
  }
  for (const key of ['prep_time_minutes', 'display_order'] as const) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      const n = Number(obj[key])
      if (!Number.isInteger(n) || n < 0 || n > 100_000) return `Invalid ${key}`
      obj[key] = n
    }
  }
  if ('name' in obj && typeof obj.name === 'string') obj.name = obj.name.slice(0, 200)
  if ('subcategory' in obj) {
    if (obj.subcategory != null && typeof obj.subcategory !== 'string') return 'Invalid subcategory'
    if (typeof obj.subcategory === 'string') obj.subcategory = obj.subcategory.trim().slice(0, 100) || null
  }
  if ('description' in obj && typeof obj.description === 'string') obj.description = obj.description.slice(0, 1000)
  if ('station_id' in obj) {
    if (obj.station_id === '') obj.station_id = null
    if (obj.station_id !== null && typeof obj.station_id !== 'string') return 'Invalid kitchen'
  }
  if ('allergens' in obj && obj.allergens != null) {
    if (!Array.isArray(obj.allergens) || obj.allergens.length > 30) return 'Invalid allergens'
    obj.allergens = obj.allergens.filter(a => typeof a === 'string').slice(0, 30).map(a => String(a).slice(0, 50))
  }
  return null
}

/** Subdomains that can never be registered as tenant names. */
export const RESERVED_SUBDOMAINS = [
  'www', 'api', 'app', 'admin', 'superadmin', 'manager', 'kitchen', 'table',
  'mail', 'smtp', 'ftp', 'default', 'onboard', 'blog', 'help', 'support',
  'docs', 'status', 'static', 'cdn', 'assets', 'dashboard', 'billing',
]
