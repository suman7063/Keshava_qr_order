import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string }

// Pocket price-list: warm cream page, dark-brown rounded section bars,
// bold item rows with hairline separators, orange accents.
export const pdf6Config = { id: 'pdf6', label: 'Pocket Price List', preview: '#f4ead7' }

export function getPdf6HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const bg = options.bgColor || '#f4ead7'
  const brown = options.textColor || '#3a2413'
  const accent = options.subTextColor || '#c2701d'

  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  // Balance the two columns by item count, not category count
  const totalRows = grouped.reduce((s, g) => s + g.items.length + 2, 0)
  const left: typeof grouped = []
  const right: typeof grouped = []
  let used = 0
  for (const g of grouped) {
    if (used < totalRows / 2) { left.push(g); used += g.items.length + 2 }
    else right.push(g)
  }

  const renderGroup = (g: typeof grouped) => g.map(({ cat, items: ci }) => `
    <div class="category">
      <div class="cat-bar">${cat.name}</div>
      ${ci.map(item => `
        <div class="item ${item.is_available ? '' : 'unavailable'}">
          <span class="name">${item.name}${item.is_vegetarian ? ' <span class="veg">●</span>' : ''}</span>
          <span class="price">₹${Number(item.price).toFixed(0)}</span>
        </div>`).join('')}
    </div>`).join('')

  return `<html><head><title>${restaurantName} — Price List</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Verdana,Arial,sans-serif;background:${bg};color:${brown};padding:36px 34px;min-height:100vh;}
    .header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;
      border-bottom:1px solid ${brown}40;padding-bottom:14px;margin-bottom:26px;}
    .title{font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:800;color:${brown};letter-spacing:0.5px;}
    .tagline{font-size:11px;color:${brown}99;}
    .tagline b{color:${accent};font-weight:400;}
    .columns{display:grid;grid-template-columns:1fr 1fr;gap:0 36px;}
    .category{margin-bottom:20px;break-inside:avoid;}
    .cat-bar{background:${brown};color:#fdf6e9;font-size:13px;font-weight:800;text-transform:uppercase;
      letter-spacing:1.5px;padding:8px 14px;border-radius:7px;margin-bottom:8px;}
    .item{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6.5px 4px;
      border-bottom:1px solid ${brown}1f;}
    .item:last-child{border-bottom:none;}
    .name{font-size:12.5px;font-weight:700;color:${brown};}
    .veg{color:#3f9e3f;font-size:9px;}
    .price{font-size:12.5px;font-weight:800;color:${brown};white-space:nowrap;}
    .unavailable{opacity:0.35;}
    .footer{text-align:center;margin-top:26px;padding-top:14px;border-top:1px solid ${brown}40;
      font-size:10.5px;color:${brown}99;}
    .footer b{color:${accent};font-weight:400;}
    @media print{@page{margin:10mm;size:A4;}body{padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body>
    <div class="header">
      <div class="title">${restaurantName} — Price List</div>
      <div class="tagline">Authentic Flavors <b>•</b> Fresh Ingredients <b>•</b> Made with Love</div>
    </div>
    <div class="columns">
      <div>${renderGroup(left)}</div>
      <div>${renderGroup(right)}</div>
    </div>
    <div class="footer">${restaurantName} · Authentic Flavors <b>·</b> Fresh Ingredients <b>·</b> Made with Love — All prices inclusive of taxes</div>
  </body></html>`
}
