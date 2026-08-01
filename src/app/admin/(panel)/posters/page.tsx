'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download, FileImage, FileText, Loader2, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { uploadImage } from '@/lib/uploadImage'
import { PosterRenderer } from '@/lib/poster-doc/PosterRenderer'
import { POSTER_DOCS } from '@/lib/poster-doc/docs'
import type { PosterBindingData, Background } from '@/lib/poster-doc/types'
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
const PREVIEW_W = 360
const SCALE = PREVIEW_W / POSTER_W

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
  const [bgImage, setBgImage] = useState('') // Cover: uploaded background image
  const [posterBg, setPosterBg] = useState('') // any template: image used as the whole background
  const [uploadingBg, setUploadingBg] = useState(false)
  const [crop, setCrop] = useState<{ url: string; aspect: number; apply: (url: string) => void } | null>(null)
  // Canvas selection (Phase 1) — click an element to edit it directly.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [elFx, setElFx] = useState<Record<string, { color?: string; sizeMult?: number; bold?: boolean }>>({})
  const [elText, setElText] = useState<Record<string, string>>({}) // per-element text content override
  const [elImg, setElImg] = useState<Record<string, string>>({})   // per-element image src override
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [exporting, setExporting] = useState<'' | 'png' | 'pdf'>('')

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)

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
    coverUrl: bgImage || restaurant?.cover_image_url,
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
    coverImage: bgImage || restaurant?.cover_image_url,
    qrDataUrl,
    menuUrl: menuUrlText,
    cta: cta.trim() || undefined,
    phone: phone.trim() || undefined,
    items: selectedItems,
  }
  const baseDoc = POSTER_DOCS[template]
  const activeDoc = baseDoc && qrDataUrl
    ? {
        ...baseDoc,
        background: (posterBg
          ? { type: 'image' as const, src: posterBg, fit: 'cover' as const }
          : baseDoc.background) as Background,
        variables: {
          ...baseDoc.variables,
          accent: data.accent,
          heading: headingColor || baseDoc.variables.heading,
          text: textColor || baseDoc.variables.text,
        },
        elements: baseDoc.elements.map(el => {
          if (el.type === 'image' && elImg[el.id]) return { ...el, src: elImg[el.id], bind: undefined }
          if (el.type !== 'text') return el
          const o = elFx[el.id] || {}
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
  const usesFeatures = !!baseDoc?.elements.some(e => e.type === 'features')
  const hasFields = bgIsImage || usesFeatures || cap > 0

  // Canvas selection — the clicked element + its live overrides.
  const selectedEl = activeDoc?.elements.find(e => e.id === selectedId) || null
  const selText = selectedEl && selectedEl.type === 'text' ? selectedEl : null
  const selImage = selectedEl && selectedEl.type === 'image' ? selectedEl : null
  const selO = (selectedId && elFx[selectedId]) || {}
  const selTextValue = selText ? displayText(selText.content, selText.bind, bindingData) : ''
  // Open the toolbar just above the clicked element (below it if no room above).
  const TOOLBAR_H = selImage ? 56 : 104
  const posEl = selText || selImage
  const elTopPx = posEl ? posEl.y * SCALE : 0
  const elBottomPx = posEl ? (posEl.y + posEl.h) * SCALE : 0
  const toolbarTop = elTopPx - TOOLBAR_H - 8 >= 0 ? elTopPx - TOOLBAR_H - 8 : elBottomPx + 8
  const elPatch = (p: { color?: string; sizeMult?: number; bold?: boolean }) => {
    if (selectedId) setElFx(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], ...p } }))
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

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openCrop(file, POSTER_W / POSTER_H, setBgImage)
    e.target.value = ''
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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Preview (right, large, always visible) ──── */}
        <div className="flex-1 order-2">
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 relative">
            <div className="flex flex-wrap gap-6 items-start justify-center">
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: PREVIEW_W, height: POSTER_H * SCALE }}>
              <div style={{ width: PREVIEW_W, height: POSTER_H * SCALE }} className="rounded-lg overflow-hidden shadow-xl bg-white">
                {activeDoc ? (
                  <>
                    <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: POSTER_W, height: POSTER_H }}>
                      <PosterRenderer doc={activeDoc} data={bindingData} interactive selectedId={selectedId} onSelect={setSelectedId} />
                    </div>
                    {/* full-res, non-interactive copy for export (no selection outline) */}
                    <div aria-hidden style={{ position: 'absolute', top: 0, left: -99999, width: POSTER_W, height: POSTER_H, pointerEvents: 'none' }}>
                      <div ref={posterRef}><PosterRenderer doc={activeDoc} data={bindingData} /></div>
                    </div>
                  </>
                ) : html ? (
                  <iframe ref={iframeRef} title="poster-preview" srcDoc={html}
                    width={POSTER_W} height={POSTER_H}
                    style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', border: 0 }} />
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
                    {(selO.color || selO.sizeMult || selO.bold != null || (selectedId && elText[selectedId] !== undefined)) &&
                      <button onClick={() => { setElFx(prev => { const n = { ...prev }; delete n[selectedId!]; return n }); setElText(prev => { const n = { ...prev }; delete n[selectedId!]; return n }) }}
                        className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer ml-auto">reset</button>}
                  </div>
                </div>
              )}

              {selImage && (
                <div className="absolute z-30 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex items-center gap-2"
                  style={{ top: toolbarTop, left: '50%', transform: 'translateX(-50%)' }}>
                  <label className={`flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 cursor-pointer hover:border-orange-300 hover:text-orange-600 ${uploadingBg ? 'opacity-50 cursor-wait' : ''}`}>
                    <ImagePlus className="w-4 h-4" /> {uploadingBg ? 'Uploading…' : 'Change image'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingBg} onChange={handleElImgUpload} />
                  </label>
                  {selectedId && elImg[selectedId] &&
                    <button onClick={() => setElImg(prev => { const n = { ...prev }; delete n[selectedId!]; return n })}
                      className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer">reset</button>}
                  <button onClick={() => setSelectedId(null)} title="Done"
                    className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
              )}
                </div>
                {activeDoc && !selText && !selImage && (
                  <p className="text-[11px] text-gray-400 mt-2">✦ Tip: tap any text or image on the poster to edit it.</p>
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

              {activeDoc && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 w-40 shrink-0 space-y-4">
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
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Colours</p>
                    <p className="text-[10px] text-gray-400 mb-2 leading-snug">Changes the whole poster</p>
                    <div className="flex flex-col gap-3">
                      <ColorRow label="Background" value={color || data.accent} onChange={setColor} onReset={color ? () => setColor('') : undefined} />
                      <ColorRow label="Heading" value={headingColor || baseDoc?.variables.heading || '#ffffff'} onChange={setHeadingColor} onReset={headingColor ? () => setHeadingColor('') : undefined} />
                      <ColorRow label="Text" value={textColor || baseDoc?.variables.text || '#ffffff'} onChange={setTextColor} onReset={textColor ? () => setTextColor('') : undefined} />
                    </div>
                    <label className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-[11px] font-medium text-gray-600 cursor-pointer hover:border-orange-300 hover:text-orange-600 ${uploadingBg ? 'opacity-50 cursor-wait' : ''}`}>
                      <ImagePlus className="w-3.5 h-3.5" /> {posterBg ? 'Change bg image' : 'Or use an image'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingBg} onChange={handlePosterBgUpload} />
                    </label>
                    {posterBg && <button onClick={() => setPosterBg('')} className="mt-1 text-[10px] text-gray-400 hover:text-red-500 cursor-pointer">Remove · back to colour</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Left panel: template picker + (conditional) details ─── */}
        <div className="lg:w-96 lg:shrink-0 order-1 space-y-5">
          <Section title="Template">
            <div className="grid grid-cols-2 gap-2">
              {POSTER_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setTemplate(t.id); setSelectedIds([]); setSelectedId(null); setElFx({}); setElText({}); setElImg({}); setPosterBg('') }}
                  className={`rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${template === t.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}>
                  <div className="text-xs font-bold text-gray-900 leading-tight">{t.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1 leading-tight">{t.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 leading-snug">✦ Tap any text or image on the poster to edit it. Size &amp; colours are on the right.</p>
          </Section>

          {hasFields && (
            <Section title="Details">
              {bgIsImage && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Background image</label>
                  <div className="flex items-center gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:border-orange-300 hover:text-orange-600 ${uploadingBg ? 'opacity-50 cursor-wait' : ''}`}>
                      <ImagePlus className="w-4 h-4" /> {uploadingBg ? 'Uploading…' : bgImage ? 'Change image' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingBg} onChange={handleBgUpload} />
                    </label>
                    {bgImage && <button onClick={() => setBgImage('')} className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Remove</button>}
                  </div>
                </div>
              )}

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
