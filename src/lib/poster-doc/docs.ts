// The 6 poster templates as PosterDoc data. The page clones a doc, overrides
// variables (accent/heading/text) with the restaurant's colours + per-field
// style tweaks, then resolveDoc + <PosterRenderer> draw it (preview + export).

import type { PosterDoc } from './types'

const FONT = "'Poppins','Segoe UI',system-ui,-apple-system,Arial,sans-serif"

// ── Scan to Order ───────────────────────────────────────────────────────────
const scan: PosterDoc = {
  version: 1, size: 'a3',
  variables: { accent: '#f97316', heading: '#ffffff', text: '#ffffff', font: FONT },
  background: { type: 'gradient', value: 'linear-gradient(160deg, {{accent}}, {{accent}}cc 55%, {{accent}}99)' },
  elements: [
    { id: 'logo', type: 'image', bind: 'logo', src: '', x: 470, y: 96, w: 140, h: 140, fit: 'cover', shape: 'circle' },
    { id: 'name', type: 'text', bind: 'restaurantName', content: 'Our Restaurant', x: 90, y: 258, w: 900, h: 64,
      style: { size: 46, weight: 800, color: '{{heading}}', align: 'center', case: 'upper', letterSpacing: 1 } },
    { id: 'headline', type: 'text', bind: 'headline', content: 'Scan to Order', x: 80, y: 340, w: 920, h: 190,
      style: { size: 92, weight: 900, color: '{{heading}}', align: 'center', case: 'upper', lineHeight: 1 } },
    { id: 'sub', type: 'text', bind: 'subtext', content: 'Browse our menu & order from your table', x: 140, y: 552, w: 800, h: 100,
      style: { size: 34, weight: 500, color: '{{text}}', align: 'center', lineHeight: 1.35 } },
    { id: 'qr', type: 'qr', bind: 'menuQr', x: 280, y: 680, w: 520, h: 520, bg: '#ffffff', radius: 28, padding: 26 },
    { id: 'url', type: 'text', bind: 'menuUrl', content: '', x: 90, y: 1235, w: 900, h: 56,
      style: { size: 30, weight: 600, color: '{{heading}}', align: 'center', letterSpacing: 1 } },
    { id: 'steps', type: 'text', content: 'Scan  ·  Browse  ·  Order', x: 90, y: 1330, w: 900, h: 56,
      style: { size: 32, weight: 700, color: '{{heading}}', align: 'center', case: 'upper', letterSpacing: 2 } },
  ],
}

// ── Cover Hero ──────────────────────────────────────────────────────────────
const cover: PosterDoc = {
  version: 1, size: 'a3',
  variables: { accent: '#e11d48', heading: '#ffffff', text: '#ffffff', font: FONT },
  background: { type: 'image', bind: 'coverImage', src: '', fit: 'cover',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,.05) 42%, rgba(0,0,0,.74) 100%)' },
  elements: [
    { id: 'namepill', type: 'shape', shape: 'pill', fill: '{{accent}}', x: 80, y: 74, w: 360, h: 76, z: 1 },
    { id: 'name', type: 'text', bind: 'restaurantName', content: 'Our Restaurant', x: 96, y: 74, w: 330, h: 76, z: 2,
      style: { size: 30, weight: 800, color: '{{heading}}', align: 'center', case: 'upper', letterSpacing: 2 } },
    { id: 'feats', type: 'features', x: 80, y: 178, w: 920, h: 56, z: 2, direction: 'row', gap: 14, align: 'left',
      chip: { fill: 'rgba(255,255,255,0.22)', color: '{{heading}}', size: 26, weight: 700, pill: true, padH: 22, padV: 10 } },
    { id: 'headline', type: 'text', bind: 'headline', content: 'Fresh & Delicious', x: 80, y: 1010, w: 920, h: 220, z: 2,
      style: { size: 118, weight: 900, color: '{{heading}}', align: 'left', lineHeight: 0.92, autoFit: true, shadow: '0 4px 24px rgba(0,0,0,.4)' } },
    { id: 'sub', type: 'text', bind: 'subtext', content: 'Made to order, every time', x: 80, y: 1236, w: 920, h: 70, z: 2,
      style: { size: 44, weight: 600, color: '{{text}}', align: 'left', shadow: '0 2px 12px rgba(0,0,0,.4)' } },
    { id: 'panel', type: 'shape', shape: 'rect', fill: 'rgba(255,255,255,0.16)', radius: 24, x: 70, y: 1330, w: 720, h: 150, z: 1 },
    { id: 'qr', type: 'qr', bind: 'menuQr', x: 92, y: 1352, w: 106, h: 106, bg: '#ffffff', radius: 14, padding: 10, z: 2 },
    { id: 'cta', type: 'text', bind: 'cta', content: 'Scan to Order', x: 222, y: 1356, w: 540, h: 48, z: 2,
      style: { size: 38, weight: 800, color: '{{heading}}', align: 'left' } },
    { id: 'ctaurl', type: 'text', bind: 'menuUrl', content: '', x: 222, y: 1410, w: 540, h: 40, z: 2,
      style: { size: 26, weight: 500, color: '{{text}}', align: 'left' } },
  ],
}

