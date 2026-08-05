/**
 * Cover-style background image with an optional dark layer (0-80%)
 * stacked via CSS multi-background, so card text stays readable on
 * any photo without touching the templates' layout.
 */
export function bgImageStyle(bgImage: string, overlay?: number): string {
  const pct = Math.min(Math.max(Math.round(overlay ?? 0), 0), 80)
  const layer = pct > 0
    ? `linear-gradient(rgba(0,0,0,${pct / 100}),rgba(0,0,0,${pct / 100})),`
    : ''
  return `background-image:${layer}url(${bgImage});background-size:cover;background-position:center`
}
