import type { MenuItem, MenuCategory } from '@/types'

interface PdfOptions { bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string; titleText?: string }

export const pdf3Config = { id: 'pdf3', label: 'Wavy Green', preview: '#f0faf0' }

export function getPdf3HTML(categories: MenuCategory[], items: MenuItem[], restaurantName: string, options: PdfOptions = {}) {
  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => i.category_id === cat.id),
  })).filter(g => g.items.length > 0)

  // Wavy rectangle SVG path (viewBox 0 0 100 140)
  const wavyPath = `M5,5
    Q10,0 15,5 Q20,10 25,5 Q30,0 35,5 Q40,10 45,5 Q50,0 55,5
    Q60,10 65,5 Q70,0 75,5 Q80,10 85,5 Q90,0 95,5
    Q100,10 95,15 Q90,20 95,25 Q100,30 95,35 Q90,40 95,45
    Q100,50 95,55 Q90,60 95,65 Q100,70 95,75 Q90,80 95,85
    Q100,90 95,95 Q90,100 95,105 Q100,110 95,115 Q90,120 95,125
    Q100,130 95,135
    Q90,140 85,135 Q80,130 75,135 Q70,140 65,135 Q60,130 55,135
    Q50,140 45,135 Q40,130 35,135 Q30,140 25,135 Q20,130 15,135
    Q10,140 5,135
    Q0,130 5,125 Q10,120 5,115 Q0,110 5,105 Q10,100 5,95
    Q0,90 5,85 Q10,80 5,75 Q0,70 5,65 Q10,60 5,55
    Q0,50 5,45 Q10,40 5,35 Q0,30 5,25 Q10,20 5,15
    Q0,10 5,5 Z`

  return `<html><head><title>${restaurantName} — Menu</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Georgia',serif;background:${options.bgColor || '#fff'};display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:20px;}
    .page{position:relative;width:540px;min-height:720px;padding:60px 64px;}
    .border-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
    .content{position:relative;z-index:1;text-align:center;}
    .menu-title{font-size:64px;font-weight:700;color:#f4a7b9;letter-spacing:6px;text-transform:uppercase;font-family:Georgia,serif;margin-bottom:32px;line-height:1;}
    .category{margin-bottom:28px;}
    .cat-title{font-size:18px;font-weight:700;color:${options.textColor || '#2d6a2d'};letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;font-family:Georgia,serif;}
    .item{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${options.subTextColor || '#2c2c2c'};margin-bottom:7px;font-family:Arial,sans-serif;}
    .price{color:#888;margin-left:6px;font-size:10px;}
    .unavailable{opacity:0.35;}
    @media print{
      body{padding:0;}
      .page{width:100%;min-height:auto;}
      @page{margin:8mm;size:A4;}
    }
  </style></head>
  <body>
    <div class="page">
      <svg class="border-svg" viewBox="0 0 100 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="${wavyPath}" fill="none" stroke="${options.textColor || '#2d6a2d'}" stroke-width="2.5"/>
      </svg>
      <div class="content">
        <div class="menu-title">${options.titleText || 'Menu'}</div>
        ${grouped.map(({ cat, items: ci }) => `
          <div class="category">
            <div class="cat-title">${cat.name}</div>
            ${ci.map(item => `
              <div class="item ${item.is_available ? '' : 'unavailable'}">
                ${item.name}<span class="price">· ₹${Number(item.price).toFixed(0)}</span>
              </div>`).join('')}
          </div>`).join('')}
        <div style="margin-top:24px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${options.textColor || '#2d6a2d'};font-family:Arial,sans-serif;">${restaurantName}</div>
      </div>
    </div>
  </body></html>`
}
