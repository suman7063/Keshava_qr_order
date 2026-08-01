// Poster generator — print-ready marketing posters built from restaurant data.
// Each template is a self-contained HTML string rendered in an iframe (preview),
// exported to PNG (html-to-image) and PDF (jsPDF). All posters share the
// A-series portrait ratio (1:√2), so one design works for A4/A3/A2 — the size
// only changes the physical print dimensions.

import { scanPosterHTML } from './scanToOrder'
import { offerPosterHTML } from './offer'
import { bentoPosterHTML } from './bento'
import { boldPosterHTML } from './boldType'
import { coverPosterHTML } from './coverHero'
import { flyerPosterHTML } from './flyer'

export type PosterTemplate = 'scan' | 'cover' | 'flyer' | 'bold' | 'offer' | 'bento'
export type PosterSizeKey = 'a4' | 'a3' | 'a2'

export interface PosterItem {
  name: string
  price: number
  image_url?: string | null
  is_vegetarian?: boolean | null
}

export interface PosterData {
  restaurantName: string
  logoUrl?: string | null
  coverUrl?: string | null
  accent: string        // brand colour (hex)
  qrDataUrl: string     // QR pointing at the public menu page
  menuUrl: string       // human-readable url shown under the QR
  headline?: string     // typed by the admin (offer / menu title)
  subtext?: string      // typed by the admin (supporting line)
  badge?: string        // small offer badge, e.g. "50% OFF"
  phone?: string        // contact number
  cta?: string          // call-to-action / website, e.g. "ORDER NOW"
  features?: string[]   // feature chips, e.g. ["100% Fresh", "Made to Order"]
  items?: PosterItem[]  // featured / highlighted dishes
}

// Render resolution (px). All A-series sizes share this 1:√2 ratio.
export const POSTER_W = 1080
export const POSTER_H = 1527

export const POSTER_SIZES: Record<PosterSizeKey, { w: number; h: number; label: string }> = {
  a4: { w: 210, h: 297, label: 'A4 · small' },
  a3: { w: 297, h: 420, label: 'A3 · medium' },
  a2: { w: 420, h: 594, label: 'A2 · large' },
}

// How many dishes each template shows (0 = doesn't use dishes).
export const POSTER_ITEM_CAP: Record<PosterTemplate, number> = {
  scan: 0, cover: 0, flyer: 0, bold: 0, offer: 5, bento: 4,
}

export const POSTER_TEMPLATES: { id: PosterTemplate; label: string; desc: string }[] = [
  { id: 'scan',  label: 'Scan to Order',   desc: 'Big QR + branding' },
  { id: 'cover', label: 'Cover Hero',      desc: 'Full photo + headline' },
  { id: 'flyer', label: 'Fresh Flyer',     desc: 'Bright, delivery info' },
  { id: 'bold',  label: 'Bold Type',       desc: 'Oversized typography' },
  { id: 'offer', label: 'Offer / Special', desc: 'Headline + dishes' },
  { id: 'bento', label: 'Bento Grid',      desc: 'Trendy dish grid' },
]

export function money(n: number): string {
  return '₹' + (Number.isInteger(n) ? n.toString() : n.toFixed(2))
}

/** Escape user-supplied text before putting it in the HTML string. */
export function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/** Wrap a template body in a full HTML document sized to the render resolution. */
export function posterDoc(inner: string, css: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:${POSTER_W}px;height:${POSTER_H}px;overflow:hidden;
      font-family:'Poppins','Segoe UI',system-ui,-apple-system,Arial,sans-serif;
      -webkit-font-smoothing:antialiased;}
    .poster{width:${POSTER_W}px;height:${POSTER_H}px;position:relative;overflow:hidden;background:#fff;}
    .qrwrap{background:#fff;border-radius:28px;padding:26px;display:inline-block;
      box-shadow:0 20px 50px rgba(0,0,0,0.18);}
    .qrwrap img{display:block;width:100%;height:100%;}
    ${css}
  </style></head><body><div class="poster">${inner}</div></body></html>`
}

export function getPosterHTML(template: PosterTemplate, data: PosterData): string {
  switch (template) {
    case 'offer': return offerPosterHTML(data)
    case 'bento': return bentoPosterHTML(data)
    case 'bold':  return boldPosterHTML(data)
    case 'cover': return coverPosterHTML(data)
    case 'flyer': return flyerPosterHTML(data)
    default:      return scanPosterHTML(data)
  }
}
