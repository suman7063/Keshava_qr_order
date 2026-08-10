import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string; titleText?: string }

export const pdf2Config = { id: 'pdf2', label: 'Dark Elegant', preview: '#111111' }

export function getPdf2HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  const half = Math.ceil(grouped.length / 2)
  const left = grouped.slice(0, half)
  const right = grouped.slice(half)

  const renderGroup = (g: typeof grouped) => g.map(({ cat, items: ci }) => `
    <div class="category">
      <div class="cat-title">${cat.name}</div>
      ${ci.map(item => `
        <div class="item ${item.is_available ? '' : 'unavailable'}">
          <span class="name">${item.name}${item.is_vegetarian ? ' <span class="veg">●</span>' : ''}${item.description ? `<span class="desc">${item.description}</span>` : ''}</span>
          <span class="price">₹ ${Number(item.price).toFixed(0)}</span>
        </div>`).join('')}
    </div>`).join('')

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Georgia,serif;background:${options.bgColor || '#0d0d0d'};color:#f5f0e8;padding:40px 36px;min-height:100vh;}
    .header{text-align:center;margin-bottom:36px;border-bottom:1px solid ${options.textColor || '#c9a227'};padding-bottom:24px;}
    .menu-title{font-size:56px;font-weight:400;color:${options.textColor || '#c9a227'};font-style:italic;line-height:1;}
    .rest-name{font-size:14px;letter-spacing:6px;text-transform:uppercase;color:${options.textColor || '#c9a227'};margin-top:6px;font-style:normal;font-family:Arial,sans-serif;}
    .columns{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
    .category{margin-bottom:24px;}
    .cat-title{background:${options.textColor || '#c9a227'};color:${options.bgColor || '#0d0d0d'};font-size:13px;font-weight:700;font-style:italic;font-family:Georgia,serif;padding:6px 12px;margin-bottom:10px;}
    .item{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #2a2a2a;}
    .item:last-child{border:none;}
    .name{font-size:13px;font-family:Arial,sans-serif;font-weight:400;color:${options.subTextColor || '#f0ece4'};}
    .veg{color:#4ade80;font-size:9px;}
    .desc{display:block;font-size:9.5px;font-family:Arial,sans-serif;color:${options.subTextColor || '#f0ece4'};opacity:0.55;margin-top:1px;}
    .price{font-size:13px;font-family:Arial,sans-serif;color:${options.subTextColor || '#f0ece4'};white-space:nowrap;margin-left:8px;}
    .unavailable{opacity:0.3;}
    .footer{text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid ${options.textColor || '#c9a227'};font-size:11px;color:#888;letter-spacing:2px;font-family:Arial,sans-serif;}
    @media print{@page{margin:10mm;size:A4;background:#0d0d0d;}body{padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body>
    <div class="header">
      <div class="menu-title">${options.titleText || 'Menu'}</div>
      <div class="rest-name">${restaurantName}</div>
    </div>
    <div class="columns">
      <div>${renderGroup(left)}</div>
      <div>${renderGroup(right)}</div>
    </div>
    <div class="footer">${new Date().getFullYear()} · ${restaurantName}</div>
  </body></html>`
}