// ── Bold Type ───────────────────────────────────────────────────────────────
const bold: PosterDoc = {
  version: 1, size: 'a3',
  variables: { accent: '#f97316', heading: '#141414', text: '#444444', font: FONT },
  background: { type: 'color', value: '#f7f4ee' },
  elements: [
    { id: 'logo', type: 'image', bind: 'logo', src: '', x: 80, y: 90, w: 96, h: 96, fit: 'cover', shape: 'rect', radius: 22 },
    { id: 'name', type: 'text', bind: 'restaurantName', content: 'Our Restaurant', x: 196, y: 104, w: 700, h: 70,
      style: { size: 38, weight: 700, color: '{{heading}}', align: 'left', case: 'upper', letterSpacing: 3 } },
    { id: 'headline', type: 'text', bind: 'headline', content: 'Summer Special', x: 80, y: 360, w: 920, h: 460,
      style: { size: 150, weight: 900, color: '{{accent}}', align: 'left', case: 'upper', lineHeight: 0.9, autoFit: true } },
    { id: 'sub', type: 'text', bind: 'subtext', content: 'Fresh flavours, made to order', x: 80, y: 880, w: 800, h: 120,
      style: { size: 40, weight: 500, color: '{{text}}', align: 'left', lineHeight: 1.3 } },
    { id: 'rule', type: 'shape', shape: 'rect', fill: '{{heading}}', x: 80, y: 1180, w: 920, h: 6 },
    { id: 'qr', type: 'qr', bind: 'menuQr', x: 80, y: 1230, w: 180, h: 180, bg: '#ffffff', radius: 18 },
    { id: 'cta', type: 'text', bind: 'cta', content: 'Scan & Order', x: 300, y: 1240, w: 600, h: 66,
      style: { size: 52, weight: 900, color: '{{heading}}', align: 'left', case: 'upper' } },
    { id: 'url', type: 'text', bind: 'menuUrl', content: '', x: 300, y: 1320, w: 700, h: 44,
      style: { size: 30, weight: 600, color: '{{accent}}', align: 'left' } },
  ],
}

