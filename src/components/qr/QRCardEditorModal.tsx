'use client'

import { useEffect, useState } from 'react'
import { QRTemplate } from '@/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Plus, Download, Palette, Type, ImageIcon, Layers } from 'lucide-react'
import QRCode from 'qrcode'
import { useCropUpload } from '@/components/ui/useCropUpload'

// One QR-card editor for every kind of QR: table cards edit/save per table,
// the Menu QR edits/saves per restaurant. The card title slot ("Table 5" /
// restaurant name) comes from `displayTitle`.
//
// The legacy template HTML hard-codes `Table ${tableNumber}` — we render
// with a sentinel and swap in the real title, so both usages share it.
const TITLE_SENTINEL = '@@TITLE@@'

export interface QRCardSettings {
  card_image?: string | null
  card_template?: string | null
  card_bg_color?: string | null
  card_bg_image?: string | null
  card_text_color?: string | null
  card_heading?: string | null
  card_subtext?: string | null
  card_label?: string | null
  card_overlay?: number | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string          // modal header
  displayTitle: string   // shown on the card itself
  qrUrl: string          // what the QR points at
  initial: QRCardSettings
  /** Overrides the per-template default subtext (e.g. "Scan to see our menu"). */
  defaultSubtext?: string
  /** A short note shown above the card, e.g. what this QR is for. */
  note?: string
  /** Extra controls rendered above the card (e.g. the menu-style picker). */
  extraSection?: React.ReactNode
  onSave: (s: QRCardSettings) => Promise<boolean>
}

