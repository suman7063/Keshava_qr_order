'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download, FileImage, FileText, Loader2, ImagePlus, X, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { uploadImage } from '@/lib/uploadImage'
import { PosterRenderer } from '@/lib/poster-doc/PosterRenderer'
import { POSTER_DOCS } from '@/lib/poster-doc/docs'
import type { PosterBindingData, Background, PosterDoc, TextEl, ShapeEl } from '@/lib/poster-doc/types'
import { CropModal } from '@/components/ui/CropModal'
import { displayText } from '@/lib/poster-doc/resolve'
import {
  getPosterHTML, POSTER_TEMPLATES, POSTER_SIZES, POSTER_ITEM_CAP, POSTER_W, POSTER_H,
  type PosterTemplate, type PosterSizeKey, type PosterData, type PosterItem,
} from '@/lib/poster-templates'

interface Restaurant {
  name: string; subdomain: string; logo_url?: string | null; phone?: string | null
  cover_image_url?: string | null; primary_color?: string | null
}
interface MenuItem {
  id: string; name: string; price: number; image_url?: string | null
  is_vegetarian?: boolean | null; is_available?: boolean | null
}

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || ''
const PREVIEW_W = 360 // max preview width — shrinks responsively below this

/** Apply the user's photo-layer % on top of an image background (null = keep template default). */
function withOverlay(bg: Background, pct: number | null): Background {
  if (bg.type !== 'image' || pct == null) return bg
  return { ...bg, overlay: pct > 0 ? `rgba(0,0,0,${pct / 100})` : undefined }
}

/**
 * A pill/badge shape sitting right under a text element — to the owner they
 * are ONE thing, so the text toolbar edits both together. Full-bleed panels
 * are excluded (they'd match every text on the poster).
 */
function companionShapeOf(doc: PosterDoc | null, txt: TextEl): ShapeEl | null {
  if (!doc) return null
  const cx = txt.x + txt.w / 2, cy = txt.y + txt.h / 2
  const shapes = doc.elements
    .filter((e): e is ShapeEl => e.type === 'shape')
    .filter(s => cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h)
    .filter(s => s.w * s.h <= 6 * txt.w * txt.h)
    .sort((a, b) => (b.z ?? 0) - (a.z ?? 0))
  return shapes[0] ?? null
}

/** Background is EITHER a colour or an image — resolve what the mode toggle picked. */
function resolveBackground(templateBg: Background, mode: 'colour' | 'image', customImg: string, overlayPct: number | null, colour: string): Background {
  if (mode === 'image') {
    const img = customImg
      ? { type: 'image' as const, src: customImg, fit: 'cover' as const }
      : templateBg.type === 'image' ? templateBg : null
    // colour template + nothing uploaded yet → keep the template bg until an image is chosen
    return img ? withOverlay(img, overlayPct) : templateBg
  }
  // colour mode: colour templates stay token-driven; image templates get a solid colour
  return templateBg.type === 'image' ? { type: 'color', value: colour } : templateBg
}

