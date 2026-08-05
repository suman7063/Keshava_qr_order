import type { QRTemplate } from '@/types'
import { bgImageStyle } from './bg'

export const template2Config = {
  id: 'minimal' as QRTemplate,
  label: 'Template 2',
  cardBg: '#f9fafb',
  accent: '#111111',
}

const DEFAULT_HEADING_2 = 'MENU'
const DEFAULT_SUBTEXT_2 = 'Scan to Order'
const DEFAULT_LABEL_2   = 'Digital'

export function getTemplate2HTML(tableNumber: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string, labelProp?: string, overlay?: number) {
  const cardBg = bgColor || template2Config.cardBg
  const accent = textColor || template2Config.accent
  const bgStyle = bgImage ? bgImageStyle(bgImage, overlay) : `background:${cardBg}`
  const heading = headingProp || DEFAULT_HEADING_2
  const subtext = subtextProp || DEFAULT_SUBTEXT_2
  const label   = labelProp   || DEFAULT_LABEL_2
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.25);${bgStyle};}
    .body{${bgStyle};padding:36px 24px 28px;text-align:center;}
    .body img{width:200px;height:200px;display:block;margin:0 auto 20px;}
    .table-num{color:${accent};font-size:22px;font-weight:900;font-style:normal;}
    .divider{color:${accent};font-size:26px;font-weight:200;}
    .digital{color:${accent};font-size:9px;letter-spacing:3px;text-transform:uppercase;font-weight:700;display:block;line-height:1;opacity:0.7;}
    .menu{color:${accent};font-size:26px;font-weight:900;text-transform:uppercase;line-height:1.1;letter-spacing:1px;}
    .scan{color:${accent};font-size:11px;letter-spacing:2px;font-weight:600;margin-top:8px;opacity:0.6;}
  </style></head>
  <body><div class="card">
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
