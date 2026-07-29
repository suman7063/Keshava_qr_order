import type { QRTemplate } from '@/types'

export const template6Config = {
  id: 'template6' as QRTemplate,
  label: 'Coral Sunset',
  cardBg: '#ff6b6b',
  accent: '#ffffff',
}

export function getTemplate6HTML(tableNumber: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string, labelProp?: string) {
  const cardBg = bgColor || template6Config.cardBg
  const accent = textColor || template6Config.accent
  const bgStyle = bgImage ? `background-image:url(${bgImage});background-size:cover;background-position:center` : `background:linear-gradient(140deg, #ff8e53, ${cardBg} 55%, #c44569)`
  const heading = headingProp || 'MENU'
  const subtext = subtextProp || 'Scan to Order'
  const label   = labelProp   || 'Digital'
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Trebuchet MS',Arial,sans-serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;border-radius:24px;overflow:hidden;box-shadow:0 16px 44px rgba(196,69,105,0.4);${bgStyle};padding:34px 26px 30px;text-align:center;}
    .brand{color:${accent};font-size:12px;letter-spacing:4px;text-transform:uppercase;font-weight:700;margin-bottom:22px;opacity:0.95;}
    .qrwrap{background:#fff;border-radius:18px;padding:16px;display:inline-block;margin-bottom:24px;box-shadow:0 8px 22px rgba(0,0,0,0.2);}
    .qrwrap img{width:186px;height:186px;display:block;}
    .table-num{color:${accent};font-size:26px;font-weight:800;display:block;}
    .menu{color:${accent};font-size:15px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-top:2px;opacity:0.9;}
    .scan{display:inline-block;margin-top:16px;color:${accent};font-size:11px;letter-spacing:2px;font-weight:600;border:1.5px solid ${accent}99;border-radius:20px;padding:6px 16px;text-transform:uppercase;}
    @media print{@page{margin:0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body><div class="card">
    <div class="brand">${label} • ${heading}</div>
    <div class="qrwrap"><img src="${qrDataUrl}"/></div>
    <span class="table-num">Table ${tableNumber}</span>
    <div class="menu">Digital Menu</div>
    <div class="scan">${subtext}</div>
  </div></body></html>`
}
