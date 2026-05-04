import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string }

export const pdf4Config = { id: 'pdf4', label: 'Rustic Wood', preview: '#5c3010' }

export function getPdf4HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  // Torn paper clip-path (jagged top and bottom)
  const tornClip = `polygon(
    0% 3%, 2% 1%, 5% 4%, 8% 1%, 11% 3%, 14% 0%, 17% 3%, 20% 1%,
    23% 4%, 26% 1%, 29% 3%, 32% 0%, 35% 3%, 38% 1%, 41% 4%, 44% 1%,
    47% 3%, 50% 0%, 53% 3%, 56% 1%, 59% 4%, 62% 1%, 65% 3%, 68% 0%,
    71% 3%, 74% 1%, 77% 4%, 80% 1%, 83% 3%, 86% 0%, 89% 3%, 92% 1%,
    95% 4%, 98% 1%, 100% 3%,
    100% 97%, 98% 99%, 95% 96%, 92% 99%, 89% 97%, 86% 100%, 83% 97%,
    80% 99%, 77% 96%, 74% 99%, 71% 97%, 68% 100%, 65% 97%, 62% 99%,
    59% 96%, 56% 99%, 53% 97%, 50% 100%, 47% 97%, 44% 99%, 41% 96%,
    38% 99%, 35% 97%, 32% 100%, 29% 97%, 26% 99%, 23% 96%, 20% 99%,
    17% 97%, 14% 100%, 11% 97%, 8% 99%, 5% 96%, 2% 99%, 0% 97%
  )`

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{
      font-family:Arial,sans-serif;
      min-height:100vh;
      background-color:${options.bgColor || '#4a2a0a'};
      background-image:
        repeating-linear-gradient(90deg,
          rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px,
          transparent 1px, transparent 18px,
          rgba(255,255,255,0.04) 18px, rgba(255,255,255,0.04) 20px,
          transparent 20px, transparent 38px),
        repeating-linear-gradient(0deg,
          rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px,
          transparent 1px, transparent 60px);
      display:flex;justify-content:center;align-items:flex-start;padding:28px 20px;
    }
    .paper{
      width:480px;min-height:680px;
      background:#f5ead6;
      clip-path:${tornClip};
      padding:52px 48px 56px;
      position:relative;
    }
    .rest-name{text-align:center;font-size:36px;font-weight:900;color:${options.textColor || '#c0392b'};letter-spacing:2px;text-transform:uppercase;line-height:1;font-family:Georgia,serif;}
    .rest-sub{text-align:center;font-size:14px;font-weight:700;color:#5c3317;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px;}
    .contact{text-align:center;font-size:11px;color:#7a5533;margin-bottom:28px;line-height:1.8;}
    .category{margin-bottom:22px;}
    .cat-title{font-size:18px;font-weight:900;color:${options.textColor || '#c0392b'};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-family:Georgia,serif;}
    .item{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dashed #d4b896;}
    .item:last-child{border:none;}
    .name{font-size:13px;color:${options.subTextColor || '#2c1a0a'};font-weight:500;}
    .price{font-size:13px;color:${options.subTextColor || '#2c1a0a'};font-weight:600;white-space:nowrap;margin-left:12px;}
    .veg{font-size:9px;color:#2d7a2d;margin-left:4px;}
    .unavailable{opacity:0.35;}
    .deco{position:absolute;font-size:52px;opacity:0.12;user-select:none;}
    @media print{
      body{padding:0;}
      .paper{width:100%;min-height:auto;}
      @page{margin:0;size:A4;background:#4a2a0a;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    }
  </style></head>
  <body>
    <div class="paper">
      <div class="deco" style="top:60px;right:20px;transform:rotate(15deg)">🍕</div>
      <div class="deco" style="bottom:80px;left:10px;transform:rotate(-10deg)">🍔</div>
      <div class="rest-name">${restaurantName}</div>
      <div class="rest-sub">Restaurant</div>
      <div class="contact">📞 +91-XXXXXXXXXX &nbsp;·&nbsp; 🌐 www.qrkitchen.com</div>
      ${grouped.map(({ cat, items: ci }) => `
        <div class="category">
          <div class="cat-title">${cat.name}</div>
          ${ci.map(item => `
            <div class="item ${item.is_available ? '' : 'unavailable'}">
              <span class="name">${item.name}${item.is_vegetarian ? '<span class="veg">●</span>' : ''}</span>
              <span class="price">₹${Number(item.price).toFixed(2)}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>
  </body></html>`
}
