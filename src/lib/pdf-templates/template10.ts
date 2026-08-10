import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string; titleText?: string }

// One category per page, book style: each page opens with the restaurant
// line and a big category title, items in a single generous column below.
// Leftover space on a page stays blank on purpose — the next category
// always starts fresh on its own page.
export const pdf10Config = { id: 'pdf10', label: 'Category Pages', preview: '#fffdf6' }

export function getPdf10HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const bg = options.bgColor || '#fffdf6'
  const accent = options.textColor || '#8b2332'
  const text = options.subTextColor || '#33302b'

  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  const itemRow = (item: MenuItem) => `
    <div class="item ${item.is_available ? '' : 'unavailable'}">
      <div class="row">
        <span class="name">${item.name}${item.is_vegetarian ? ' <span class="veg">●</span>' : ''}</span>
        <span class="dots"></span>
        <span class="price">₹${Number(item.price).toFixed(0)}</span>
      </div>
      ${item.description ? `<div class="desc">${item.description}</div>` : ''}
    </div>`

  const page = ({ cat, items: ci }: { cat: MenuCategory; items: MenuItem[] }, idx: number) => `
    <div class="page">
      <div class="rest-small">${options.titleText || restaurantName}</div>
      <div class="cat-name">${cat.name}</div>
      <div class="rule"><span>◆</span></div>
      <div class="list">${ci.map(itemRow).join('')}</div>
      <div class="page-foot">${idx + 1} / ${grouped.length}</div>
    </div>`

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Georgia,'Times New Roman',serif;background:${bg};color:${text};}
    /* One category = one page; leftover space stays blank on purpose */
    .page{min-height:100vh;padding:52px 56px 40px;display:flex;flex-direction:column;break-after:page;}
    .page:last-child{break-after:auto;}
    .rest-small{text-align:center;font-size:12px;letter-spacing:5px;text-transform:uppercase;color:${text}99;margin-bottom:18px;}
    .cat-name{text-align:center;font-size:40px;font-weight:700;color:${accent};letter-spacing:1px;line-height:1.1;}
    .rule{display:flex;align-items:center;gap:14px;margin:16px auto 30px;width:260px;color:${accent};}
    .rule:before,.rule:after{content:'';flex:1;height:1px;background:${accent}66;}
    .rule span{font-size:11px;}
    .list{max-width:620px;width:100%;margin:0 auto;}
    .item{margin-bottom:16px;break-inside:avoid;}
    .row{display:flex;align-items:baseline;gap:8px;}
    .name{font-size:15px;font-weight:700;color:${text};}
    .veg{color:#3f9e3f;font-size:10px;}
    .dots{flex:1;border-bottom:2px dotted ${text}44;transform:translateY(-3px);}
    .price{font-size:15px;font-weight:700;color:${accent};white-space:nowrap;}
    .desc{font-size:11.5px;color:${text}99;font-style:italic;margin-top:3px;max-width:520px;}
    .unavailable{opacity:0.35;}
    .page-foot{margin-top:auto;padding-top:24px;text-align:center;font-size:10px;letter-spacing:3px;color:${text}77;}
    @media print{
      @page{margin:0;size:A4;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .page{min-height:297mm;}
    }
  </style></head>
  <body>
    ${grouped.map(page).join('')}
  </body></html>`
}
