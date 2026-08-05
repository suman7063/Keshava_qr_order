import type { QRTemplate } from '@/types'
import { bgImageStyle } from './bg'

export const template7Config = {
  id: 'template7' as QRTemplate,
  label: 'Ocean Teal',
  cardBg: '#0f766e',
  accent: '#ffffff',
}

export function getTemplate7HTML(tableNumber: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string, labelProp?: string, overlay?: number) {
  const cardBg = bgColor || template7Config.cardBg
  const accent = textColor || template7Config.accent
  const bgStyle = bgImage ? bgImageStyle(bgImage, overlay) : `background:linear-gradient(135deg, #14b8a6, ${cardBg} 60%, #0b3d3a)`
  const heading = headingProp || 'MENU'
  const subtext = subtextProp || 'Scan to Order'
  const label   = labelProp   || 'Digital'
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;border-radius:24px;overflow:hidden;box-shadow:0 16px 44px rgba(15,118,110,0.4);${bgStyle};padding:0 0 30px;text-align:center;}
    .top{padding:26px 24px 20px;border-bottom:1px dashed ${accent}55;}
    .brand{color:${accent};font-size:13px;letter-spacing:4px;text-transform:uppercase;font-weight:800;}
    .brand small{display:block;font-size:9px;letter-spacing:3px;font-weight:400;opacity:0.8;margin-top:4px;}
    .qrwrap{background:#fff;border-radius:16px;padding:15px;display:inline-block;margin:24px 0 20px;box-shadow:0 8px 22px rgba(0,0,0,0.22);}
    .qrwrap img{width:188px;height:188px;display:block;}
    .table-num{color:${accent};font-size:24px;font-weight:800;letter-spacing:1px;}
    .scan{color:${accent};font-size:11px;letter-spacing:2px;margin-top:8px;text-transform:uppercase;opacity:0.85;}
    @media print{@page{margin:0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body><div class="card">
    <div class="top"><div class="brand">${heading}<small>${label} Menu</small></div></div>
    <div class="qrwrap"><img src="${qrDataUrl}"/></div>
    <div class="table-num">Table ${tableNumber}</div>
    <div class="scan">${subtext}</div>
  </div></body></html>`
}
