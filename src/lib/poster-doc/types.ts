// Poster editor — document model (Phase 0 foundation).
// A poster is pure data (a PosterDoc). One <PosterRenderer> turns it into a
// visual, used for the editing canvas, the preview and PNG/PDF export.
// Colours/fonts are "variables" (tokens) and content can be "bound" to
// restaurant data — both are resolved by resolveDoc() before rendering.

export const CANVAS_W = 1080
export const CANVAS_H = 1527 // A-series portrait ratio (1:√2)

export type PosterSizeKey = 'a4' | 'a3' | 'a2'

/** Theme tokens. Any colour/font value may be "{{accent}}" etc. */
export interface PosterVariables {
  accent: string
  heading: string
  text: string
  font: string
}

/** Content bindings resolved from restaurant data at render time. */
export type Binding =
  | 'headline' | 'subtext' | 'badge' | 'cta' | 'phone'
  | 'restaurantName' | 'menuUrl'
  | 'coverImage' | 'logo' | 'menuQr'

export type Align = 'left' | 'center' | 'right'

export interface BaseEl {
  id: string
  x: number; y: number; w: number; h: number
  rotation?: number
  opacity?: number
  z?: number
}

export interface TextEl extends BaseEl {
  type: 'text'
  content: string          // literal or "{{binding}}"
  bind?: Binding
  style: {
    font?: string          // "{{font}}" or a family
    size: number
    weight: number
    color: string          // "{{heading}}" | "{{text}}" | "{{accent}}" | hex
    align: Align
    lineHeight?: number
    letterSpacing?: number
    case?: 'upper' | 'lower' | 'none'
    italic?: boolean
    autoFit?: boolean       // shrink so it fits the box width (Bold Type)
    shadow?: string
  }
}

export interface ImageEl extends BaseEl {
  type: 'image'
  src: string              // url or "{{coverImage}}" | "{{logo}}"
  bind?: Binding
  fit: 'cover' | 'contain'
  shape?: 'rect' | 'circle'
  radius?: number
  border?: { width: number; color: string }
  crop?: { x: number; y: number; w: number; h: number } // fractions 0..1 (Phase 2)
  shadow?: string
}

export interface QrEl extends BaseEl {
  type: 'qr'
  bind: 'menuQr'
  bg?: string
  radius?: number
  padding?: number
}

export interface ShapeEl extends BaseEl {
  type: 'shape'
  shape: 'rect' | 'circle' | 'pill' | 'badge'
  fill: string             // "{{accent}}" | hex
  content?: string         // text inside (e.g. badge "50% OFF")
  textColor?: string
  fontSize?: number
  radius?: number
  border?: { width: number; color: string }
  shadow?: string
}

/** Repeats a sub-layout over restaurant menu items (Offer / Bento). */
export interface RepeaterEl extends BaseEl {
  type: 'repeater'
  source: 'items'
  limit: number
  cols: number
  gap: number
  horizontal?: boolean   // card = photo on the left, name/price on the right
  card: {
    fill: string
    radius: number
    imageH: number         // dish image height inside the card (0 = none)
    nameColor: string
    priceColor: string
    nameSize: number
    priceSize: number
  }
}

/** Renders data.features as a row/column of chips. */
export interface FeaturesEl extends BaseEl {
  type: 'features'
  direction: 'row' | 'column'
  gap: number
  align?: Align
  chip: { fill: string; color: string; size: number; weight?: number; pill?: boolean; padH: number; padV: number }
}

export type Element = TextEl | ImageEl | QrEl | ShapeEl | RepeaterEl | FeaturesEl

export type Background =
  | { type: 'color'; value: string }
  | { type: 'gradient'; value: string }
  | { type: 'image'; src: string; bind?: Binding; fit: 'cover' | 'contain'; overlay?: string }

export interface PosterDoc {
  version: 1
  size: PosterSizeKey
  variables: PosterVariables
  background: Background
  elements: Element[]
}

/** Restaurant data used to resolve bindings. */
export interface PosterBindingData {
  restaurantName: string
  logo?: string | null
  coverImage?: string | null
  qrDataUrl: string
  menuUrl: string
  headline?: string
  subtext?: string
  badge?: string
  cta?: string
  phone?: string
  features?: string[]
  items?: { name: string; price: number; image_url?: string | null }[]
}
