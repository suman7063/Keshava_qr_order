'use client'

import { CSSProperties } from 'react'
import {
  CANVAS_W, CANVAS_H,
  type PosterDoc, type Element, type Background, type PosterBindingData, type PosterVariables,
} from './types'
import { resolveToken, displayText, displaySrc, applyCase } from './resolve'

interface Props {
  doc: PosterDoc
  data: PosterBindingData
  /** Editor mode: click an element to select it. */
  interactive?: boolean
  selectedId?: string | null
  onSelect?: (id: string | null) => void
}

// One renderer, used for the editing canvas, the preview and PNG/PDF export.
export function PosterRenderer({ doc, data, interactive, selectedId, onSelect }: Props) {
  const vars = doc.variables
  return (
    <div
      style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H, overflow: 'hidden',
        fontFamily: resolveToken(vars.font, vars), ...backgroundStyle(doc.background, vars, data) }}
      onClick={interactive ? () => onSelect?.(null) : undefined}
    >
      {(doc.background.type === 'image' && doc.background.overlay) && (
        <div style={{ position: 'absolute', inset: 0, background: doc.background.overlay }} />
      )}
      {[...doc.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map(el => (
        <ElementView key={el.id} el={el} vars={vars} data={data}
          interactive={interactive} selected={selectedId === el.id} onSelect={onSelect} />
      ))}
    </div>
  )
}

function backgroundStyle(bg: Background, vars: PosterVariables, data: PosterBindingData): CSSProperties {
  if (bg.type === 'color') return { background: resolveToken(bg.value, vars) }
  if (bg.type === 'gradient') return { background: resolveToken(bg.value, vars) }
  const src = displaySrc(bg.src, bg.bind, data)
  return src
    ? { backgroundImage: `url(${src})`, backgroundSize: bg.fit === 'contain' ? 'contain' : 'cover', backgroundPosition: 'center', backgroundColor: '#222' }
    : { background: '#222' }
}

function ElementView({ el, vars, data, interactive, selected, onSelect }: {
  el: Element; vars: PosterVariables; data: PosterBindingData
  interactive?: boolean; selected?: boolean; onSelect?: (id: string) => void
}) {
  const box: CSSProperties = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity ?? 1,
    outline: selected ? '3px solid #2563eb' : interactive ? '1px dashed rgba(0,0,0,0)' : undefined,
    cursor: interactive ? 'pointer' : undefined,
  }
  const click = interactive
    ? (e: React.MouseEvent) => { e.stopPropagation(); onSelect?.(el.id) }
    : undefined

  if (el.type === 'text') {
    const text = applyCase(displayText(el.content, el.bind, data), el.style.case)
    const size = el.style.autoFit
      ? Math.max(28, Math.min(el.style.size, Math.floor((el.w * 1.7) / Math.max(4, text.length))))
      : el.style.size
    return (
      <div style={{ ...box, display: 'flex', alignItems: 'center',
        justifyContent: el.style.align === 'center' ? 'center' : el.style.align === 'right' ? 'flex-end' : 'flex-start' }}
        onClick={click}>
        <span style={{
          width: '100%', textAlign: el.style.align, fontSize: size, fontWeight: el.style.weight,
          color: resolveToken(el.style.color, vars), fontFamily: resolveToken(el.style.font, vars),
          lineHeight: el.style.lineHeight ?? 1.1, letterSpacing: el.style.letterSpacing,
          fontStyle: el.style.italic ? 'italic' : undefined, textShadow: el.style.shadow,
          whiteSpace: el.style.autoFit ? 'nowrap' : 'pre-wrap',
        }}>{text}</span>
      </div>
    )
  }

  if (el.type === 'image') {
    const src = displaySrc(el.src, el.bind, data)
    const common: CSSProperties = {
      width: '100%', height: '100%', objectFit: el.fit, display: 'block',
      borderRadius: el.shape === 'circle' ? '50%' : el.radius,
      border: el.border ? `${el.border.width}px solid ${resolveToken(el.border.color, vars)}` : undefined,
      boxShadow: el.shadow,
    }
    return (
      <div style={box} onClick={click}>
        {src
          ? <img src={src} crossOrigin="anonymous" alt="" style={common} />
          : <div style={{ ...common, background: resolveToken(vars.accent, vars) + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: el.w * 0.4 }}>🍽️</div>}
      </div>
    )
  }

  if (el.type === 'qr') {
    return (
      <div style={{ ...box, background: el.bg ?? '#fff', borderRadius: el.radius ?? 12, padding: el.padding ?? 12 }} onClick={click}>
        <img src={data.qrDataUrl} alt="QR" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    )
  }

  if (el.type === 'shape') {
    const radius = el.shape === 'circle' ? '50%' : el.shape === 'pill' || el.shape === 'badge' ? 9999 : el.radius
    return (
      <div style={{ ...box, background: resolveToken(el.fill, vars), borderRadius: radius,
        border: el.border ? `${el.border.width}px solid ${resolveToken(el.border.color, vars)}` : undefined,
        boxShadow: el.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
        onClick={click}>
        {el.content && <span style={{ color: el.textColor ? resolveToken(el.textColor, vars) : '#fff',
          fontSize: el.fontSize ?? 32, fontWeight: 800, lineHeight: 1, padding: 8 }}>{el.content}</span>}
      </div>
    )
  }

  if (el.type === 'features') {
    const feats = data.features ?? []
    return (
      <div style={{ ...box, display: 'flex', flexDirection: el.direction, gap: el.gap, flexWrap: 'wrap',
        alignItems: 'center', justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start' }}
        onClick={click}>
        {feats.map((f, i) => (
          <span key={i} style={{ background: resolveToken(el.chip.fill, vars), color: resolveToken(el.chip.color, vars),
            fontSize: el.chip.size, fontWeight: el.chip.weight ?? 700, borderRadius: el.chip.pill ? 9999 : 12,
            padding: `${el.chip.padV}px ${el.chip.padH}px`, whiteSpace: 'nowrap' }}>{f}</span>
        ))}
      </div>
    )
  }

  // repeater — dishes grid (Offer = horizontal cards, Bento = photo grid)
  const items = (data.items ?? []).slice(0, el.limit)
  const h = el.horizontal
  const imgSquare: CSSProperties = { width: el.card.imageH, height: el.card.imageH, objectFit: 'cover', flexShrink: 0 }
  return (
    <div style={{ ...box, display: 'grid', gridTemplateColumns: `repeat(${el.cols}, 1fr)`, gap: el.gap, alignContent: 'start' }} onClick={click}>
      {items.map((it, i) => (
        <div key={i} style={{ background: resolveToken(el.card.fill, vars), borderRadius: el.card.radius,
          overflow: 'hidden', display: 'flex', flexDirection: h ? 'row' : 'column', alignItems: h ? 'center' : undefined }}>
          {el.card.imageH > 0 && (it.image_url
            ? <img src={it.image_url} crossOrigin="anonymous" alt="" style={h ? imgSquare : { width: '100%', height: el.card.imageH, objectFit: 'cover' }} />
            : <div style={{ ...(h ? imgSquare : { width: '100%', height: el.card.imageH }), background: '#0001', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>🍽️</div>)}
          <div style={{ padding: h ? '0 26px' : '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flex: 1 }}>
            <span style={{ fontSize: el.card.nameSize, fontWeight: 700, color: resolveToken(el.card.nameColor, vars) }}>{it.name}</span>
            <span style={{ fontSize: el.card.priceSize, fontWeight: 800, color: resolveToken(el.card.priceColor, vars) }}>₹{it.price}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
