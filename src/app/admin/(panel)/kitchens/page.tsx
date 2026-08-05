'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MenuItem, MenuCategory, KitchenStation } from '@/types'
import { Button } from '@/components/ui/Button'
import { Toast, useToast } from '@/components/ui/Toast'
import { Trash2, ChefHat } from 'lucide-react'

const STATION_SUGGESTIONS = ['South Kitchen', 'North Kitchen', 'Chinese', 'Tandoor', 'Beverages', 'Desserts']

export default function KitchensPage() {
  const [stations, setStations] = useState<KitchenStation[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [stationName, setStationName] = useState('')
  const [stationError, setStationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast, showToast, dismissToast } = useToast()

  async function fetchData() {
    const [stationRes, catRes, itemRes] = await Promise.all([
      fetch('/api/stations'),
      fetch('/api/menu-categories'),
      fetch('/api/menu-items'),
    ])
    const stationList = stationRes.ok ? await stationRes.json() : []
    const cats = catRes.ok ? await catRes.json() : []
    const menuItems = itemRes.ok ? await itemRes.json() : []
    setStations(Array.isArray(stationList) ? stationList : [])
    setCategories(Array.isArray(cats) ? cats : [])
    setItems((Array.isArray(menuItems) ? menuItems : []).filter((i: MenuItem) => !i.is_archived))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [])

  async function addStation() {
    if (!stationName.trim()) return
    setSaving(true)
    setStationError('')
    const res = await fetch('/api/stations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: stationName.trim(), display_order: stations.length }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStationError(data.error || 'Could not create kitchen.')
    } else {
      showToast(`Kitchen "${stationName.trim()}" created!`)
      setStationName('')
      fetchData()
    }
    setSaving(false)
  }

  async function deleteStation(id: string, name: string) {
    if (!confirm(`Delete kitchen "${name}"? Its items will fall back to Main Kitchen.`)) return
    const res = await fetch(`/api/stations/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || 'Could not delete kitchen.')
    } else {
      showToast(`Kitchen "${name}" deleted.`)
      fetchData()
    }
  }

  const existing = new Set(stations.map(s => s.name.toLowerCase()))
  const presets = STATION_SUGGESTIONS.filter(s => !existing.has(s.toLowerCase()))

  return (
    <div className="max-w-2xl">
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kitchens</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Where food is prepared — each kitchen gets its own KOT slip when an order is accepted
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6">
        <p className="text-sm text-blue-800">
          Assign a default kitchen to each <Link href="/admin/categories" className="font-semibold underline">category</Link>,
          and override per item from the item form when needed. Items with no kitchen go to{' '}
          <span className="font-semibold">Main Kitchen</span>. No kitchens at all? Everything prints as one slip, like before.
        </p>
      </div>

      {/* Existing kitchens */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Your kitchens</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : stations.length === 0 ? (
          <div className="text-center py-8">
            <ChefHat className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No kitchens yet — everything prints as one slip (Main Kitchen).</p>
            <p className="text-gray-300 text-xs mt-1">Add one below to split KOTs per kitchen.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {stations.map(s => {
              const catCount = categories.filter(c => c.default_station_id === s.id).length
              const itemCount = items.filter(i => i.station_id === s.id).length
              return (
                <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-medium text-gray-800 flex items-center gap-2 min-w-0">
                    <ChefHat className="w-4 h-4 text-orange-400 shrink-0" /> <span className="truncate">{s.name}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {catCount > 0 && `${catCount} categor${catCount === 1 ? 'y' : 'ies'}`}
                      {catCount > 0 && itemCount > 0 && ' · '}
                      {itemCount > 0 && `${itemCount} item override${itemCount === 1 ? '' : 's'}`}
                    </span>
                  </span>
                  <button onClick={() => deleteStation(s.id, s.name)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add new */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Add a kitchen</p>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {presets.map(s => (
              <button key={s} type="button" onClick={() => setStationName(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${stationName === s ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'}`}>
                + {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
            value={stationName}
            onChange={e => setStationName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStation()}
            placeholder="Pick a chip or type a custom name"
            maxLength={100}
          />
          <Button loading={saving} onClick={addStation} disabled={!stationName.trim()}>Add</Button>
        </div>
        {stationError && <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2">{stationError}</div>}
      </div>
    </div>
  )
}
