'use client'

import { useEffect, useState } from 'react'
import { RestaurantTable, TableStatus, QRTemplate } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { QrCode, Plus, Trash2, Download, Pencil, ClipboardList, Copy, Check, Palette, Type, ImageIcon } from 'lucide-react'
import QRCode from 'qrcode'
import { formatCurrency } from '@/lib/utils'
import { uploadImage } from '@/lib/uploadImage'

interface OrderItem { id: string; quantity: number; total_price: number; menu_item?: { name: string } }
interface TableOrder { id: string; customer_name?: string; status: string; total_amount: number; created_at: string; items?: OrderItem[] }

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')

const statusVariant = (status: string) => {
  if (status === 'available') return 'success'
  if (status === 'occupied') return 'danger'
  return 'warning'
}

const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"


export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addError, setAddError] = useState('')
  const [editTable, setEditTable] = useState<RestaurantTable | null>(null)
  const [qrModal, setQrModal] = useState<RestaurantTable | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ table_number: '', capacity: 4 })
  const [editForm, setEditForm] = useState<{ table_number: string; capacity: number; status: TableStatus }>({ table_number: '', capacity: 4, status: 'available' })
  const [detailTable, setDetailTable] = useState<RestaurantTable | null>(null)
  const [detailOrders, setDetailOrders] = useState<TableOrder[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const DEFAULT_CARD_IMAGE = 'https://images.unsplash.com/photo-1544025162-d76538d31203?w=400&q=80&auto=format&fit=crop'
  const [cardImage, setCardImage] = useState(DEFAULT_CARD_IMAGE)
  const [cardTemplate, setCardTemplate] = useState<QRTemplate>('classic')
  const [cardBgColor, setCardBgColor] = useState('')
  const [cardBgImage, setCardBgImage] = useState('')
  const [cardTextColor, setCardTextColor] = useState('')
  const [cardHeading, setCardHeading] = useState('')
  const [cardSubtext, setCardSubtext] = useState('')
  const [cardLabel, setCardLabel] = useState('')
  const [editingField, setEditingField] = useState<'heading' | 'subtext' | 'label' | null>(null)
  const [savingCard, setSavingCard] = useState(false)
  const [uploadingCardImg, setUploadingCardImg] = useState(false)
  const [uploadingBgImg, setUploadingBgImg] = useState(false)
  const [qrLib, setQrLib] = useState<typeof import('@/lib/qr-templates') | null>(null)

  const DEFAULT_TEXTS: Record<QRTemplate, { heading: string; subtext: string; label: string }> = {
    classic:   { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital'        },
    minimal:   { heading: 'MENU',      subtext: 'Scan to Order',    label: 'Digital'        },
    template3: { heading: 'SCAN HERE', subtext: 'To see our menu',  label: ''               },
    template4: { heading: 'MENU',      subtext: 'Scan to view our', label: ''               },
  }

  async function handleCardImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCardImg(true)
    try {
      const url = await uploadImage(file, 'qr-card')
      setCardImage(url)
    } finally {
      setUploadingCardImg(false)
    }
  }

  async function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBgImg(true)
    try {
      const url = await uploadImage(file, 'qr-bg')
      setCardBgImage(url)
      setCardBgColor('')
    } finally {
      setUploadingBgImg(false)
    }
  }

  async function saveCardSettings() {
    if (!qrModal) return
    setSavingCard(true)
    await fetch(`/api/tables/${qrModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_image: cardImage, card_template: cardTemplate, card_bg_color: cardBgColor || null, card_bg_image: cardBgImage || null, card_text_color: cardTextColor || null, card_heading: cardHeading || null, card_subtext: cardSubtext || null, card_label: cardLabel || null }),
    })
    fetchTables()
    setSavingCard(false)
  }
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyUrl(tableId: string) {
    navigator.clipboard.writeText(`${BASE_URL}/table/${tableId}`)
    setCopiedId(tableId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function fetchTables() {
    const res = await fetch('/api/tables')
    const data = res.ok ? await res.json() : []
    setTables(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchTables() }, [])

  async function openDetails(table: RestaurantTable) {
    setDetailTable(table)
    setDetailOrders([])
    setDetailLoading(true)
    const res = await fetch(`/api/sessions?table_id=${table.id}`)
    const data = res.ok ? await res.json() : {}
    if (data.session) {
      const ordersRes = await fetch(`/api/orders?session_id=${data.session.id}`)
      const orders = ordersRes.ok ? await ordersRes.json() : []
      setDetailOrders(Array.isArray(orders) ? orders : [])
    }
    setDetailLoading(false)
  }

  async function addTable() {
    setSaving(true)
    setAddError('')
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ table_number: '', capacity: 4 })
      fetchTables()
    } else {
      const data = await res.json().catch(() => ({}))
      setAddError(data.error || 'Could not add the table.')
    }
    setSaving(false)
  }

  async function saveEdit() {
    if (!editTable) return
    setSaving(true)
    const res = await fetch(`/api/tables/${editTable.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Could not save the table.')
    }
    setEditTable(null)
    fetchTables()
    setSaving(false)
  }

  async function deleteTable(id: string) {
    if (!confirm('Delete this table?')) return
    const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Could not delete the table.')
    }
    fetchTables()
  }

  async function showQR(table: RestaurantTable) {
    if (!qrLib) setQrLib(await import('@/lib/qr-templates'))
    setQrModal(table)
    setCardImage(table.card_image || DEFAULT_CARD_IMAGE)
    setCardTemplate((table.card_template as QRTemplate) || 'classic')
    setCardBgColor(table.card_bg_color || '')
    setCardBgImage(table.card_bg_image || '')
    setCardTextColor(table.card_text_color || '')
    setCardHeading(table.card_heading || '')
    setCardSubtext(table.card_subtext || '')
    setCardLabel(table.card_label || '')
    setEditingField(null)
    const url = `${BASE_URL}/table/${table.id}`
    const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#1f2937', light: '#ffffff' } })
    setQrDataUrl(dataUrl)
  }

  function downloadQR(table: RestaurantTable) {
    if (!qrLib) return
    const def = DEFAULT_TEXTS[cardTemplate]
    const html = qrLib.getCardHTML(cardTemplate, table.table_number, cardImage, qrDataUrl, cardBgColor || undefined, cardTextColor || undefined, cardBgImage || undefined, cardHeading || def.heading, cardSubtext || def.subtext, cardLabel || def.label)
    const win = window.open('', '_blank', 'width=400,height=640')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 300)
  }

  function openEdit(table: RestaurantTable) {
    setEditTable(table)
    setEditForm({ table_number: table.table_number, capacity: table.capacity, status: table.status })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage restaurant tables and generate QR codes</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="whitespace-nowrap shrink-0">
          <Plus className="w-4 h-4 mr-2 shrink-0" /> Add Table
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <div key={table.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Table {table.table_number}</h3>
                  <p className="text-sm text-gray-500">Capacity: {table.capacity} people</p>
                </div>
                <Badge variant={statusVariant(table.status) as 'success' | 'danger' | 'warning'}>
                  {STATUS_LABEL[table.status]}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mb-3">Added {formatDate(table.created_at)}</p>
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 mb-3">
                <p className="text-xs text-gray-400 truncate flex-1">/table/{table.id.slice(-8)}</p>
                <button onClick={() => copyUrl(table.id)}
                  className="shrink-0 text-gray-400 hover:text-orange-500 transition-colors">
                  {copiedId === table.id
                    ? <Check className="w-3.5 h-3.5 text-green-500" />
                    : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => showQR(table)} className="flex-1">
                  <QrCode className="w-3.5 h-3.5 mr-1.5" /> QR Code
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(table)} className="flex-1">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                {table.status === 'occupied' && (
                  <Button variant="ghost" size="sm" onClick={() => openDetails(table)} title="View Orders">
                    <ClipboardList className="w-4 h-4 text-blue-400" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => deleteTable(table.id)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Table">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number / Name</label>
            <input className={inputClass} placeholder="e.g. T6, Table A"
              value={form.table_number} onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (people)</label>
            <input type="number" min={1} className={inputClass} placeholder="e.g. 4"
              value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          </div>
          {addError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{addError}</div>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={addTable}>Add Table</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Table Modal — includes status + capacity */}
      <Modal isOpen={!!editTable} onClose={() => setEditTable(null)} title={`Edit — Table ${editTable?.table_number}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number / Name</label>
            <input className={inputClass} placeholder="e.g. T1"
              value={editForm.table_number} onChange={e => setEditForm(f => ({ ...f, table_number: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (people)</label>
            <input type="number" min={1} className={inputClass} placeholder="e.g. 4"
              value={editForm.capacity} onChange={e => setEditForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['available', 'occupied', 'reserved'] as TableStatus[]).map(s => (
                <button key={s} onClick={() => setEditForm(f => ({ ...f, status: s }))}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all capitalize
                    ${editForm.status === s
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-100 text-gray-500 hover:border-orange-200'}`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditTable(null)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={saveEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={!!qrModal}
        onClose={() => setQrModal(null)}
        title={`QR Code — Table ${qrModal?.table_number}`}
        size="lg"
        headerExtra={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" title="Card Background">
              <Palette className="w-5 h-5 text-gray-400" />
              <input type="color"
                value={cardBgColor || (qrLib?.TEMPLATES.find(x => x.id === cardTemplate)?.cardBg ?? '#ffffff')}
                onChange={e => { setCardBgColor(e.target.value); setCardBgImage('') }}
                className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5" />
              <label className={`cursor-pointer p-1 rounded border transition-colors ${uploadingBgImg ? 'opacity-50 cursor-wait' : ''} ${cardBgImage ? 'border-orange-400 text-orange-500' : 'border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-400'}`} title="Use image as background">
                <ImageIcon className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" disabled={uploadingBgImg} onChange={handleBgImageUpload} />
              </label>
              <button onClick={() => { setCardBgColor(''); setCardBgImage('') }} className="text-xs text-gray-400 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded border border-gray-200 hover:border-red-300">Reset</button>
            </div>
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
        <div className="flex gap-5" style={{ height: 580 }}>

          {/* Left: Template selector */}
          <div className="shrink-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Template</p>
            <div className="grid grid-cols-2 gap-2">
              {(qrLib?.TEMPLATES ?? []).map(t => (
                <button key={t.id} onClick={() => setCardTemplate(t.id)}
                  className={`w-24 rounded-xl border-2 py-4 flex flex-col items-center gap-2 transition-all cursor-pointer ${cardTemplate === t.id ? 'border-orange-400 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                  style={{ background: t.cardBg }}>
                  <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: t.accent, background: t.accent + '33' }} />
                  <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: t.accent }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: QR card + actions */}
          <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto">
            {(() => {
              const t = qrLib?.TEMPLATES.find(x => x.id === cardTemplate) ?? qrLib?.TEMPLATES[0]
              const activeBg = cardBgColor || t?.cardBg || '#ffffff'
              const activeBgStyle = cardBgImage
                ? { backgroundImage: `url(${cardBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: activeBg }
              const activeText = cardTextColor || t?.accent || '#111111'
              const def = DEFAULT_TEXTS[cardTemplate]
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
                <div className="w-full max-w-[500px] mx-auto rounded-xl overflow-hidden shadow-xl" style={{ ...activeBgStyle, minHeight: 420 }}>
                  <div className="py-2.5 px-5 text-center text-white text-xs font-extrabold tracking-[3px] uppercase" style={{ background: activeText }}>
                    Table {qrModal?.table_number}
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

              if (cardTemplate === 'template4') return (
                <div className="w-full max-w-[500px] mx-auto rounded-xl overflow-hidden shadow-xl flex flex-col items-center px-7 py-6 text-center" style={{ ...activeBgStyle, minHeight: 420 }}>
                  <div className="text-3xl leading-none mb-1" style={{ color: activeText }}>❧</div>
                  <hr className="w-full border-t-2 mb-4" style={{ borderColor: activeText }} />
                  <div className="bg-white p-3 rounded mb-4">
                    {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-40 h-40" />}  {/* eslint-disable-line @next/next/no-img-element */}
                  </div>
                  {editable('subtext', 'text-sm italic leading-tight block', { color: activeText })}
                  {editable('heading', 'text-4xl font-black tracking-widest leading-tight block', { fontFamily: 'Georgia, serif', color: activeText })}
                  <hr className="w-full border-t-2 mt-4 mb-2" style={{ borderColor: activeText }} />
                  <p className="text-[10px] uppercase tracking-widest opacity-70" style={{ color: activeText }}>Table {qrModal?.table_number}</p>
                </div>
              )

              const showImg = cardTemplate !== 'minimal'
              return (
                <div className="w-full max-w-[500px] mx-auto rounded-2xl overflow-hidden shadow-xl border border-gray-100" style={{ minHeight: 420 }}>
                  {showImg && (
                    <div className="h-44 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cardImage} alt="food" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`px-6 pb-5 text-center flex flex-col items-center justify-center ${showImg ? 'pt-6' : 'pt-0 h-[420px]'}`} style={activeBgStyle}>
                    {qrDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="QR" className="w-44 h-44 mx-auto mb-4" />
                    )}
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <span className="text-xl font-black italic" style={{ color: activeText }}>Table {qrModal?.table_number}</span>
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

            {cardTemplate !== 'minimal' && cardTemplate !== 'template4' && (
              <label className={`w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-xl py-2 text-sm transition-colors ${uploadingCardImg ? 'text-gray-300 cursor-wait' : 'text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer'}`}>
                <Plus className="w-4 h-4" /> {uploadingCardImg ? 'Uploading...' : 'Change Food Image'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingCardImg} onChange={handleCardImageUpload} />
              </label>
            )}

            <div className="w-full flex gap-2">
              <Button className="flex-1" loading={savingCard} onClick={saveCardSettings}>Save</Button>
              <Button variant="outline" className="flex-1" onClick={() => qrModal && downloadQR(qrModal)}>
                <Download className="w-4 h-4 mr-1.5" /> Print
              </Button>
            </div>
          </div>

        </div>
      </Modal>

      {/* Orders Detail Modal */}
      <Modal isOpen={!!detailTable} onClose={() => setDetailTable(null)}
        title={`Orders — Table ${detailTable?.table_number}`}>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {detailLoading ? (
            <p className="text-gray-400 text-sm text-center py-6">Loading...</p>
          ) : detailOrders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No active orders for this table</p>
          ) : detailOrders.map((order, i) => (
            <div key={order.id} className={`bg-gray-50 rounded-xl p-4 ${order.status === 'cancelled' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                    {order.customer_name?.[0]?.toUpperCase() || (i + 1)}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{order.customer_name || `Order ${i + 1}`}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                  order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                  order.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                  'bg-blue-100 text-blue-700'}`}>
                  {order.status}
                </span>
              </div>
              <div className="space-y-1">
                {order.items?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.menu_item?.name}{item.quantity > 1 && <span className="font-semibold text-orange-500"> ×{item.quantity}</span>}</span>
                    <span className="text-gray-500">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-bold">
                <span className="text-gray-700">Order Total</span>
                <span className="text-orange-600">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>
        {detailOrders.filter(o => o.status !== 'cancelled').length > 0 && (
          <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Grand Total</span>
            <span className="text-xl font-bold text-orange-600">
              {formatCurrency(detailOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0))}
            </span>
          </div>
        )}
      </Modal>
    </div>
  )
}
