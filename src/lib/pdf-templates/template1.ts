import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string }

export const pdf1Config = { id: 'pdf1', label: 'Classic White', preview: '#ffffff' }

export function getPdf1HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;padding:32px 40px;color:#111;background:${options.bgColor || '#fff'};}
    h1{font-size:32px;font-weight:900;text-align:center;margin-bottom:4px;}
    .sub{text-align:center;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:28px;}
    .category{margin-bottom:24px;}
    .cat-title{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${options.textColor || '#f59e0b'};border-bottom:2px solid ${options.textColor || '#f59e0b'};padding-bottom:6px;margin-bottom:10px;}
    .item{display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f3f4f6;}
    .item:last-child{border:none;}
    .name{font-weight:600;font-size:13px;color:${options.subTextColor || '#111'};}
    .desc{font-size:11px;color:#6b7280;margin-top:2px;}
    .veg{font-size:9px;background:#dcfce7;color:#16a34a;padding:1px 5px;border-radius:999px;margin-left:5px;vertical-align:middle;}
    .price{font-weight:700;font-size:13px;color:${options.textColor || '#f59e0b'};white-space:nowrap;margin-left:12px;}
    .unavailable{opacity:0.35;}
    @media print{@page{margin:15mm;size:A4;}body{padding:0;}}
  </style></head>
  <body>
    <h1>${restaurantName}</h1>
    <p class="sub">Menu</p>
    ${grouped.map(({ cat, items: ci }) => `
      <div class="category">
        <div class="cat-title">${cat.name}</div>
        ${ci.map(item => `
          <div class="item ${item.is_available ? '' : 'unavailable'}">
            <div>
              <span class="name">${item.name}</span>${item.is_vegetarian ? '<span class="veg">Veg</span>' : ''}
              ${item.description ? `<div class="desc">${item.description}</div>` : ''}
            </div>
            <div class="price">₹${Number(item.price).toFixed(2)}</div>
          </div>`).join('')}
      </div>`).join('')}
  </body></html>`
}
