import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string; titleText?: string }

// Card grid WITH photos: every item is a rounded card — image on top,
// name + price below. Items without a photo get a soft gradient tile.
export const pdf8Config = { id: 'pdf8', label: 'Photo Cards', preview: '#fff7ed' }

export function getPdf8HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const bg = options.bgColor || '#fff7ed'
  const accent = options.textColor || '#ea580c'
  const text = options.subTextColor || '#44403c'

  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  const card = (item: MenuItem) => `
    <div class="card ${item.is_available ? '' : 'unavailable'}">
      ${item.image_url
        ? `<img class="card-img" src="${item.image_url}" alt=""/>`
        : `<div class="card-img card-img-empty">🍽</div>`}
      <div class="card-body">
        <div class="card-name">${item.name}${item.is_vegetarian ? ' <span class="veg">●</span>' : ''}</div>
        ${item.description ? `<div class="card-desc">${item.description}</div>` : ''}
        <div class="card-price">₹${Number(item.price).toFixed(0)}</div>
      </div>
    </div>`

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:${bg};color:${text};padding:36px 32px;min-height:100vh;}
    .header{text-align:center;margin-bottom:30px;}
    .rest{font-size:30px;font-weight:800;color:${accent};letter-spacing:0.5px;}
    .sub{font-size:11px;color:${text}99;letter-spacing:4px;text-transform:uppercase;margin-top:4px;}
    .category{margin-bottom:28px;}
    .cat-title{font-size:17px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:2px;
      display:flex;align-items:center;gap:12px;margin-bottom:14px;break-after:avoid;}
    .cat-title:after{content:'';flex:1;height:2px;background:${accent}33;border-radius:2px;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
    .card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.07);
      break-inside:avoid;display:flex;flex-direction:column;}
    /* Square, like the upload crop — the full photo shows, nothing cut off */
    .card-img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;}
    .card-img-empty{display:flex;align-items:center;justify-content:center;font-size:30px;
      background:linear-gradient(135deg,${accent}22,${accent}44);}
    .card-body{padding:10px 12px 12px;display:flex;flex-direction:column;flex:1;}
    .card-name{font-size:12.5px;font-weight:700;color:${text};line-height:1.3;}
    .veg{color:#3f9e3f;font-size:9px;}
    .card-desc{font-size:10px;color:${text}99;line-height:1.35;margin-top:3px;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .card-price{font-size:14px;font-weight:800;color:${accent};margin-top:auto;padding-top:6px;}
    .unavailable{opacity:0.35;}
    .footer{text-align:center;margin-top:24px;font-size:10px;color:${text}77;letter-spacing:3px;text-transform:uppercase;}
    /* phones: 2 per row, and shorter (4:3) photos so cards stay compact —
       print/desktop keep the full square photo */
    @media (max-width:640px){
      .grid{grid-template-columns:repeat(2,1fr);gap:10px;}
      .card-img{aspect-ratio:4/3;}
      .card-body{padding:8px 10px 10px;}
    }
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
