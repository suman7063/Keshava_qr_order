'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MenuItem, MenuCategory, KitchenStation } from '@/types'
import { Button } from '@/components/ui/Button'
import { Toast, useToast } from '@/components/ui/Toast'
import { Trash2, Tags } from 'lucide-react'
import { CATEGORY_SUGGESTIONS } from '@/lib/categories'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [stations, setStations] = useState<KitchenStation[]>([])
  const [catName, setCatName] = useState('')
  const [catError, setCatError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast, showToast, dismissToast } = useToast()

  async function fetchData() {
    const [catRes, itemRes, stationRes] = await Promise.all([
      fetch('/api/menu-categories'),
      fetch('/api/menu-items'),
      fetch('/api/stations'),
    ])
    const cats = catRes.ok ? await catRes.json() : []
    const menuItems = itemRes.ok ? await itemRes.json() : []
    const stationList = stationRes.ok ? await stationRes.json() : []
    setCategories(Array.isArray(cats) ? cats : [])
    setItems((Array.isArray(menuItems) ? menuItems : []).filter((i: MenuItem) => !i.is_archived))
    setStations(Array.isArray(stationList) ? stationList : [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [])

  async function addCategory() {
    if (!catName.trim()) return
    setSaving(true)
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
      fetchData()
    }
    setSaving(false)
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return
    const res = await fetch(`/api/menu-categories/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || 'Could not delete category.')
    } else {
      showToast(`Category "${name}" deleted.`)
      fetchData()
    }
  }

  async function setCategoryStation(catId: string, stationId: string) {
    const res = await fetch(`/api/menu-categories/${catId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_station_id: stationId || null }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || 'Could not set the kitchen.')
    }
    fetchData()
  }

  const existing = new Set(categories.map(c => c.name.toLowerCase()))
  const presets = CATEGORY_SUGGESTIONS.filter(s => !existing.has(s.toLowerCase()))

  return (
    <div className="max-w-2xl">
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          How your menu is organised for customers — items live inside categories
        </p>
      </div>

      {/* Existing categories */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Your categories</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : categories.length === 0 ? (
          <div className="text-center py-8">
            <Tags className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No categories yet. Add one below.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {categories.map(cat => {
              const count = items.filter(i => i.category_id === cat.id).length
              return (
                <div key={cat.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-medium text-gray-800 min-w-0 truncate">{cat.name}
                    <span className="text-xs text-gray-400 ml-2">{count} item{count === 1 ? '' : 's'}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {stations.length > 0 && (
                      <select value={cat.default_station_id || ''}
                        onChange={e => setCategoryStation(cat.id, e.target.value)}
                        title="Default kitchen for this category's items"
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 max-w-36">
                        <option value="">Main Kitchen</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    )}
                    <button onClick={() => deleteCategory(cat.id, cat.name)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {stations.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            The kitchen dropdown sets where a category&apos;s items are prepared by default —
            individual items can override it. Manage kitchens on the{' '}
            <Link href="/admin/kitchens" className="text-orange-500 hover:underline">Kitchens</Link> page.
          </p>
        )}
      </div>

      {/* Add new */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Add a category</p>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {presets.map(s => (
              <button key={s} type="button" onClick={() => setCatName(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${catName === s ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'}`}>
                + {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="Pick a chip or type a custom name"
            maxLength={100}
          />
          <Button loading={saving} onClick={addCategory} disabled={!catName.trim()}>Add</Button>
        </div>
        {catError && <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2">{catError}</div>}
      </div>
    </div>
  )
}