export default function PostersPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const [template, setTemplate] = useState<PosterTemplate>('scan')
  const [size, setSize] = useState<PosterSizeKey>('a3')
  const [phone, setPhone] = useState('')
  const [cta, setCta] = useState('')
  const [features, setFeatures] = useState('')
  const [color, setColor] = useState('') // accent / background override
  const [headingColor, setHeadingColor] = useState('') // {{heading}} override
  const [textColor, setTextColor] = useState('')       // {{text}} override
  const [posterBg, setPosterBg] = useState('') // any template: image used as the whole background
  const [posterOverlay, setPosterOverlay] = useState<number | null>(null) // photo layer %; null = template default
  const [bgMode, setBgMode] = useState<'colour' | 'image' | null>(null) // null = template's own default
  const [uploadingBg, setUploadingBg] = useState(false)
  const [crop, setCrop] = useState<{ url: string; aspect: number; apply: (url: string) => void } | null>(null)
  // Canvas selection (Phase 1) — click an element to edit it directly.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [elFx, setElFx] = useState<Record<string, { color?: string; sizeMult?: number; bold?: boolean; fill?: string; textColor?: string; borderColor?: string; borderWidth?: number }>>({})
  const [elText, setElText] = useState<Record<string, string>>({}) // per-element text content override
  const [elImg, setElImg] = useState<Record<string, string>>({})   // per-element image src override
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [exporting, setExporting] = useState<'' | 'png' | 'pdf'>('')

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)

  // Fully responsive preview: the poster shrinks to whatever width is
  // available so the layout never breaks — toolbars and click positions
  // all follow the live scale.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [previewW, setPreviewW] = useState(PREVIEW_W)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? PREVIEW_W
      // settings live in their own column now — the poster only needs a tiny
      // margin so it never touches the box edge
      setPreviewW(Math.max(200, Math.min(PREVIEW_W, w - 8)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = previewW / POSTER_W

  // Load restaurant + menu, then build the QR that points at the public menu.
  useEffect(() => {
    (async () => {
      try {
        const [rRes, mRes] = await Promise.all([
          fetch('/api/restaurants/current'),
          fetch('/api/menu-items'),
        ])
        const r: Restaurant | null = await rRes.json().catch(() => null)
        const m: MenuItem[] = mRes.ok ? await mRes.json().catch(() => []) : []
        setRestaurant(r)
        if (r?.phone) setPhone(r.phone)
        setItems(Array.isArray(m) ? m.filter(x => x.is_available !== false) : [])
        if (r?.subdomain) {
          const base = MAIN_DOMAIN ? `https://${MAIN_DOMAIN}` : window.location.origin
          const url = `${base}/${r.subdomain}/menu`
          const qr = await QRCode.toDataURL(url, { width: 600, margin: 1, color: { dark: '#111111', light: '#ffffff' } })
          setQrDataUrl(qr)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const cap = POSTER_ITEM_CAP[template]
  const selectedItems: PosterItem[] = useMemo(() => {
    if (!cap) return []
    const chosen = selectedIds.length
      ? selectedIds.map(id => items.find(i => i.id === id)).filter(Boolean) as MenuItem[]
      : items.slice(0, cap)
    return chosen.slice(0, cap).map(i => ({
      name: i.name, price: i.price, image_url: i.image_url, is_vegetarian: i.is_vegetarian,
    }))
  }, [cap, selectedIds, items])

  const menuUrlText = restaurant?.subdomain
    ? `${MAIN_DOMAIN || (typeof window !== 'undefined' ? window.location.host : '')}/${restaurant.subdomain}`
    : ''

  const data: PosterData = {
    restaurantName: restaurant?.name || 'Your Restaurant',
    logoUrl: restaurant?.logo_url,
    coverUrl: restaurant?.cover_image_url,
    accent: color || restaurant?.primary_color || defaultAccent(template),
    qrDataUrl,
    menuUrl: menuUrlText,
    phone: phone.trim() || undefined,
    cta: cta.trim() || undefined,
    features: features.trim() ? features.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4) : undefined,
    items: selectedItems,
  }

  const html = qrDataUrl ? getPosterHTML(template, data) : ''

  // Phase 0: templates that have a PosterDoc render via the new JSON engine.
  const bindingData: PosterBindingData = {
    restaurantName: restaurant?.name || 'Your Restaurant',
    logo: restaurant?.logo_url,
    coverImage: restaurant?.cover_image_url,
    qrDataUrl,
    menuUrl: menuUrlText,
    cta: cta.trim() || undefined,
    phone: phone.trim() || undefined,
    features: features.trim() ? features.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4) : undefined,
    items: selectedItems,
  }
  const baseDoc = POSTER_DOCS[template]
  // Background is EITHER a colour or an image — the toggle picks the mode.
  const activeBgMode: 'colour' | 'image' = bgMode ?? (baseDoc?.background.type === 'image' ? 'image' : 'colour')
  const activeDoc = baseDoc && qrDataUrl
    ? {
        ...baseDoc,
        background: resolveBackground(baseDoc.background, activeBgMode, posterBg, posterOverlay, color || data.accent),
        variables: {
          ...baseDoc.variables,
          accent: data.accent,
          heading: headingColor || baseDoc.variables.heading,
          text: textColor || baseDoc.variables.text,
        },
        elements: baseDoc.elements.map(el => {
          const o = elFx[el.id] || {}
          // Ring/border override shared by photos & shapes; width 0 removes it.
          const borderOf = (cur?: { width: number; color: string }) =>
            o.borderColor || o.borderWidth != null
              ? o.borderWidth === 0
                ? undefined
                : { width: o.borderWidth ?? cur?.width ?? 14, color: o.borderColor || (cur?.color?.startsWith('#') ? cur.color : data.accent) }
              : cur
          if (el.type === 'image') {
            const src = elImg[el.id]
            if (!src && !o.borderColor && o.borderWidth == null) return el
            return { ...el, ...(src ? { src, bind: undefined } : {}), border: borderOf(el.border) }
          }
          if (el.type === 'shape') {
            const textOverride = elText[el.id]
            if (textOverride === undefined && !o.fill && !o.textColor && !o.borderColor && o.borderWidth == null) return el
            return {
              ...el,
              fill: o.fill || el.fill,
              content: textOverride !== undefined ? textOverride : el.content,
              textColor: o.textColor || el.textColor,
              border: borderOf(el.border),
            }
          }
          if (el.type !== 'text') return el
          const textOverride = elText[el.id]
          if (textOverride === undefined && !o.color && !o.sizeMult && o.bold == null) return el
          return {
            ...el,
            content: textOverride !== undefined ? textOverride : el.content,
            bind: textOverride !== undefined ? undefined : el.bind,
            style: {
              ...el.style,
              color: o.color || el.style.color,
              size: o.sizeMult ? Math.round(el.style.size * o.sizeMult) : el.style.size,
              weight: o.bold != null ? (o.bold ? 900 : 500) : el.style.weight,
            },
          }
        }),
      }
    : null

  // Which fields the current template actually uses (show only those).
  const bgIsImage = baseDoc?.background.type === 'image' // full-bg photo (not a clickable element)
  // Photo-layer slider value: user's choice, else the template's own overlay
  const templateOverlayPct = (() => {
    const bg = baseDoc?.background
    if (!posterBg && bg && bg.type === 'image' && bg.overlay) {
      const m = bg.overlay.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/)
      if (m) return Math.min(80, Math.round(parseFloat(m[1]) * 100))
    }
    return 0
  })()
  const overlayValue = posterOverlay ?? templateOverlayPct
  const usesFeatures = !!baseDoc?.elements.some(e => e.type === 'features')
  const hasFields = usesFeatures || cap > 0

  // Canvas selection — the clicked element + its live overrides.
  const selectedEl = activeDoc?.elements.find(e => e.id === selectedId) || null
  const selText = selectedEl && selectedEl.type === 'text' ? selectedEl : null
  const selImage = selectedEl && selectedEl.type === 'image' ? selectedEl : null
  const selShape = selectedEl && selectedEl.type === 'shape' ? selectedEl : null
  const selO = (selectedId && elFx[selectedId]) || {}
  const selTextValue = selText ? displayText(selText.content, selText.bind, bindingData) : ''
  const selShapeText = selShape ? (elText[selShape.id] ?? selShape.content ?? '') : ''
  // Current border of the selected photo/shape, for the toolbar swatches
  const selBorder = (selShape || selImage)?.border
  const shapeFillValue = selShape ? (selO.fill || (selShape.fill.startsWith('#') ? selShape.fill : data.accent)) : '#ffffff'
  const borderColorValue = selO.borderColor || (selBorder?.color.startsWith('#') ? selBorder.color : data.accent)
  const borderWidthValue = selO.borderWidth ?? selBorder?.width ?? 0
  // Text sitting on a pill/badge: both edited from ONE toolbar.
  const companionShape = selText ? companionShapeOf(activeDoc, selText) : null
  const compO = (companionShape && elFx[companionShape.id]) || {}
  const compFillValue = companionShape ? (compO.fill || (companionShape.fill.startsWith('#') ? companionShape.fill : data.accent)) : '#ffffff'
  const compBorderColorValue = compO.borderColor || (companionShape?.border?.color.startsWith('#') ? companionShape.border.color : data.accent)
  const compBorderWidthValue = compO.borderWidth ?? companionShape?.border?.width ?? 0
  // Open the toolbar just above the clicked element (below it if no room above).
  const TOOLBAR_H = selText ? (companionShape ? 150 : 104) : selImage || (selShape && selShape.content === undefined) ? 56 : 104
  const posEl = selText || selImage || selShape
  const elTopPx = posEl ? posEl.y * scale : 0
  const elBottomPx = posEl ? (posEl.y + posEl.h) * scale : 0
  const toolbarTop = elTopPx - TOOLBAR_H - 8 >= 0 ? elTopPx - TOOLBAR_H - 8 : elBottomPx + 8
  const elPatchFor = (id: string, p: { color?: string; sizeMult?: number; bold?: boolean; fill?: string; textColor?: string; borderColor?: string; borderWidth?: number }) =>
    setElFx(prev => ({ ...prev, [id]: { ...prev[id], ...p } }))
  const elPatch = (p: { color?: string; sizeMult?: number; bold?: boolean; fill?: string; textColor?: string; borderColor?: string; borderWidth?: number }) => {
    if (selectedId) setElFx(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], ...p } }))
  }

  // Top element gets selected first; tapping the same spot again cycles to the
  // layer underneath (e.g. badge text → badge circle behind it).
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeDoc) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    const hits = activeDoc.elements
      .map((el, i) => ({ el, i }))
      .filter(({ el }) => el.type === 'text' || el.type === 'image' || el.type === 'shape')
      .filter(({ el }) => x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h)
      .sort((a, b) => ((b.el.z ?? 0) - (a.el.z ?? 0)) || (b.i - a.i))
      .map(({ el }) => el)
    if (hits.length === 0) { setSelectedId(null); return }
    const idx = hits.findIndex(h => h.id === selectedId)
    setSelectedId(hits[(idx + 1) % hits.length].id)
  }

  function toggleItem(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= cap) return [...prev.slice(1), id] // keep newest within cap
      return [...prev, id]
    })
  }

  // Every upload goes through the crop dialog, then uploads the cropped image.
  function openCrop(file: File, aspect: number, apply: (url: string) => void) {
    setCrop({ url: URL.createObjectURL(file), aspect, apply })
  }
  async function applyCrop(file: File) {
    const c = crop
    if (!c) return
    setUploadingBg(true)
    try { c.apply(await uploadImage(file, 'poster-img')) }
    catch { alert('Image upload failed. Try again.') }
    finally { setUploadingBg(false); URL.revokeObjectURL(c.url); setCrop(null) }
  }

  function handlePosterBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openCrop(file, POSTER_W / POSTER_H, setPosterBg)
    e.target.value = ''
  }
  function handleElImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedId) return
    const id = selectedId
    const aspect = selImage ? selImage.w / selImage.h : 1
    openCrop(file, aspect, url => setElImg(prev => ({ ...prev, [id]: url })))
    e.target.value = ''
  }

  async function renderPng(): Promise<string | null> {
    const { toPng } = await import('html-to-image')
    const opts = { width: POSTER_W, height: POSTER_H, pixelRatio: 3, cacheBust: true, backgroundColor: '#ffffff' }
    if (activeDoc && posterRef.current) {
      await waitForImages(posterRef.current)
      return toPng(posterRef.current, opts)
    }
    const idoc = iframeRef.current?.contentDocument
    if (!idoc?.body) return null
    await waitForImages(idoc)
    return toPng(idoc.body, opts)
  }

  async function downloadPng() {
    setExporting('png')
    try {
      const png = await renderPng()
      if (png) triggerDownload(png, `${fileBase()}.png`)
    } catch (e) { alert('Could not export PNG. Try again.'); console.error(e) }
    finally { setExporting('') }
  }

  async function downloadPdf() {
    setExporting('pdf')
    try {
      const png = await renderPng()
      if (!png) return
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: size })
      const w = pdf.internal.pageSize.getWidth()
      const h = pdf.internal.pageSize.getHeight()
      pdf.addImage(png, 'PNG', 0, 0, w, h)
      pdf.save(`${fileBase()}.pdf`)
    } catch (e) { alert('Could not export PDF. Try again.'); console.error(e) }
    finally { setExporting('') }
  }

  function fileBase() {
    return `${(restaurant?.subdomain || 'poster')}-${template}-${size}`
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
    </div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Posters</h1>
        <p className="text-gray-500 text-sm">Generate print-ready marketing posters for your light box — one click.</p>
      </div>

      {/* Side-by-side layout holds down to 960px so ~1020px screens keep it */}
      <div className="flex flex-col min-[960px]:flex-row gap-6">
        {/* ── Preview (right, large, always visible) ──── */}
        <div className="flex-1 order-2">
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 relative">
            <div ref={wrapRef} className="flex flex-wrap gap-4 items-start justify-center">
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: previewW, height: POSTER_H * scale }}>
              <div style={{ width: previewW, height: POSTER_H * scale }} className="rounded-lg overflow-hidden shadow-xl bg-white cursor-pointer"
                onClick={handleCanvasClick}>
                {activeDoc ? (
                  <>
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: POSTER_W, height: POSTER_H }}>
                      <PosterRenderer doc={activeDoc} data={bindingData} selectedId={selectedId} />
                    </div>
                    {/* full-res, non-interactive copy for export (no selection outline) */}
                    <div aria-hidden style={{ position: 'absolute', top: 0, left: -99999, width: POSTER_W, height: POSTER_H, pointerEvents: 'none' }}>
                      <div ref={posterRef}><PosterRenderer doc={activeDoc} data={bindingData} /></div>
                    </div>
                  </>
                ) : html ? (
                  <iframe ref={iframeRef} title="poster-preview" srcDoc={html}
                    width={POSTER_W} height={POSTER_H}
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top left', border: 0 }} />
                ) : null}
              </div>

              {/* Element toolbar — opens just above the clicked element */}
              {selText && (
                <div className="absolute z-30 w-72 max-w-[96%] bg-white rounded-xl shadow-lg border border-gray-200 p-2"
                  style={{ top: toolbarTop, left: '50%', transform: 'translateX(-50%)' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input type="text" value={selTextValue}
                      onChange={e => selectedId && setElText(prev => ({ ...prev, [selectedId]: e.target.value }))}
                      placeholder="Edit text…" autoFocus
                      className="flex-1 min-w-0 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <button onClick={() => setSelectedId(null)} title="Done"
                      className="text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selO.color || '#111111'} onChange={e => elPatch({ color: e.target.value })}
                      className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5" title="Colour" />
                    <div className="flex rounded-md border border-gray-200 overflow-hidden">
                      {([['S', 0.8], ['M', 1], ['L', 1.3]] as [string, number][]).map(([lbl, mult]) => (
                        <button key={lbl} onClick={() => elPatch({ sizeMult: mult })}
                          className={`px-2 py-1 text-[11px] font-semibold cursor-pointer ${(selO.sizeMult ?? 1) === mult ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>{lbl}</button>
                      ))}
                    </div>
                    <button onClick={() => elPatch({ bold: !selO.bold })} title="Bold"
                      className={`w-7 h-7 rounded border text-xs font-bold cursor-pointer ${selO.bold ? 'border-orange-400 text-orange-600 bg-orange-50' : 'border-gray-200 text-gray-500'}`}>B</button>
                    {(selO.color || selO.sizeMult || selO.bold != null || (selectedId && elText[selectedId] !== undefined) || (companionShape && elFx[companionShape.id])) &&
                      <button onClick={() => {
                        setElFx(prev => { const n = { ...prev }; delete n[selectedId!]; if (companionShape) delete n[companionShape.id]; return n })
                        setElText(prev => { const n = { ...prev }; delete n[selectedId!]; return n })
                      }}
                        className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer ml-auto">reset</button>}
                  </div>
                  {/* The pill/badge behind this text — same toolbar, one thing for the owner */}
                  {companionShape && (
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">Fill</span>
                      <input type="color" value={compFillValue} onChange={e => elPatchFor(companionShape.id, { fill: e.target.value })}
                        title="Badge fill" className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                      <span className="text-[10px] text-gray-400 ml-1">Border</span>
                      <input type="color" value={compBorderColorValue} onChange={e => elPatchFor(companionShape.id, { borderColor: e.target.value })}
                        title="Border colour" className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                      <div className="flex rounded-md border border-gray-200 overflow-hidden" title="Border thickness">
                        {([['0', 0], ['S', 6], ['M', 14], ['L', 24]] as [string, number][]).map(([lbl, w]) => (
                          <button key={lbl} onClick={() => elPatchFor(companionShape.id, { borderWidth: w })}
                            className={`px-1.5 py-1 text-[11px] font-semibold cursor-pointer ${compBorderWidthValue === w ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selImage && (
                <div className="absolute z-30 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex items-center gap-2"
                  style={{ top: toolbarTop, left: '50%', transform: 'translateX(-50%)' }}>
                  <label className={`flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 cursor-pointer hover:border-orange-300 hover:text-orange-600 ${uploadingBg ? 'opacity-50 cursor-wait' : ''}`}>
                    <ImagePlus className="w-4 h-4" /> {uploadingBg ? 'Uploading…' : 'Change image'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingBg} onChange={handleElImgUpload} />
                  </label>
                  <input type="color" value={borderColorValue} onChange={e => elPatch({ borderColor: e.target.value })} title="Border colour"
                    className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                  <div className="flex rounded-md border border-gray-200 overflow-hidden" title="Border thickness">
                    {([['0', 0], ['S', 6], ['M', 14], ['L', 24]] as [string, number][]).map(([lbl, w]) => (
                      <button key={lbl} onClick={() => elPatch({ borderWidth: w })}
                        className={`px-1.5 py-1 text-[11px] font-semibold cursor-pointer ${borderWidthValue === w ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>{lbl}</button>
                    ))}
                  </div>
                  {selectedId && (elImg[selectedId] || elFx[selectedId]) &&
                    <button onClick={() => { setElImg(prev => { const n = { ...prev }; delete n[selectedId!]; return n }); setElFx(prev => { const n = { ...prev }; delete n[selectedId!]; return n }) }}
                      className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer">reset</button>}
                  <button onClick={() => setSelectedId(null)} title="Done"
                    className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* Shape toolbar — corner blocks, badges, rings */}
              {selShape && (
                <div className="absolute z-30 w-80 max-w-[96%] bg-white rounded-xl shadow-lg border border-gray-200 p-2"
                  style={{ top: toolbarTop, left: '50%', transform: 'translateX(-50%)' }}>
                  {selShape.content !== undefined && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <input type="text" value={selShapeText}
                        onChange={e => selectedId && setElText(prev => ({ ...prev, [selectedId]: e.target.value }))}
                        placeholder="Badge text…" autoFocus
                        className="flex-1 min-w-0 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      <input type="color" value={selO.textColor || '#ffffff'} onChange={e => elPatch({ textColor: e.target.value })} title="Text colour"
                        className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Fill</span>
                    <input type="color" value={shapeFillValue} onChange={e => elPatch({ fill: e.target.value })} title="Fill colour"
                      className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                    <span className="text-[10px] text-gray-400 ml-1">Border</span>
                    <input type="color" value={borderColorValue} onChange={e => elPatch({ borderColor: e.target.value })} title="Border colour"
                      className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                    <div className="flex rounded-md border border-gray-200 overflow-hidden" title="Border thickness">
                      {([['0', 0], ['S', 6], ['M', 14], ['L', 24]] as [string, number][]).map(([lbl, w]) => (
                        <button key={lbl} onClick={() => elPatch({ borderWidth: w })}
                          className={`px-1.5 py-1 text-[11px] font-semibold cursor-pointer ${borderWidthValue === w ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>{lbl}</button>
                      ))}
                    </div>
                    {selectedId && (elFx[selectedId] || elText[selectedId] !== undefined) &&
                      <button onClick={() => { setElFx(prev => { const n = { ...prev }; delete n[selectedId!]; return n }); setElText(prev => { const n = { ...prev }; delete n[selectedId!]; return n }) }}
                        className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer ml-auto">reset</button>}
                    <button onClick={() => setSelectedId(null)} title="Done"
                      className="text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
                </div>
                {activeDoc && !selText && !selImage && !selShape && (
                  <p className="text-[11px] text-gray-400 mt-2">✦ Tip: tap anything on the poster to edit it — tap the same spot again to select the layer underneath.</p>
                )}
                <div className="flex gap-3 mt-6">
                  <Button onClick={downloadPng} loading={exporting === 'png'} variant="outline">
                    <FileImage className="w-4 h-4 mr-1.5" /> PNG
                  </Button>
                  <Button onClick={downloadPdf} loading={exporting === 'pdf'}>
                    <FileText className="w-4 h-4 mr-1.5" /> Download PDF
                  </Button>
                </div>
                <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Print it and slot into your light box · {POSTER_SIZES[size].label}
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* ── Global settings (third column) ──── */}
        <div className="min-[960px]:w-52 min-[960px]:shrink-0 order-3">
          {activeDoc && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4 min-[960px]:sticky min-[960px]:top-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Size</p>
                <div className="flex flex-col gap-1.5">
                  {(Object.keys(POSTER_SIZES) as PosterSizeKey[]).map(k => (
                    <button key={k} onClick={() => setSize(k)}
                      className={`rounded-lg border py-2 text-xs font-semibold cursor-pointer transition-colors ${size === k ? 'border-orange-400 text-orange-600 bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {POSTER_SIZES[k].label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Background — colour OR image, never both */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Background</p>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2.5">
                  {(['colour', 'image'] as const).map(m => (
                    <button key={m} onClick={() => setBgMode(m)}
                      className={`flex-1 py-1.5 text-[10px] font-semibold capitalize cursor-pointer transition-colors ${activeBgMode === m ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                {activeBgMode === 'colour' ? (
                  <ColorRow label="Colour" value={color || data.accent} onChange={setColor} onReset={color ? () => setColor('') : undefined} />
                ) : (
                  <>
                    <label className={`flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-[11px] font-medium text-gray-600 cursor-pointer hover:border-orange-300 hover:text-orange-600 ${uploadingBg ? 'opacity-50 cursor-wait' : ''}`}>
                      <ImagePlus className="w-3.5 h-3.5" /> {uploadingBg ? 'Uploading…' : (posterBg || bgIsImage) ? 'Change image' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingBg} onChange={handlePosterBgUpload} />
                    </label>
                    {!posterBg && bgIsImage && <p className="mt-1 text-[10px] text-gray-400 leading-snug">Using your cover photo</p>}
                    {!posterBg && !bgIsImage && <p className="mt-1 text-[10px] text-gray-400 leading-snug">Upload a photo to use it here</p>}
                    {posterBg && <button onClick={() => { setPosterBg(''); setPosterOverlay(null) }} className="mt-1 text-[10px] text-gray-400 hover:text-red-500 cursor-pointer">Remove image</button>}
                    {(posterBg || bgIsImage) && (
                      <div className="mt-3" title="Photo layer — darker photo, clearer text">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Photo layer
                          </span>
                          <span className="text-[10px] text-gray-400">{overlayValue}%</span>
                        </div>
                        <input type="range" min={0} max={80} step={5} value={overlayValue}
                          onChange={e => setPosterOverlay(Number(e.target.value))}
                          className="w-full min-w-0 accent-orange-500 cursor-pointer" />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Colours</p>
                <p className="text-[10px] text-gray-400 mb-2 leading-snug">Changes the whole poster</p>
                <div className="flex flex-col gap-3">
                  {activeBgMode === 'image' && (
                    <ColorRow label="Accent" value={color || data.accent} onChange={setColor} onReset={color ? () => setColor('') : undefined} />
                  )}
                  <ColorRow label="Heading" value={headingColor || baseDoc?.variables.heading || '#ffffff'} onChange={setHeadingColor} onReset={headingColor ? () => setHeadingColor('') : undefined} />
                  <ColorRow label="Text" value={textColor || baseDoc?.variables.text || '#ffffff'} onChange={setTextColor} onReset={textColor ? () => setTextColor('') : undefined} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Left panel: template picker + (conditional) details ─── */}
        <div className="min-[960px]:w-52 xl:w-80 min-[960px]:shrink-0 order-1 space-y-5">
          <Section title="Template">
            <div className="grid grid-cols-2 min-[960px]:grid-cols-1 xl:grid-cols-2 gap-2">
              {POSTER_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setTemplate(t.id); setSelectedIds([]); setSelectedId(null); setElFx({}); setElText({}); setElImg({}); setPosterBg(''); setPosterOverlay(null); setBgMode(null) }}
                  className={`rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${template === t.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}>
                  <div className="text-xs font-bold text-gray-900 leading-tight">{t.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1 leading-tight">{t.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 leading-snug">✦ Tap anything on the poster to edit it — tap again for the layer underneath. Size &amp; colours are on the right.</p>
          </Section>

          {hasFields && (
            <Section title="Details">
              {usesFeatures && <Field label="Feature tags (comma-separated)" value={features} onChange={setFeatures} placeholder="100% Fresh, Made to Order" />}

              {cap > 0 && (
                <div className="mt-1">
                  <p className="text-xs font-medium text-gray-500 mb-2">Dishes ({selectedItems.length}/{cap})</p>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5"><ImagePlus className="w-4 h-4" /> Add menu items first to feature them.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {items.map(it => {
                        const active = selectedIds.includes(it.id)
                        const auto = !selectedIds.length && selectedItems.some(s => s.name === it.name)
                        return (
                          <button key={it.id} onClick={() => toggleItem(it.id)}
                            className={`w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${active ? 'border-orange-300 bg-orange-50' : auto ? 'border-gray-200 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                            {it.image_url
                              ? <img src={it.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                              : <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs">🍽️</div>}
                            <span className="flex-1 text-xs font-medium text-gray-800 truncate">{it.name}</span>
                            <span className="text-xs text-gray-400">₹{it.price}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">None selected → first {cap} used automatically.</p>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      {crop && (
        <CropModal src={crop.url} aspect={crop.aspect}
          onCancel={() => { URL.revokeObjectURL(crop.url); setCrop(null) }} onDone={applyCrop} />
      )}
    </div>
  )
}

function ColorRow({ label, value, onChange, onReset }:
  { label: string; value: string; onChange: (v: string) => void; onReset?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
      <span className="text-xs text-gray-600 flex-1 truncate">{label}</span>
      {onReset && <button onClick={onReset} className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer shrink-0">reset</button>}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300" />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  )
}

const ACCENTS: Record<PosterTemplate, string> = {
  scan: '#f97316', cover: '#e11d48', flyer: '#e11d48', bold: '#f97316', offer: '#e11d48', bento: '#ea580c',
}
function defaultAccent(t: PosterTemplate) { return ACCENTS[t] || '#f97316' }

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function waitForImages(root: Document | HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[]
  return Promise.all(imgs.map(img =>
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
  )).then(() => undefined)
}
