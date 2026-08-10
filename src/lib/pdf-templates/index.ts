import type { MenuItem, MenuCategory } from '@/types'
import { pdf1Config, getPdf1HTML } from './template1'
import { pdf2Config, getPdf2HTML } from './template2'
import { pdf3Config, getPdf3HTML } from './template3'
import { pdf4Config, getPdf4HTML } from './template4'
import { pdf5Config, getPdf5HTML } from './template5'
import { pdf6Config, getPdf6HTML } from './template6'
import { pdf7Config, getPdf7HTML } from './template7'
import { pdf8Config, getPdf8HTML } from './template8'
import { pdf9Config, getPdf9HTML } from './template9'

export interface PdfTemplateConfig {
  id: string
  label: string
  preview: string
  hasImage: boolean
}

export interface PdfOptions {
  bgColor?: string
  textColor?: string
  subTextColor?: string
  heroImage?: string
  // Main heading (the big "Menu" / restaurant title) overrides
  titleText?: string
  titleColor?: string
  titleSize?: number   // px; unset = template default
  titleBold?: boolean
  titleItalic?: boolean
  // Price overrides
  priceColor?: string
  priceSize?: number   // px; unset = template default
  priceBold?: boolean
  priceItalic?: boolean
}

// Where each template's main heading / price lives — used to inject the
// owner's overrides without touching every template's own CSS.
const TITLE_SEL: Record<string, string> = {
  pdf1: 'h1', pdf2: '.menu-title', pdf3: '.menu-title', pdf4: '.rest-name',
  pdf5: '.title-menu', pdf6: '.title', pdf7: '.title', pdf8: '.rest', pdf9: '.rest',
}
const PRICE_SEL: Record<string, string> = {
  pdf1: '.price', pdf2: '.price', pdf3: '.price', pdf4: '.price', pdf5: '.price',
  pdf6: '.price', pdf7: '.price', pdf8: '.card-price', pdf9: '.card-price',
}

function overrideStyles(templateId: string, o: PdfOptions): string {
  const title: string[] = []
  if (o.titleColor) title.push(`color:${o.titleColor} !important`)
  if (o.titleSize) title.push(`font-size:${o.titleSize}px !important`)
  if (o.titleBold) title.push('font-weight:900 !important')
  if (o.titleItalic) title.push('font-style:italic !important')
  const price: string[] = []
  if (o.priceColor) price.push(`color:${o.priceColor} !important`)
  if (o.priceSize) price.push(`font-size:${o.priceSize}px !important`)
  if (o.priceBold) price.push('font-weight:900 !important')
  if (o.priceItalic) price.push('font-style:italic !important')
  if (!title.length && !price.length) return ''
  const css =
    (title.length ? `${TITLE_SEL[templateId] ?? 'h1'}{${title.join(';')}}` : '') +
    (price.length ? `${PRICE_SEL[templateId] ?? '.price'}{${price.join(';')}}` : '')
  return `<style>${css}</style>`
}

export const PDF_TEMPLATES: PdfTemplateConfig[] = [
  { ...pdf1Config, hasImage: false },
  { ...pdf2Config, hasImage: false },
  { ...pdf3Config, hasImage: false },
  { ...pdf4Config, hasImage: false },
  { ...pdf5Config, hasImage: false },
  { ...pdf6Config, hasImage: false },
  { ...pdf7Config, hasImage: false },
  { ...pdf8Config, hasImage: false },
  { ...pdf9Config, hasImage: false },
]

export function getPdfHTML(
  templateId: string,
  categories: MenuCategory[],
  items: MenuItem[],
  restaurantName: string,
  options: PdfOptions = {}
): string {
  const html = baseHTML(templateId, categories, items, restaurantName, options)
  const ov = overrideStyles(templateId, options)
  return ov ? html.replace('</head>', `${ov}</head>`) : html
}

function baseHTML(
  templateId: string,
  categories: MenuCategory[],
  items: MenuItem[],
  restaurantName: string,
  options: PdfOptions
): string {
  switch (templateId) {
    case 'pdf2': return getPdf2HTML(categories, items, restaurantName, options)
    case 'pdf3': return getPdf3HTML(categories, items, restaurantName, options)
    case 'pdf4': return getPdf4HTML(categories, items, restaurantName, options)
    case 'pdf5': return getPdf5HTML(categories, items, restaurantName, options)
    case 'pdf6': return getPdf6HTML(categories, items, restaurantName, options)
    case 'pdf7': return getPdf7HTML(categories, items, restaurantName, options)
    case 'pdf8': return getPdf8HTML(categories, items, restaurantName, options)
    case 'pdf9': return getPdf9HTML(categories, items, restaurantName, options)
    default:     return getPdf1HTML(categories, items, restaurantName, options)
  }
}
