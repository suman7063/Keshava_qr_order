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
