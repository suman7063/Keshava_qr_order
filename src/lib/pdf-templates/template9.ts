import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string; titleText?: string }

// Card grid WITHOUT photos: compact bordered cards — name + price up top,
// description under. Same layout family as Photo Cards, just text-only.
export const pdf9Config = { id: 'pdf9', label: 'Clean Cards', preview: '#f8fafc' }

export function getPdf9HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const bg = options.bgColor || '#f8fafc'
  const accent = options.textColor || '#0f766e'
  const text = options.subTextColor || '#334155'

  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  const card = (item: MenuItem) => `
    <div class="card ${item.is_available ? '' : 'unavailable'}">
      <div class="card-top">
        <div class="card-name">${item.name}${item.is_vegetarian ? ' <span class="veg">●</span>' : ''}</div>
        <div class="card-price">₹${Number(item.price).toFixed(0)}</div>
      </div>
      ${item.description ? `<div class="card-desc">${item.description}</div>` : ''}
    </div>`

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:${bg};color:${text};padding:36px 32px;min-height:100vh;}
    .header{text-align:center;margin-bottom:30px;}
    .rest{font-size:30px;font-weight:800;color:${accent};letter-spacing:0.5px;}
    .sub{font-size:11px;color:${text}99;letter-spacing:4px;text-transform:uppercase;margin-top:4px;}
    .category{margin-bottom:26px;}
    .cat-title{font-size:16px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:2px;
      display:flex;align-items:center;gap:12px;margin-bottom:12px;break-after:avoid;}
    .cat-title:after{content:'';flex:1;height:2px;background:${accent}33;border-radius:2px;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
    .card{background:#fff;border:1px solid ${accent}22;border-left:4px solid ${accent};border-radius:10px;
      padding:10px 12px;break-inside:avoid;}
    .card-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}
    .card-name{font-size:12.5px;font-weight:700;color:${text};line-height:1.3;}
    .veg{color:#3f9e3f;font-size:9px;}
    .card-price{font-size:13px;font-weight:800;color:${accent};white-space:nowrap;}
    .card-desc{font-size:10px;color:${text}99;line-height:1.35;margin-top:4px;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .unavailable{opacity:0.35;}
    .footer{text-align:center;margin-top:24px;font-size:10px;color:${text}77;letter-spacing:3px;text-transform:uppercase;}
    /* phones: 3 cards don't fit — drop to 2 per row */
    @media (max-width:640px){.grid{grid-template-columns:repeat(2,1fr);}}
    @media print{@page{margin:10mm;size:A4;}body{padding:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body>
    <div class="header">
      <div class="rest">${options.titleText || restaurantName}</div>
      <div class="sub">Menu</div>
    </div>
    ${grouped.map(({ cat, items: ci }) => `
      <div class="category">
        <div class="cat-title">${cat.name}</div>
        <div class="grid">${ci.map(card).join('')}</div>
      </div>`).join('')}
    <div class="footer">${restaurantName}</div>
  </body></html>`
}
