import type { QRTemplate } from '@/types'
import { bgImageStyle } from './bg'

export const template4Config = {
  id: 'template4' as QRTemplate,
  label: 'Template 4',
  cardBg: '#d4a96a',
  accent: '#111111',
}

const DEFAULT_HEADING_4 = 'MENU'
const DEFAULT_SUBTEXT_4 = 'Scan to view our'

export function getTemplate4HTML(tableNumber: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string, overlay?: number) {
  const cardBg = bgColor || template4Config.cardBg
  const accent = textColor || template4Config.accent
  const bgStyle = bgImage ? bgImageStyle(bgImage, overlay) : `background:${cardBg}`
  const heading = headingProp || DEFAULT_HEADING_4
  const subtext = subtextProp || DEFAULT_SUBTEXT_4
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Georgia,serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;min-height:420px;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.25);${bgStyle};display:flex;flex-direction:column;align-items:center;padding:24px 28px 28px;}
    .ornament{font-size:28px;color:${accent};margin-bottom:4px;line-height:1;}
    .line{width:100%;border:none;border-top:2px solid ${accent};margin:6px 0;}
    .qr-wrap{background:#fff;padding:14px;border-radius:4px;margin:18px 0 20px;}
    .qr-wrap img{width:180px;height:180px;display:block;}
    .scan{font-style:italic;font-size:15px;color:${accent};text-align:center;line-height:1.3;}
    .menu{font-size:44px;font-weight:900;color:${accent};letter-spacing:2px;text-align:center;line-height:1;}
    .table-tag{font-size:11px;color:${accent};opacity:0.6;margin-top:12px;letter-spacing:1px;text-transform:uppercase;}
  </style></head>
  <body><div class="card">
    <div class="ornament">❧</div>
    <hr class="line"/>
    <div class="qr-wrap"><img src="${qrDataUrl}"/></div>
    <p class="scan">${subtext}</p>
    <p class="menu">${heading}</p>
    <hr class="line" style="margin-top:16px"/>
    <p class="table-tag">Table ${tableNumber}</p>
  </div></body></html>`
}
