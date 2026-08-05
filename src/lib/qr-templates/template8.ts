import type { QRTemplate } from '@/types'
import { bgImageStyle } from './bg'

export const template8Config = {
  id: 'template8' as QRTemplate,
  label: 'Bold Frame',
  cardBg: '#ffffff',
  accent: '#6d28d9',
}

export function getTemplate8HTML(tableNumber: string, qrDataUrl: string, bgColor?: string, textColor?: string, bgImage?: string, headingProp?: string, subtextProp?: string, labelProp?: string, overlay?: number) {
  const cardBg = bgColor || template8Config.cardBg
  const accent = textColor || template8Config.accent
  const bgStyle = bgImage ? bgImageStyle(bgImage, overlay) : `background:${cardBg}`
  const heading = headingProp || 'MENU'
  const subtext = subtextProp || 'Scan to Order'
  const label   = labelProp   || 'Digital'
  return `<html><head><title>QR - Table ${tableNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Poppins','Segoe UI',Arial,sans-serif;background:#e5e5e5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    .card{width:320px;border-radius:22px;overflow:hidden;box-shadow:0 16px 44px rgba(0,0,0,0.25);${bgStyle};border:6px solid ${accent};padding:26px 24px 24px;text-align:center;}
    .pill{display:inline-block;background:${accent};color:#fff;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:6px 16px;border-radius:20px;margin-bottom:22px;}
    .qrwrap{border:2px solid ${accent}33;border-radius:16px;padding:14px;display:inline-block;margin-bottom:20px;}
    .qrwrap img{width:190px;height:190px;display:block;}
    .table-num{color:${accent};font-size:26px;font-weight:800;}
    .menu{color:#111;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-top:2px;opacity:0.6;}
    .scan{color:${accent};font-size:12px;letter-spacing:1px;margin-top:14px;font-weight:600;}
    @media print{@page{margin:0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head>
  <body><div class="card">
    <div class="pill">${label} ${heading}</div>
    <div class="qrwrap"><img src="${qrDataUrl}"/></div>
    <div class="table-num">Table ${tableNumber}</div>
    <div class="menu">Scan for Digital Menu</div>
    <div class="scan">${subtext} →</div>
  </div></body></html>`
}
