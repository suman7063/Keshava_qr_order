'use client'

import { useEffect, useState } from 'react'
import { MenuItem, MenuCategory } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, Leaf, Download } from 'lucide-react'
import { uploadImage, deleteImage } from '@/lib/uploadImage'
import { Toast, useToast } from '@/components/ui/Toast'

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [showMenuImages, setShowMenuImages] = useState(true)
  const { toast, showToast, dismissToast } = useToast()
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfLib, setPdfLib] = useState<typeof import('@/lib/pdf-templates') | null>(null)
  const [pdfTemplateId, setPdfTemplateId] = useState('pdf1')
  const [pdfBgColor, setPdfBgColor] = useState('')
  const [pdfTextColor, setPdfTextColor] = useState('')
  const [pdfSubTextColor, setPdfSubTextColor] = useState('')
  const [pdfHeroImage, setPdfHeroImage] = useState('')
  const [restaurantName, setRestaurantName] = useState('Our Restaurant')
  const [showCatModal, setShowCatModal] = useState(false)
  const [catName, setCatName] = useState('')
  const [catError, setCatError] = useState('')
  const [savingCat, setSavingCat] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '',
    is_vegetarian: false, is_vegan: false, is_available: true, prep_time_minutes: '',
    image_url: '',
  })

  const [uploadingImg, setUploadingImg] = useState(false)

  async function handleItemImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
    try {
      const url = await uploadImage(file, 'menu-items')
      setForm(f => ({ ...f, image_url: url }))
    } finally {
      setUploadingImg(false)
    }
  }

  async function removeItemImage() {
    await deleteImage(form.image_url)
    setForm(f => ({ ...f, image_url: '' }))
  }

  async function fetchData() {
    try {
      const [catRes, itemRes, settingsRes, restRes] = await Promise.all([
        fetch('/api/menu-categories'),
        fetch('/api/menu-items'),
        fetch('/api/settings'),
        fetch('/api/restaurants/current'),
      ])
      const cats = catRes.ok ? await catRes.json() : []
      const menuItems = itemRes.ok ? await itemRes.json() : []
      const settings = settingsRes.ok ? await settingsRes.json() : {}
      const restaurant = restRes.ok ? await restRes.json() : null
      setCategories(Array.isArray(cats) ? cats : [])
      setItems(Array.isArray(menuItems) ? menuItems : [])
      setShowMenuImages(settings.show_menu_images ?? true)
      if (restaurant?.name) setRestaurantName(restaurant.name)
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id)
    } catch {
      showToast('Could not load menu data. Please refresh.')
    }
  }

  async function toggleMenuImages(val: boolean) {
    setShowMenuImages(val)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_menu_images: val }),
    })
    if (!res.ok) {
      setShowMenuImages(!val)
      showToast('Could not save the setting.')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [])

  async function addCategory() {
    if (!catName.trim()) return
    setSavingCat(true)
    setCatError('')
    const res = await fetch('/api/menu-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName.trim(), display_order: categories.length }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCatError(data.error || 'Could not create category.')
    } else {
      showToast(`Category "${catName.trim()}" created!`)
      setCatName('')
      setShowCatModal(false)
      fetchData()
    }
    setSavingCat(false)
  }

  function exportCSV() {
    const header = 'Name,Description,Price,Category,Vegetarian,Vegan,Available,Prep Time (min)'
    const rows = items.map(item => [
      `"${item.name}"`,
      `"${item.description || ''}"`,
      item.price,
      `"${item.category?.name || ''}"`,
      item.is_vegetarian,
      item.is_vegan,
      item.is_available,
      item.prep_time_minutes || '',
    ].join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `menu-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${items.length} items exported as CSV!`)
  }

  async function openPdfModal() {
    if (!pdfLib) setPdfLib(await import('@/lib/pdf-templates'))
    setShowPdfModal(true)
  }

  function exportPDF() {
    if (!pdfLib) return
    const html = pdfLib.getPdfHTML(pdfTemplateId, categories, items, restaurantName, {
      bgColor: pdfBgColor || undefined,
      textColor: pdfTextColor || undefined,
      subTextColor: pdfSubTextColor || undefined,
      heroImage: pdfHeroImage || undefined,
    })
    const win = window.open('', '_blank', 'width=820,height=1000')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
    setShowPdfModal(false)
    showToast('Menu exported as PDF!')
  }

  function handlePdfHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPdfHeroImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', description: '', price: '', category_id: activeCategory || '', is_vegetarian: false, is_vegan: false, is_available: true, prep_time_minutes: '', image_url: '' })
    setShowModal(true)
  }

  function openEdit(item: MenuItem) {
    setEditItem(item)
    setForm({
      name: item.name, description: item.description || '', price: String(item.price),
      category_id: item.category_id, is_vegetarian: item.is_vegetarian, is_vegan: item.is_vegan,
      is_available: item.is_available, prep_time_minutes: String(item.prep_time_minutes || ''),
      image_url: item.image_url || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.name.trim() || !form.category_id || !form.price) {
      showToast('Name, category and price are required.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      price: parseFloat(form.price),
      prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null,
    }
    const res = editItem
      ? await fetch(`/api/menu-items/${editItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/menu-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || 'Could not save the item.')
    } else {
      setShowModal(false)
      fetchData()
    }
    setSaving(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this menu item?')) return
    const res = await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || 'Could not delete the item.')
    }
    fetchData()
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/menu-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !item.is_available }),
    })
    if (!res.ok) showToast('Could not update availability.')
    fetchData()
  }

  const filteredItems = activeCategory ? items.filter(i => i.category_id === activeCategory) : items

  return (
    <div>
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage menu items and categories</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Export buttons */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-500 transition-colors border-r border-gray-200">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={openPdfModal}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-500 transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
          {/* Customer view toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => toggleMenuImages(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showMenuImages ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>
              <span>🖼</span> With Image
            </button>
            <button
              onClick={() => toggleMenuImages(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!showMenuImages ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>
              <span>☰</span> Without Image
            </button>
          </div>
          <Button onClick={openAdd} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2 shrink-0" /> Add Item
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveCategory(null)}
          className={`whitespace-nowrap shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${!activeCategory ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          All ({items.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {cat.name} ({items.filter(i => i.category_id === cat.id).length})
          </button>
        ))}
        <button
          onClick={() => { setShowCatModal(true); setCatError('') }}
          className="whitespace-nowrap shrink-0 px-4 py-2 rounded-full text-sm font-medium text-orange-500 border border-dashed border-orange-300 hover:bg-orange-50 transition-colors"
        >
          + Category
        </button>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 whitespace-nowrap">Item</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 whitespace-nowrap">Category</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 whitespace-nowrap">Price</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 whitespace-nowrap">Status</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {showMenuImages && (
                      item.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100" />
                        : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-base">🍽</div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900 whitespace-nowrap">{item.name}</p>
                        {item.is_vegetarian && <Leaf className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                      </div>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[140px]">{item.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{item.category?.name}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold text-orange-600">{formatCurrency(item.price)}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => toggleAvailable(item)}>
                    <Badge variant={item.is_available ? 'success' : 'secondary'}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-400">No items in this category</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Item' : 'Add Menu Item'} size="lg">
        <div className="grid grid-cols-2 gap-4">

          {/* Image upload — only when With Image mode is on */}
          {showMenuImages && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Image</label>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <span className="text-2xl">🍽</span>
                  </div>
                )}
                <label className={`flex-1 flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-xl py-2.5 text-sm transition-colors ${uploadingImg ? 'text-gray-300 cursor-wait' : 'text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer'}`}>
                  <Plus className="w-4 h-4" /> {uploadingImg ? 'Uploading...' : form.image_url ? 'Change Image' : 'Upload Image'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingImg} onChange={handleItemImageUpload} />
                </label>
                {form.image_url && (
                  <button onClick={removeItemImage} className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded border border-gray-200">Remove</button>
                )}
              </div>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Item name"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none text-gray-900 placeholder:text-gray-400"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Short description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
              value={form.prep_time_minutes}
              onChange={e => setForm(f => ({ ...f, prep_time_minutes: e.target.value }))}
              placeholder="e.g. 15"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_vegetarian} onChange={e => setForm(f => ({ ...f, is_vegetarian: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-700">Vegetarian</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_vegan} onChange={e => setForm(f => ({ ...f, is_vegan: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-700">Vegan</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-700">Available</span>
            </label>
          </div>
          <div className="col-span-2 flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={save}>{editItem ? 'Save Changes' : 'Add Item'}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Add Category">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category name *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              placeholder="e.g. Starters"
              maxLength={100}
            />
          </div>
          {catError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{catError}</div>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCatModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={savingCat} onClick={addCategory}>Add Category</Button>
          </div>
        </div>
      </Modal>

      {/* PDF Template Picker Modal */}
      <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title="Choose PDF Template" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(pdfLib?.PDF_TEMPLATES ?? []).map(t => {
              const isSelected = pdfTemplateId === t.id
              const previewHtml = pdfLib!.getPdfHTML(
                t.id,
                categories.slice(0, 3),
                items.slice(0, 6),
                restaurantName,
                isSelected ? {
                  bgColor: pdfBgColor || undefined,
                  textColor: pdfTextColor || undefined,
                  subTextColor: pdfSubTextColor || undefined,
                  heroImage: pdfHeroImage || undefined,
                } : {}
              )
              return (
                <button key={t.id} onClick={() => setPdfTemplateId(t.id)}
                  className={`rounded-2xl border-2 flex flex-col items-center gap-2 pb-3 overflow-hidden transition-all cursor-pointer ${isSelected ? 'border-orange-400 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                  {/* Actual scaled preview */}
                  <div className="w-full overflow-hidden rounded-t-xl" style={{ height: 200, position: 'relative' }}>
                    <iframe
                      srcDoc={previewHtml}
                      style={{
                        overflow: 'hidden',
                        width: 794,
                        height: 1000,
                        border: 'none',
                        transform: 'scale(0.245)',
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 px-2">{t.label}</span>
                </button>
              )
            })}
          </div>
          {/* Customization */}
          <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customize</p>
            <div className="flex items-center gap-6 flex-wrap">
              {/* BG color */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Background</span>
                <input type="color"
                  value={pdfBgColor || '#ffffff'}
                  onChange={e => setPdfBgColor(e.target.value)}
                  className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5" />
                {pdfBgColor && <button onClick={() => setPdfBgColor('')} className="text-[10px] text-gray-400 hover:text-red-400">Reset</button>}
              </div>
              {/* Heading color */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Heading</span>
                <input type="color"
                  value={pdfTextColor || '#f59e0b'}
                  onChange={e => setPdfTextColor(e.target.value)}
                  className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5" />
                {pdfTextColor && <button onClick={() => setPdfTextColor('')} className="text-[10px] text-gray-400 hover:text-red-400">Reset</button>}
              </div>
              {/* Subheading / body text color */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Subheading</span>
                <input type="color"
                  value={pdfSubTextColor || '#444444'}
                  onChange={e => setPdfSubTextColor(e.target.value)}
                  className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5" />
                {pdfSubTextColor && <button onClick={() => setPdfSubTextColor('')} className="text-[10px] text-gray-400 hover:text-red-400">Reset</button>}
              </div>
              {/* Hero image — only for templates with image */}
              {pdfLib?.PDF_TEMPLATES.find(t => t.id === pdfTemplateId)?.hasImage && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Hero Image</span>
                  {pdfHeroImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pdfHeroImage} alt="hero" className="w-7 h-7 rounded object-cover border border-gray-200" />
                  )}
                  <label className="text-xs text-orange-500 hover:text-orange-600 cursor-pointer font-medium">
                    {pdfHeroImage ? 'Change' : '+ Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePdfHeroUpload} />
                  </label>
                  {pdfHeroImage && <button onClick={() => setPdfHeroImage('')} className="text-[10px] text-gray-400 hover:text-red-400">Remove</button>}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowPdfModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={exportPDF} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
