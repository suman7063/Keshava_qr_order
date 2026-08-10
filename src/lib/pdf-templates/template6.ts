import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string; titleText?: string }

// Pocket price-list, modelled on the Sagars reference: warm cream page,
// dark-brown rounded section bars, orange letter-spaced subcategory
// headings inside each section, bold item rows with hairline separators.
export const pdf6Config = { id: 'pdf6', label: 'Pocket Price List', preview: '#f4ead7' }

export function getPdf6HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const bg = options.bgColor || '#f4ead7'
  const brown = options.textColor || '#3a2413'
  const accent = options.subTextColor || '#c2701d'

  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  const itemRow = (item: MenuItem) => `
    <div class="item ${item.is_available ? '' : 'unavailable'}">
      <span class="name">${item.name}${item.is_vegetarian ? ' <span class="veg">●</span>' : ''}</span>
      <span class="price">₹${Number(item.price).toFixed(0)}</span>
    </div>`

  const renderGroup = (g: typeof grouped) => g.map(({ cat, items: ci }) => {
    // Two levels like the reference: orange subcategory headings inside
    // the brown section. Items without a subcategory list first, plain.
    const order: string[] = []
    const bySub = new Map<string, MenuItem[]>()
    for (const it of ci) {
      const key = (it.subcategory || '').trim()
      if (!bySub.has(key)) { bySub.set(key, []); order.push(key) }
      bySub.get(key)!.push(it)
    }
    // Plain (no-subcategory) items always lead
    order.sort((a, b) => (a === '' ? -1 : b === '' ? 1 : 0))

    const sections = order.map(key => {
      const rows = bySub.get(key)!.map(itemRow).join('')
      return key ? `<div class="subcat">${key}</div>${rows}` : rows
    }).join('')

    return `
      <div class="category">
        <div class="cat-bar">${cat.name}</div>
        ${sections}
      </div>`
  }).join('')

  return `<html><head><title>${restaurantName} — Price List</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Verdana,Arial,sans-serif;background:${bg};color:${brown};padding:36px 34px;min-height:100vh;}
    .header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;
      border-bottom:3px double ${brown}80;padding-bottom:14px;margin-bottom:26px;}
    .title{font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:800;color:${brown};letter-spacing:0.5px;}
    .tagline{font-size:11px;color:${brown}99;}
    .tagline b{color:${accent};font-weight:400;}
    /* Multi-column flow: content fills column 1 then column 2 on every
       page — a manual grid split leaves giant gaps when a big category
       can't fit on one page. */
    .columns{column-count:2;column-gap:40px;}
    .category{margin-bottom:22px;}
    .cat-bar{background:${brown};color:#fdf6e9;font-size:14px;font-weight:800;text-transform:uppercase;
      letter-spacing:2px;padding:9px 16px;border-radius:8px;margin-bottom:6px;
      break-inside:avoid;break-after:avoid;}
    .subcat{color:${accent};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;
      margin:14px 4px 3px;break-after:avoid;}
    .item{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6.5px 4px;
      border-bottom:1px solid ${brown}1f;break-inside:avoid;}
    .item:last-child{border-bottom:none;}
    .name{font-size:12.5px;font-weight:700;color:${brown};}
    .veg{color:#3f9e3f;font-size:9px;}
    .price{font-size:12.5px;font-weight:800;color:${brown};white-space:nowrap;}
    .unavailable{opacity:0.35;}
    .footer{text-align:center;margin-top:26px;padding-top:14px;border-top:3px double ${brown}80;
      font-size:10.5px;color:${brown}99;}
    .footer b{color:${accent};font-weight:400;}
    @media print{@page{margin:10mm;size:A4;}body{padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body>
    <div class="header">
      <div class="title">${options.titleText || `${restaurantName} — Price List`}</div>
      <div class="tagline">Authentic Flavors <b>•</b> Fresh Ingredients <b>•</b> Made with Love</div>
    </div>
    <div class="columns">${renderGroup(grouped)}</div>
    <div class="footer">${restaurantName} · Authentic Flavors <b>·</b> Fresh Ingredients <b>·</b> Made with Love — All prices inclusive of taxes</div>
  </body></html>`
}