const DEFAULT_TEXTS: Record<QRTemplate, { heading: string; subtext: string; label: string }> = {
  classic:   { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital' },
  minimal:   { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital' },
  template3: { heading: 'SCAN HERE', subtext: 'To see our menu',  label: ''        },
  template4: { heading: 'MENU',      subtext: 'Scan to view our', label: ''        },
  template5: { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital' },
  template6: { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital' },
  template7: { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital' },
  template8: { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital' },
}

const IFRAME_TEMPLATES = ['template5', 'template6', 'template7', 'template8']

export function QRCardEditorModal({ isOpen, onClose, title, displayTitle, qrUrl, initial, defaultSubtext, note, extraSection, onSave }: Props) {
  // Parents mount this component fresh per open ({open && <QRCardEditorModal/>}),
  // so the saved settings can seed the state directly.
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [cardImage, setCardImage] = useState(initial.card_image || '')
  const [cardTemplate, setCardTemplate] = useState<QRTemplate>((initial.card_template as QRTemplate) || 'classic')
  const [cardBgColor, setCardBgColor] = useState(initial.card_bg_color || '')
  const [cardBgImage, setCardBgImage] = useState(initial.card_bg_image || '')
  const [cardTextColor, setCardTextColor] = useState(initial.card_text_color || '')
  const [cardOverlay, setCardOverlay] = useState(initial.card_overlay ?? 0)
  const [cardHeading, setCardHeading] = useState(initial.card_heading || '')
  const [cardSubtext, setCardSubtext] = useState(initial.card_subtext || '')
  const [cardLabel, setCardLabel] = useState(initial.card_label || '')
  const [editingField, setEditingField] = useState<'heading' | 'subtext' | 'label' | null>(null)
  const [savingCard, setSavingCard] = useState(false)
  const { openCrop, cropModal, uploading } = useCropUpload('qr-card')
  const [qrLib, setQrLib] = useState<typeof import('@/lib/qr-templates') | null>(null)

  useEffect(() => {
    import('@/lib/qr-templates').then(setQrLib)
    QRCode.toDataURL(qrUrl, { width: 300, margin: 2, color: { dark: '#1f2937', light: '#ffffff' } })
      .then(setQrDataUrl)
  }, [qrUrl])

  function defaults(t: QRTemplate) {
    const d = DEFAULT_TEXTS[t]
    return defaultSubtext ? { ...d, subtext: defaultSubtext } : d
  }

  function cardHTML(withDefaults: boolean): string {
    if (!qrLib) return ''
    const def = defaults(cardTemplate)
    const html = qrLib.getCardHTML(
      cardTemplate, TITLE_SENTINEL, cardImage, qrDataUrl,
      cardBgColor || undefined, cardTextColor || undefined, cardBgImage || undefined,
      cardHeading || (withDefaults ? def.heading : undefined),
      cardSubtext || (withDefaults ? def.subtext : undefined),
      cardLabel || (withDefaults ? def.label : undefined),
      cardOverlay
    )
    return html.replaceAll(`Table ${TITLE_SENTINEL}`, displayTitle)
  }

  function handleCardImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openCrop(file, 4 / 3, url => setCardImage(url))
    e.target.value = ''
  }

  function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openCrop(file, 330 / 460, url => { setCardBgImage(url); setCardBgColor('') })
    e.target.value = ''
  }

  async function save() {
    setSavingCard(true)
    await onSave({
      card_image: cardImage || null,
      card_template: cardTemplate,
      card_bg_color: cardBgColor || null,
      card_bg_image: cardBgImage || null,
      card_text_color: cardTextColor || null,
      card_heading: cardHeading || null,
      card_subtext: cardSubtext || null,
      card_label: cardLabel || null,
      card_overlay: cardOverlay,
    })
    setSavingCard(false)
  }

  function printCard() {
    const html = cardHTML(true)
    if (!html) return
    const win = window.open('', '_blank', 'width=400,height=640')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 300)
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      headerExtra={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" title="Card Background">
            <Palette className="w-5 h-5 text-gray-400" />
            <input type="color"
              value={cardBgColor || (qrLib?.TEMPLATES.find(x => x.id === cardTemplate)?.cardBg ?? '#ffffff')}
              onChange={e => { setCardBgColor(e.target.value); setCardBgImage('') }}
              className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5" />
            <label className={`cursor-pointer p-1 rounded border transition-colors ${uploading ? 'opacity-50 cursor-wait' : ''} ${cardBgImage ? 'border-orange-400 text-orange-500' : 'border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-400'}`} title="Use image as background">
              <ImageIcon className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleBgImageUpload} />
            </label>
            <button onClick={() => { setCardBgColor(''); setCardBgImage(''); setCardOverlay(0) }} className="text-xs text-gray-400 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded border border-gray-200 hover:border-red-300">Reset</button>
          </div>
          {cardBgImage && (
            <div className="flex items-center gap-1.5" title="Photo layer — darker photo, clearer text">
              <Layers className="w-5 h-5 text-gray-400" />
              <input type="range" min={0} max={80} step={5} value={cardOverlay}
                onChange={e => setCardOverlay(Number(e.target.value))}
                className="w-20 accent-orange-500 cursor-pointer" />
              <span className="text-[10px] text-gray-400 w-6">{cardOverlay}%</span>
            </div>
          )}
          <div className="flex items-center gap-1.5" title="Text Color">
            <Type className="w-5 h-5 text-gray-400" />
            <input type="color"
              value={cardTextColor || (qrLib?.TEMPLATES.find(x => x.id === cardTemplate)?.accent ?? '#111111')}
              onChange={e => setCardTextColor(e.target.value)}
              className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5" />
            <button onClick={() => setCardTextColor('')} className="text-xs text-gray-400 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded border border-gray-200 hover:border-red-300">Reset</button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col md:flex-row gap-5 md:h-145">

        {/* Template selector */}
        <div className="md:shrink-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Template</p>
          <div className="grid grid-cols-4 md:grid-cols-2 gap-2">
            {(qrLib?.TEMPLATES ?? []).map(t => (
              <button key={t.id} onClick={() => setCardTemplate(t.id)}
                className={`w-full md:w-24 rounded-xl border-2 py-3 md:py-4 flex flex-col items-center gap-1.5 md:gap-2 transition-all cursor-pointer ${cardTemplate === t.id ? 'border-orange-400 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                style={{ background: t.cardBg }}>
                <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: t.accent, background: t.accent + '33' }} />
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: t.accent }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* QR card + actions */}
        <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto">
          {note && <p className="text-xs text-gray-400 text-center">{note}</p>}
          {extraSection}
          {(() => {
            const t = qrLib?.TEMPLATES.find(x => x.id === cardTemplate) ?? qrLib?.TEMPLATES[0]
            const activeBg = cardBgColor || t?.cardBg || '#ffffff'
            const overlayLayer = cardOverlay > 0 ? `linear-gradient(rgba(0,0,0,${cardOverlay / 100}),rgba(0,0,0,${cardOverlay / 100})),` : ''
            const activeBgStyle = cardBgImage
              ? { backgroundImage: `${overlayLayer}url(${cardBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: activeBg }
            const activeText = cardTextColor || t?.accent || '#111111'
            const def = defaults(cardTemplate)
            const activeHeading = cardHeading || def.heading
            const activeSubtext = cardSubtext || def.subtext
            const activeLabel  = cardLabel  || def.label

            const editable = (field: 'heading' | 'subtext' | 'label', className?: string, style?: React.CSSProperties) => {
              const rawValue     = field === 'heading' ? cardHeading : field === 'subtext' ? cardSubtext : cardLabel
              const displayValue = field === 'heading' ? activeHeading : field === 'subtext' ? activeSubtext : activeLabel
              const setter       = field === 'heading' ? setCardHeading : field === 'subtext' ? setCardSubtext : setCardLabel
              if (editingField === field) return (
                <input autoFocus value={rawValue}
                  onChange={e => setter(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  onKeyDown={e => e.key === 'Enter' && setEditingField(null)}
                  className="bg-transparent border-b-2 border-dashed outline-none text-center w-full"
                  style={style} />
              )
              return <span onClick={() => setEditingField(field)} className={`cursor-text border-b border-dashed border-transparent hover:border-current ${className ?? ''}`} style={style} title="Click to edit">{displayValue}</span>
            }

            if (cardTemplate === 'template3') return (
              <div className="w-full max-w-125 mx-auto rounded-xl overflow-hidden shadow-xl" style={{ ...activeBgStyle, minHeight: 420 }}>
                <div className="py-2.5 px-5 text-center text-white text-xs font-extrabold tracking-[3px] uppercase" style={{ background: activeText }}>
                  {displayTitle}
                </div>
                <div className="px-7 pt-6 pb-8 text-center flex flex-col items-center">
                  {editable('subtext', 'text-sm font-bold tracking-[2px] uppercase mb-1 block', { color: activeText })}
                  {editable('heading', 'font-black leading-none uppercase tracking-wide block', { fontSize: 52, fontFamily: 'Impact, Arial Black, sans-serif', color: activeText })}
                  <div className="mt-5 p-2.5 bg-white rounded" style={{ border: `5px solid ${activeText}` }}>
                    {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-40 h-40" />}  {/* eslint-disable-line @next/next/no-img-element */}
                  </div>
                </div>
              </div>
            )

            // Gradient templates: render the real card HTML in an iframe so
            // the preview exactly matches what prints.
            if (IFRAME_TEMPLATES.includes(cardTemplate) && qrLib && qrDataUrl) return (
              <div className="w-full flex justify-center">
                <iframe
                  title="QR card preview"
                  srcDoc={cardHTML(false)}
                  className="rounded-2xl shadow-xl border border-gray-100 pointer-events-none bg-white max-w-full"
                  style={{ width: 330, height: 460 }}
                />
              </div>
            )

            if (cardTemplate === 'template4') return (
              <div className="w-full max-w-125 mx-auto rounded-xl overflow-hidden shadow-xl flex flex-col items-center px-7 py-6 text-center" style={{ ...activeBgStyle, minHeight: 420 }}>
                <div className="text-3xl leading-none mb-1" style={{ color: activeText }}>❧</div>
                <hr className="w-full border-t-2 mb-4" style={{ borderColor: activeText }} />
                <div className="bg-white p-3 rounded mb-4">
                  {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-40 h-40" />}  {/* eslint-disable-line @next/next/no-img-element */}
                </div>
                {editable('subtext', 'text-sm italic leading-tight block', { color: activeText })}
                {editable('heading', 'text-4xl font-black tracking-widest leading-tight block', { fontFamily: 'Georgia, serif', color: activeText })}
                <hr className="w-full border-t-2 mt-4 mb-2" style={{ borderColor: activeText }} />
                <p className="text-[10px] uppercase tracking-widest opacity-70" style={{ color: activeText }}>{displayTitle}</p>
              </div>
            )

            const showImg = cardTemplate !== 'minimal'
            return (
              <div className="w-full max-w-125 mx-auto rounded-2xl overflow-hidden shadow-xl border border-gray-100" style={{ minHeight: 420 }}>
                {showImg && (
                  <div className="h-44 overflow-hidden">
                    {cardImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cardImage} alt="food" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${activeText}33, ${activeText}66)` }} />
                    )}
                  </div>
                )}
                <div className={`px-6 pb-5 text-center flex flex-col items-center justify-center ${showImg ? 'pt-6' : 'pt-0 h-105'}`} style={activeBgStyle}>
                  {qrDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="QR" className="w-44 h-44 mx-auto mb-4" />
                  )}
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <span className="text-xl font-black italic" style={{ color: activeText }}>{displayTitle}</span>
                    <span className="text-2xl font-light" style={{ color: activeText }}>|</span>
                    <div className="text-left">
                      {editable('label', 'text-[9px] tracking-[3px] uppercase leading-none font-semibold opacity-80 block', { color: activeText })}
                      {editable('heading', 'text-2xl font-black uppercase leading-tight block', { color: activeText })}
                    </div>
                  </div>
                  {editable('subtext', 'text-xs tracking-[2px] mt-1 font-medium opacity-80 block', { color: activeText })}
                </div>
              </div>
            )
          })()}

          {(cardTemplate === 'classic' || cardTemplate === 'template3') && (
            <label className={`w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-xl py-2 text-sm transition-colors ${uploading ? 'text-gray-300 cursor-wait' : 'text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer'}`}>
              <Plus className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Change Food Image'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleCardImageUpload} />
            </label>
          )}

          <div className="w-full flex gap-2">
            <Button className="flex-1" loading={savingCard} onClick={save}>Save</Button>
            <Button variant="outline" className="flex-1" onClick={printCard}>
              <Download className="w-4 h-4 mr-1.5" /> Print
            </Button>
          </div>
        </div>

      </div>
    </Modal>
    {cropModal}
    </>
  )
}
