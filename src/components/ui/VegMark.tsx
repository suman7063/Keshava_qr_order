/** Standard Indian veg / non-veg marker: a square outline with a centered dot,
 *  green for vegetarian, red for non-vegetarian. */
export function VegMark({ veg, className = '' }: { veg: boolean; className?: string }) {
  const color = veg ? 'border-green-600' : 'border-red-600'
  const dot = veg ? 'bg-green-600' : 'bg-red-600'
  return (
    <span
      title={veg ? 'Veg' : 'Non-veg'}
      className={`inline-flex items-center justify-center w-3.5 h-3.5 border-[1.5px] rounded-[3px] shrink-0 bg-white ${color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
    </span>
  )
}
