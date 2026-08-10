import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string }

export const pdf5Config = { id: 'pdf5', label: 'Dark Street', preview: '#111111' }

export function getPdf5HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const grouped = categories.map(cat => ({
    cat,
    items: items.filter(i => i.category_id === cat.id),
    img: items.find(i => i.category_id === cat.id && i.image_url)?.image_url || '',
  })).filter(g => g.items.length > 0)

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:${options.bgColor || '#111'};color:#fff;min-height:100vh;}
    .page{min-height:800px;max-width:760px;margin:0 auto;}
    .right{padding:32px 36px;position:relative;background:${options.bgColor || '#111'};}
    .paint-stroke{
      position:absolute;top:0;right:0;
      width:160px;height:60px;
      background:${options.textColor || '#f5a623'};
      clip-path:polygon(10% 0%,100% 0%,100% 70%,90% 100%,0% 80%,5% 30%);
      opacity:0.9;
    }
    .title-wrap{margin-bottom:24px;margin-top:8px;}
    .title-food{font-size:36px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:3px;line-height:1;}
    .title-menu{font-size:52px;font-weight:900;color:${options.textColor || '#f5a623'};text-transform:uppercase;letter-spacing:2px;line-height:1;}
    .divider{width:120px;height:3px;background:${options.textColor || '#f5a623'};margin-top:8px;}
    .category{margin-bottom:26px;}
    .cat-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
    .cat-title{font-size:22px;font-weight:900;color:${options.textColor || '#f5a623'};text-transform:uppercase;letter-spacing:2px;}
    .cat-img{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid ${options.textColor || '#f5a623'};}
    .cat-img-placeholder{width:64px;height:64px;border-radius:50%;background:#222;border:3px solid ${options.textColor || '#f5a623'};display:flex;align-items:center;justify-content:center;font-size:22px;}
    .item{display:flex;align-items:center;margin-bottom:5px;font-size:13px;}
    .bullet{color:${options.textColor || '#f5a623'};margin-right:8px;font-size:10px;}
    .name{flex:1;color:${options.subTextColor || '#e0e0e0'};}
    .price{font-weight:700;color:#fff;white-space:nowrap;margin-left:16px;}
    .unavailable{opacity:0.35;}
    .rest-footer{margin-top:20px;font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;text-align:right;}
    @media print{
      @page{margin:0;size:A4;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .page{min-height:297mm;}
    }
  </style></head>
  <body>
    <div class="page">
      <div class="right">
        <div class="paint-stroke"></div>
        <div class="title-wrap">
          <div class="title-food">Food</div>
          <div class="title-menu">Menu</div>
          <div class="divider"></div>
        </div>
        ${grouped.map(({ cat, items: ci, img }, idx) => `
          <div class="category">
            <div class="cat-row">
              <div class="cat-title">${cat.name}</div>
              ${idx % 2 === 1
                ? img
                  ? `<img class="cat-img" src="${img}" />`
                  : `<div class="cat-img-placeholder">🍽</div>`
                : ''}
            </div>
            ${ci.map(item => `
              <div class="item ${item.is_available ? '' : 'unavailable'}">
                <span class="bullet">●</span>
                <span class="name">${item.name}${item.is_vegetarian ? ' <span style="color:#4ade80;font-size:9px">●</span>' : ''}</span>
                <span class="price">₹${Number(item.price).toFixed(0)}</span>
              </div>`).join('')}
          </div>`).join('')}
        <div class="rest-footer">${restaurantName}</div>
      </div>
    </div>
  </body></html>`
}
