// Resolve "{{variable}}" tokens and "{{binding}}" data into concrete values.

import type { PosterVariables, PosterBindingData, Binding } from './types'

/** Replace every "{{token}}" in a string with its variable value.
 * Works whole-value ("{{accent}}") and inline ("linear-gradient(..., {{accent}}cc)"). */
export function resolveToken(value: string | undefined, vars: PosterVariables): string {
  if (!value) return value ?? ''
  const map = vars as unknown as Record<string, string>
  return value.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in map ? map[k] : m))
}

/** Text for a binding (headline, phone, …). undefined if not applicable. */
export function bindingText(bind: Binding | undefined, data: PosterBindingData): string | undefined {
  switch (bind) {
    case 'headline':       return data.headline
    case 'subtext':        return data.subtext
    case 'badge':          return data.badge
    case 'cta':            return data.cta
    case 'phone':          return data.phone
    case 'restaurantName': return data.restaurantName
    case 'menuUrl':        return data.menuUrl
    default:               return undefined
  }
}

/** Image src for a binding (coverImage, logo, menuQr). */
export function bindingSrc(bind: Binding | undefined, data: PosterBindingData): string | undefined {
  switch (bind) {
    case 'coverImage': return data.coverImage || undefined
    case 'logo':       return data.logo || undefined
    case 'menuQr':     return data.qrDataUrl
    default:           return undefined
  }
}

/** Final display text for a text element: bound data → else literal default. */
export function displayText(content: string, bind: Binding | undefined, data: PosterBindingData): string {
  const bound = bindingText(bind, data)
  return (bound && bound.trim()) ? bound : content
}

/** Final image src: bound data → else literal src. */
export function displaySrc(src: string, bind: Binding | undefined, data: PosterBindingData): string {
  return bindingSrc(bind, data) ?? src
}

export function applyCase(text: string, c?: 'upper' | 'lower' | 'none'): string {
  if (c === 'upper') return text.toUpperCase()
  if (c === 'lower') return text.toLowerCase()
  return text
}
