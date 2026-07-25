'use client'

import { useEffect, useState, useCallback } from 'react'
import { Store, CheckCircle2, XCircle, TrendingUp, Search, ExternalLink, Trash2, Loader2, RefreshCw } from 'lucide-react'

interface Restaurant {
  id: string
  name: string
  subdomain: string
  plan: string
  status: string
  owner_email: string | null
  phone: string | null
  created_at: string
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-600',
  pending: 'bg-yellow-100 text-yellow-700',
}

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/restaurants')
    const data = await res.json()
    setRestaurants(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRestaurants() }, [fetchRestaurants])

  async function toggleStatus(r: Restaurant) {
    setUpdating(r.id)
    const newStatus = r.status === 'active' ? 'inactive' : 'active'
    const res = await fetch(`/api/restaurants/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, status: newStatus } : x))
    } else {
      alert('Could not update status.')
    }
    setUpdating(null)
  }

  async function changePlan(r: Restaurant, plan: string) {
    setUpdating(r.id)
    const res = await fetch(`/api/restaurants/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    if (res.ok) {
      setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, plan } : x))
    } else {
      alert('Could not change plan.')
    }
    setUpdating(null)
  }

  async function deleteRestaurant(id: string) {
    setUpdating(id)
    const res = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRestaurants(prev => prev.filter(x => x.id !== id))
    } else {
      alert('Could not delete restaurant.')
    }
    setConfirmDelete(null)
    setUpdating(null)
  }

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.subdomain.toLowerCase().includes(search.toLowerCase()) ||
    (r.owner_email || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: restaurants.length,
    active: restaurants.filter(r => r.status === 'active').length,
    pro: restaurants.filter(r => r.plan === 'pro').length,
    thisMonth: restaurants.filter(r => {
      const d = new Date(r.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all onboarded restaurants</p>
        </div>
        <button onClick={fetchRestaurants}
          className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Store, color: 'text-blue-800', bg: 'bg-blue-50' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Pro Plan', value: stats.pro, icon: TrendingUp, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'This Month', value: stats.thisMonth, icon: TrendingUp, color: 'text-orange-700', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, subdomain, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {search ? 'No restaurants match your search.' : 'No restaurants yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subdomain</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      {r.owner_email && <div className="text-xs text-gray-400 mt-0.5">{r.owner_email}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <a
                        href={`/${r.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-700 hover:text-blue-900 font-mono text-xs"
                      >
                        bicres.com/{r.subdomain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={r.plan}
                        disabled={updating === r.id}
                        onChange={e => changePlan(r, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800 ${PLAN_COLORS[r.plan] || 'bg-gray-100 text-gray-600'}`}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleStatus(r)}
                        disabled={updating === r.id}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-75 disabled:opacity-50 ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {updating === r.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : r.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {r.status}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {confirmDelete === r.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600">Sure?</span>
                          <button
                            onClick={() => deleteRestaurant(r.id)}
                            disabled={updating === r.id}
                            className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(r.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
