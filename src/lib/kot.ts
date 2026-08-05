import type { Order, OrderItem, MenuCategory, KitchenStation } from '@/types'

/**
 * KOT routing: every order item belongs to exactly one kitchen —
 *   item.station_id (override) → category.default_station_id → Main Kitchen.
 * A restaurant with no kitchens configured gets one plain slip, as before.
 * (Internal names say "station"; every user-visible string says "Kitchen".)
 */

export interface KotSlip {
  /** null = Main Kitchen (unassigned items) */
  kitchenId: string | null
  /** '' when the restaurant has no kitchens configured (single plain slip) */
  kitchenName: string
  items: OrderItem[]
}

export function resolveKitchenId(
  item: OrderItem,
  categoriesById: Map<string, MenuCategory>
): string | null {
  const mi = item.menu_item
  if (!mi) return null
  if (mi.station_id) return mi.station_id
  return categoriesById.get(mi.category_id)?.default_station_id || null
}

export function splitOrderByKitchen(
  order: Order,
  categories: MenuCategory[],
  stations: KitchenStation[]
): KotSlip[] {
  const items = order.items || []
  if (stations.length === 0) return [{ kitchenId: null, kitchenName: '', items }]

  const categoriesById = new Map(categories.map(c => [c.id, c]))
  const stationsById = new Map(stations.map(s => [s.id, s]))
  const groups = new Map<string, KotSlip>()

  for (const item of items) {
    const resolved = resolveKitchenId(item, categoriesById)
    const key = resolved && stationsById.has(resolved) ? resolved : 'main'
    const slip = groups.get(key) || {
      kitchenId: key === 'main' ? null : key,
      kitchenName: key === 'main' ? 'Main Kitchen' : stationsById.get(key)!.name,
      items: [],
    }
    slip.items.push(item)
    groups.set(key, slip)
  }
  return [...groups.values()]
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export interface KotMeta {
  restaurantName: string
  tableNumber: string
  orderCode: string
  when: string
}

/**
 * Print-ready HTML: one 280px thermal slip per kitchen, each on its own
 * page (page-break) so multi-kitchen orders come out as separate tickets.
 */
export function buildKotHTML(slips: KotSlip[], meta: KotMeta): string {
  const slipHtml = slips
    .map((s, i) => `
      <div class="slip"${i < slips.length - 1 ? ' style="page-break-after:always"' : ''}>
        <h2>KOT</h2>
        ${s.kitchenName ? `<div class="kitchen">■ ${esc(s.kitchenName.toUpperCase())} ■</div>` : ''}
        <div class="sub">${esc(meta.restaurantName)}</div>
        <div class="divider"></div>
        <p style="margin:4px 0;font-size:14px;"><strong>Table:</strong> ${esc(meta.tableNumber)}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Order#:</strong> ${esc(meta.orderCode)}</p>
        <p style="margin:4px 0;font-size:12px;color:#555;">${esc(meta.when)}</p>
        <div class="divider"></div>
        <table>
          <thead><tr><th>Item</th><th style="text-align:center;">Qty</th></tr></thead>
          <tbody>
            ${s.items.map(it => `
              <tr>
                <td style="padding:4px 8px;font-size:14px;">${esc(it.menu_item?.name || '')}</td>
                <td style="padding:4px 8px;font-size:14px;text-align:right;font-weight:bold;">${it.quantity > 1 ? `×${it.quantity}` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="footer">— Kitchen Copy —</div>
      </div>`)
    .join('')

  return `
    <html><head><title>KOT</title>
    <style>
      body { font-family: monospace; margin: 0; }
      .slip { width: 280px; margin: 0 auto; padding: 12px; }
      h2 { text-align: center; font-size: 18px; margin: 0 0 4px; }
      .kitchen { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px; }
      .sub { text-align: center; font-size: 12px; color: #555; margin-bottom: 12px; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { font-size: 12px; text-transform: uppercase; color: #888; padding: 4px 8px; text-align: left; }
      .footer { text-align: center; font-size: 11px; color: #888; margin-top: 12px; }
    </style></head>
    <body>${slipHtml}</body></html>`
}

/**
 * Print HTML without a popup: a throwaway hidden iframe. Works from
 * non-user-gesture contexts (auto-print) and never trips popup blockers.
 * With Chrome's --kiosk-printing flag the dialog is skipped entirely.
 */
export function printHtml(html: string) {
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  frame.srcdoc = html
  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } finally {
      // Give the print spooler time before tearing the frame down
      setTimeout(() => frame.remove(), 60_000)
    }
  }
  document.body.appendChild(frame)
}
