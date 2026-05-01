'use client'

import { useEffect, useState } from 'react'
import { MenuItem, MenuCategory } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, Leaf } from 'lucide-react'

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '',
    is_vegetarian: false, is_vegan: false, is_available: true, prep_time_minutes: '',
  })

  async function fetchData() {
    const [catRes, itemRes] = await Promise.all([
      fetch('/api/menu-categories'),
      fetch('/api/menu-items'),
    ])
    const cats = await catRes.json()
    const menuItems = await itemRes.json()
    setCategories(cats)
    setItems(menuItems)
    if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id)
  }

  useEffect(() => { fetchData() }, [])

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', description: '', price: '', category_id: activeCategory || '', is_vegetarian: false, is_vegan: false, is_available: true, prep_time_minutes: '' })
    setShowModal(true)
  }

  function openEdit(item: MenuItem) {
    setEditItem(item)
    setForm({
      name: item.name, description: item.description || '', price: String(item.price),
      category_id: item.category_id, is_vegetarian: item.is_vegetarian, is_vegan: item.is_vegan,
      is_available: item.is_available, prep_time_minutes: String(item.prep_time_minutes || ''),
    })
    setShowModal(true)
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...form,
      price: parseFloat(form.price),
      prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null,
    }
    if (editItem) {
      await fetch(`/api/menu-items/${editItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/menu-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setShowModal(false)
    fetchData()
    setSaving(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this menu item?')) return
    await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
    fetchData()
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`/api/menu-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !item.is_available }),
    })
    fetchData()
  }

  const filteredItems = activeCategory ? items.filter(i => i.category_id === activeCategory) : items

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage menu items and categories</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!activeCategory ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          All ({items.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {cat.name} ({items.filter(i => i.category_id === cat.id).length})
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Item</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Category</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Price</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Status</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.is_vegetarian && <Leaf className="w-3.5 h-3.5 text-green-500" />}
                  </div>
                  {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{item.category?.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-orange-600">{formatCurrency(item.price)}</span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleAvailable(item)}>
                    <Badge variant={item.is_available ? 'success' : 'secondary'}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </button>
                </td>
                <td className="px-6 py-4">
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
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-400">No items in this category</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Item' : 'Add Menu Item'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-500"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Item name"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-500"
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-500"
              value={form.prep_time_minutes}
              onChange={e => setForm(f => ({ ...f, prep_time_minutes: e.target.value }))}
              placeholder="e.g. 15"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-500"
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
    </div>
  )
}
