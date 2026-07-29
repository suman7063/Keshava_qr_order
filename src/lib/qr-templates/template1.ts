import type { QRTemplate } from '@/types'

export const template1Config = {
  id: 'classic' as QRTemplate,
  label: 'Template 1',
  cardBg: '#ffffff',
  accent: '#f59e0b',
}

const DEFAULT_HEADING_1 = 'MENU'
const DEFAULT_SUBTEXT_1 = 'Scan to Order'
const DEFAULT_LABEL_1   = 'Digital'

export function getTemplate1HTML(tableNumber: string, cardImage: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string, labelProp?: string) {
  const cardBg = bgColor || template1Config.cardBg
  const accent = textColor || template1Config.accent
  const bgStyle = bgImage ? `background-image:url(${bgImage});background-size:cover;background-position:center` : `background:${cardBg}`
  const heading = headingProp || DEFAULT_HEADING_1
  const subtext = subtextProp || DEFAULT_SUBTEXT_1
  const label   = labelProp   || DEFAULT_LABEL_1
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.25);${bgStyle};}
    .food-img{height:170px;overflow:hidden;}
    .food-img img{width:100%;height:100%;object-fit:cover;display:block;}
    .body{${bgStyle};padding:28px 24px 20px;text-align:center;}
    .body img{width:200px;height:200px;display:block;margin:0 auto 20px;}
    .table-num{color:${accent};font-size:22px;font-weight:900;font-style:italic;}
    .divider{color:${accent};font-size:26px;font-weight:200;}
    .digital{color:${accent};font-size:9px;letter-spacing:3px;text-transform:uppercase;font-weight:700;display:block;line-height:1;opacity:0.8;}
    .menu{color:${accent};font-size:26px;font-weight:900;text-transform:uppercase;line-height:1.1;letter-spacing:1px;}
    .scan{color:${accent};font-size:11px;letter-spacing:2px;font-weight:600;margin-top:8px;opacity:0.8;}
  </style></head>
  <body><div class="card">
    ${cardImage
      ? `<div class="food-img"><img src="${cardImage}"/></div>`
      : `<div class="food-img" style="background:linear-gradient(135deg, ${accent}33, ${accent}66);"></div>`}
    <div class="body">
      <img src="${qrDataUrl}"/>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;">
        <span class="table-num">Table ${tableNumber}</span>
        <span class="divider">|</span>
        <div style="text-align:left"><span class="digital">${label}</span><span class="menu">${heading}</span></div>
      </div>
      <div class="scan">${subtext}</div>
    </div>
  </div></body></html>`
}