// ── Fresh Flyer ─────────────────────────────────────────────────────────────
const flyer: PosterDoc = {
  version: 1, size: 'a3',
  variables: { accent: '#e11d48', heading: '#1e1e1e', text: '#666666', font: FONT },
  background: { type: 'color', value: '#f7f5f1' },
  elements: [
    { id: 'c1', type: 'shape', shape: 'rect', fill: '#5a9e2f', radius: 90, x: -40, y: -40, w: 240, h: 240, z: 0 },
    { id: 'c2', type: 'shape', shape: 'rect', fill: '{{accent}}', radius: 90, x: 880, y: -40, w: 240, h: 240, z: 0 },
    { id: 'name', type: 'text', bind: 'restaurantName', content: 'Our Restaurant', x: 80, y: 96, w: 920, h: 50, z: 1,
      style: { size: 32, weight: 800, color: '{{accent}}', align: 'center', case: 'upper', letterSpacing: 3 } },
    { id: 'headline', type: 'text', bind: 'headline', content: 'Tasty Menu', x: 80, y: 160, w: 920, h: 150, z: 1,
      style: { size: 110, weight: 900, color: '{{accent}}', align: 'center', case: 'upper', autoFit: true } },
    { id: 'sub', type: 'text', bind: 'subtext', content: 'Enjoy the taste', x: 80, y: 320, w: 920, h: 60, z: 1,
      style: { size: 44, weight: 700, color: '{{heading}}', align: 'center' } },
    { id: 'hero', type: 'image', bind: 'coverImage', src: '', x: 270, y: 430, w: 540, h: 540, fit: 'cover', shape: 'circle',
      border: { width: 14, color: '#5a9e2f' }, z: 1 },
    { id: 'bubblebg', type: 'shape', shape: 'circle', fill: '#ffffff', border: { width: 6, color: '{{accent}}' }, x: 210, y: 450, w: 170, h: 170, z: 2 },
    { id: 'bubble', type: 'text', bind: 'badge', content: '', x: 210, y: 450, w: 170, h: 170, z: 3,
      style: { size: 48, weight: 900, color: '{{accent}}', align: 'center', lineHeight: 1 } },
    { id: 'cta', type: 'text', bind: 'cta', content: 'Free Home Delivery', x: 80, y: 1050, w: 620, h: 54, z: 1,
      style: { size: 36, weight: 800, color: '#5a9e2f', align: 'left' } },
    { id: 'phone', type: 'text', bind: 'phone', content: '', x: 80, y: 1110, w: 620, h: 56, z: 1,
      style: { size: 42, weight: 900, color: '{{accent}}', align: 'left' } },
    { id: 'url', type: 'text', bind: 'menuUrl', content: '', x: 80, y: 1180, w: 620, h: 40, z: 1,
      style: { size: 24, weight: 500, color: '{{text}}', align: 'left' } },
    { id: 'qr', type: 'qr', bind: 'menuQr', x: 820, y: 1060, w: 170, h: 170, bg: '#ffffff', radius: 16, z: 1 },
  ],
}

// ── Offer / Special ─────────────────────────────────────────────────────────
const offer: PosterDoc = {
  version: 1, size: 'a3',
  variables: { accent: '#e11d48', heading: '#ffffff', text: '#1a1a1a', font: FONT },
  background: { type: 'color', value: '#faf7f2' },
  elements: [
    { id: 'band', type: 'shape', shape: 'rect', fill: '{{accent}}', x: 0, y: 0, w: 1080, h: 560, radius: 0, z: 0 },
    { id: 'name', type: 'text', bind: 'restaurantName', content: 'Our Restaurant', x: 80, y: 74, w: 920, h: 50, z: 1,
      style: { size: 38, weight: 700, color: '{{heading}}', align: 'center', case: 'upper', letterSpacing: 3 } },
    { id: 'headline', type: 'text', bind: 'headline', content: "Today's Special", x: 80, y: 150, w: 920, h: 170, z: 1,
      style: { size: 100, weight: 900, color: '{{heading}}', align: 'center', case: 'upper', autoFit: true } },
    { id: 'sub', type: 'text', bind: 'subtext', content: 'Limited time only — grab it now!', x: 140, y: 380, w: 800, h: 100, z: 1,
      style: { size: 34, weight: 500, color: '{{heading}}', align: 'center', lineHeight: 1.3 } },
    { id: 'badgebg', type: 'shape', shape: 'circle', fill: '#ffffff', x: 838, y: 60, w: 172, h: 172, z: 2 },
    { id: 'badge', type: 'text', bind: 'badge', content: '', x: 838, y: 60, w: 172, h: 172, z: 3,
      style: { size: 48, weight: 900, color: '{{accent}}', align: 'center', lineHeight: 1 } },
    { id: 'dishes', type: 'repeater', source: 'items', limit: 5, cols: 1, gap: 18, horizontal: true, x: 80, y: 600, w: 920, h: 712,
      card: { fill: '#ffffff', radius: 24, imageH: 120, nameColor: '{{text}}', priceColor: '{{accent}}', nameSize: 38, priceSize: 42 } },
    { id: 'foot', type: 'shape', shape: 'rect', fill: '#1a1a1a', x: 0, y: 1330, w: 1080, h: 197, radius: 0, z: 0 },
    { id: 'qr', type: 'qr', bind: 'menuQr', x: 80, y: 1360, w: 150, h: 150, bg: '#ffffff', radius: 14, z: 1 },
    { id: 'cta', type: 'text', bind: 'cta', content: 'Scan to Order', x: 270, y: 1372, w: 500, h: 54, z: 1,
      style: { size: 44, weight: 800, color: '#ffffff', align: 'left' } },
    { id: 'url', type: 'text', bind: 'menuUrl', content: '', x: 270, y: 1436, w: 700, h: 40, z: 1,
      style: { size: 28, weight: 500, color: '#cccccc', align: 'left' } },
  ],
}

