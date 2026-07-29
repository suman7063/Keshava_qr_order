import type { QRTemplate } from '@/types'

export const template5Config = {
  id: 'template5' as QRTemplate,
  label: 'Dark Luxe',
  cardBg: '#14142b',
  accent: '#e6c068',
}

export function getTemplate5HTML(tableNumber: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string, labelProp?: string) {
  const cardBg = bgColor || template5Config.cardBg
  const accent = textColor || template5Config.accent
  const bgStyle = bgImage ? `background-image:url(${bgImage});background-size:cover;background-position:center` : `background:linear-gradient(160deg, ${cardBg}, #05050f)`
  const heading = headingProp || 'MENU'
  const subtext = subtextProp || 'Scan to Order'
  const label   = labelProp   || 'Digital'
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Georgia,'Times New Roman',serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;border-radius:22px;overflow:hidden;box-shadow:0 16px 44px rgba(0,0,0,0.35);${bgStyle};padding:34px 26px 28px;text-align:center;position:relative;}
    .card:before{content:'';position:absolute;inset:12px;border:1px solid ${accent}55;border-radius:16px;pointer-events:none;}
    .brand{color:${accent};font-size:11px;letter-spacing:5px;text-transform:uppercase;margin-bottom:22px;}
    .qrwrap{background:#fff;border-radius:14px;padding:14px;display:inline-block;margin-bottom:22px;box-shadow:0 6px 20px rgba(0,0,0,0.3);}
    .qrwrap img{width:190px;height:190px;display:block;}
    .row{display:flex;align-items:center;justify-content:center;gap:12px;}
    .table-num{color:${accent};font-size:22px;font-weight:700;font-style:italic;}
    .divider{color:${accent}88;font-size:26px;font-weight:200;}
    .digital{color:${accent}aa;font-size:9px;letter-spacing:3px;text-transform:uppercase;display:block;line-height:1;font-family:Arial,sans-serif;}
    .menu{color:${accent};font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:2px;}
    .scan{color:${accent}aa;font-size:11px;letter-spacing:3px;margin-top:12px;text-transform:uppercase;font-family:Arial,sans-serif;}
    @media print{@page{margin:0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body><div class="card">
    <div class="brand">✦ Fine Dining ✦</div>
    <div class="qrwrap"><img src="${qrDataUrl}"/></div>
    <div class="row">
      <span class="table-num">Table ${tableNumber}</span>
      <span class="divider">|</span>
      <div style="text-align:left"><span class="digital">${label}</span><span class="menu">${heading}</span></div>
    </div>
    <div class="scan">${subtext}</div>
  </div></body></html>`
}
