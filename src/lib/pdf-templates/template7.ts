import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string; titleText?: string }

// Café price list — same warm palette as the Pocket Price List, but each
// category gets a FULL-WIDTH brown bar with its own two-column item flow
// underneath (the Pocket variant flows everything in one continuous
// two-column stream instead).
export const pdf7Config = { id: 'pdf7', label: 'Café Price List', preview: '#efe3cb' }

export function getPdf7HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
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

  const renderCategory = ({ cat, items: ci }: { cat: MenuCategory; items: MenuItem[] }) => {
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
      const group = bySub.get(key)!
      // A subcategory holding a single item of the same name collapses into
      // one compact accent row with the price — like "RAGI DOSA · ₹85".
      if (key && group.length === 1 && group[0].name.trim().toLowerCase() === key.toLowerCase()) {
        const it = group[0]
        return `
          <div class="solo ${it.is_available ? '' : 'unavailable'}">
            <span>${key}${it.is_vegetarian ? ' <span class="veg">●</span>' : ''}</span>
            <span class="price">₹${Number(it.price).toFixed(0)}</span>
          </div>`
      }
      const rows = group.map(itemRow).join('')
      return key ? `<div class="subcat">${key}</div>${rows}` : rows
    }).join('')

    return `
      <div class="category">
        <div class="cat-bar">${cat.name}</div>
        <div class="columns">${sections}</div>
      </div>`
  }

  return `<html><head><title>${restaurantName} — Price List</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Verdana,Arial,sans-serif;background:${bg};color:${brown};padding:36px 34px;min-height:100vh;}
    .header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;
      border-bottom:3px double ${brown}80;padding-bottom:14px;margin-bottom:26px;}
    .title{font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:800;color:${brown};letter-spacing:0.5px;}
    .tagline{font-size:11px;color:${brown}99;}
    .tagline b{color:${accent};font-weight:400;}
    .category{margin-bottom:26px;}
    .cat-bar{background:${brown};color:#fdf6e9;font-size:15px;font-weight:800;text-transform:uppercase;
      letter-spacing:2.5px;padding:10px 18px;border-radius:10px;margin-bottom:12px;
      break-inside:avoid;break-after:avoid;}
    /* Items flow column 1 → column 2 within THIS category only */
    .columns{column-count:2;column-gap:44px;padding:0 4px;}
    .subcat{color:${accent};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;
      margin:14px 4px 3px;break-after:avoid;}
    .subcat:first-child{margin-top:2px;}
    .solo{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
      color:${accent};font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:2px;
      margin-top:14px;padding:0 4px 7px;border-bottom:1px solid ${brown}1f;break-inside:avoid;}
    .solo:first-child{margin-top:2px;}
    .solo .price{color:${brown};letter-spacing:0;}
    .item{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6.5px 4px;
      border-bottom:1px solid ${brown}1f;break-inside:avoid;}
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
    ${grouped.map(renderCategory).join('')}
    <div class="footer">${restaurantName} · Authentic Flavors <b>·</b> Fresh Ingredients <b>·</b> Made with Love — All prices inclusive of taxes</div>
  </body></html>`
}
