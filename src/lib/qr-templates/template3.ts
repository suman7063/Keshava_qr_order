import type { QRTemplate } from '@/types'

export const template3Config = {
  id: 'template3' as QRTemplate,
  label: 'Template 3',
  cardBg: '#d4e8d0',
  accent: '#1e4d1a',
}

const DEFAULT_HEADING_3 = 'SCAN HERE'
const DEFAULT_SUBTEXT_3 = 'To see our menu'

export function getTemplate3HTML(tableNumber: string, _cardImage: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string) {
  const cardBg = bgColor || template3Config.cardBg
  const accent = textColor || template3Config.accent
  const bgStyle = bgImage
    ? `background-image:url(${bgImage});background-size:cover;background-position:center`
    : `background:${cardBg}`
  const heading = headingProp || DEFAULT_HEADING_3
  const subtext = subtextProp || DEFAULT_SUBTEXT_3
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.2);${bgStyle};}
    .banner{background:${accent};color:#fff;text-align:center;padding:10px 20px;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;}
    .body{padding:28px 28px 32px;text-align:center;}
    .sub{font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};margin-bottom:6px;}
    .big{font-size:56px;font-weight:900;line-height:1;text-transform:uppercase;color:${accent};letter-spacing:2px;font-family:Impact,Arial Black,sans-serif;}
    .qr-wrap{margin:20px auto 0;display:inline-block;border:5px solid ${accent};border-radius:4px;padding:10px;background:#fff;}
    .qr-wrap img{width:180px;height:180px;display:block;}
    .table-tag{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};opacity:0.6;margin-top:14px;}
  </style></head>
  <body><div class="card">
    <div class="banner">Table ${tableNumber}</div>
    <div class="body">
      <p class="sub">${subtext}</p>
      <p class="big">${heading.split(' ').join('<br/>')}</p>
      <div class="qr-wrap"><img src="${qrDataUrl}"/></div>
    </div>
  </div></body></html>`
}