// ── Bento Grid ──────────────────────────────────────────────────────────────
const bento: PosterDoc = {
  version: 1, size: 'a3',
  variables: { accent: '#ea580c', heading: '#ffffff', text: '#141414', font: FONT },
  background: { type: 'color', value: '#f4f1ea' },
  elements: [
    { id: 'header', type: 'shape', shape: 'rect', fill: '{{accent}}', radius: 36, x: 54, y: 54, w: 972, h: 180, z: 0 },
    { id: 'name', type: 'text', bind: 'restaurantName', content: 'Our Restaurant', x: 110, y: 92, w: 620, h: 44, z: 1,
      style: { size: 34, weight: 700, color: '{{heading}}', align: 'left', case: 'upper', letterSpacing: 2 } },
    { id: 'headline', type: 'text', bind: 'headline', content: 'Taste the best', x: 110, y: 140, w: 620, h: 74, z: 1,
      style: { size: 60, weight: 900, color: '{{heading}}', align: 'left', lineHeight: 1 } },
    { id: 'logo', type: 'image', bind: 'logo', src: '', x: 852, y: 84, w: 120, h: 120, fit: 'cover', shape: 'rect', radius: 28, z: 1 },
    { id: 'dishes', type: 'repeater', source: 'items', limit: 4, cols: 2, gap: 26, x: 54, y: 260, w: 972, h: 1000,
      card: { fill: '#ffffff', radius: 36, imageH: 340, nameColor: '{{text}}', priceColor: '{{accent}}', nameSize: 34, priceSize: 34 } },
    { id: 'foot', type: 'shape', shape: 'rect', fill: '#141414', radius: 36, x: 54, y: 1290, w: 972, h: 180, z: 0 },
    { id: 'qr', type: 'qr', bind: 'menuQr', x: 110, y: 1320, w: 120, h: 120, bg: '#ffffff', radius: 16, z: 1 },
    { id: 'cta', type: 'text', bind: 'cta', content: 'Scan to Order', x: 270, y: 1332, w: 500, h: 54, z: 1,
      style: { size: 46, weight: 800, color: '#ffffff', align: 'left' } },
    { id: 'url', type: 'text', bind: 'menuUrl', content: '', x: 270, y: 1396, w: 700, h: 40, z: 1,
      style: { size: 28, weight: 500, color: '#aaaaaa', align: 'left' } },
  ],
}

export const POSTER_DOCS: Partial<Record<string, PosterDoc>> = { scan, cover, bold, flyer, offer, bento }
