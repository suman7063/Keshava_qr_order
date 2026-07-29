import type { QRTemplate } from '@/types'
import { template1Config, getTemplate1HTML } from './template1'
import { template2Config, getTemplate2HTML } from './template2'
import { template3Config, getTemplate3HTML } from './template3'
import { template4Config, getTemplate4HTML } from './template4'
import { template5Config, getTemplate5HTML } from './template5'
import { template6Config, getTemplate6HTML } from './template6'
import { template7Config, getTemplate7HTML } from './template7'
import { template8Config, getTemplate8HTML } from './template8'

export interface QRTemplateConfig {
  id: QRTemplate
  label: string
  cardBg: string
  accent: string
}

export const TEMPLATES: QRTemplateConfig[] = [
  template1Config,
  template2Config,
  template3Config,
  template4Config,
  template5Config,
  template6Config,
  template7Config,
  template8Config,
]

export function getCardHTML(
  template: QRTemplate,
  tableNumber: string,
  cardImage: string,
  qrDataUrl: string,
  bgColor?: string,
  textColor?: string,
  bgImage?: string,
  heading?: string,
  subtext?: string,
  label?: string
): string {
  switch (template) {
    case 'minimal':   return getTemplate2HTML(tableNumber, qrDataUrl, bgColor, textColor, bgImage, heading, subtext, label)
    case 'template3': return getTemplate3HTML(tableNumber, cardImage, qrDataUrl, bgColor, textColor, bgImage, heading, subtext)
    case 'template4': return getTemplate4HTML(tableNumber, qrDataUrl, bgColor, textColor, bgImage, heading, subtext)
    case 'template5': return getTemplate5HTML(tableNumber, qrDataUrl, bgColor, textColor, bgImage, heading, subtext, label)
    case 'template6': return getTemplate6HTML(tableNumber, qrDataUrl, bgColor, textColor, bgImage, heading, subtext, label)
    case 'template7': return getTemplate7HTML(tableNumber, qrDataUrl, bgColor, textColor, bgImage, heading, subtext, label)
    case 'template8': return getTemplate8HTML(tableNumber, qrDataUrl, bgColor, textColor, bgImage, heading, subtext, label)
    default:          return getTemplate1HTML(tableNumber, cardImage, qrDataUrl, bgColor, textColor, bgImage, heading, subtext, label)
  }
}
