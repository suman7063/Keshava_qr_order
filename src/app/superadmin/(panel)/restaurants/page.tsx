'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Search, ExternalLink, Trash2, Loader2, RefreshCw, Ban } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SaRestaurant, SaStats, SaBilling } from '@/lib/superadmin'

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-600',
  suspended: 'bg-amber-100 text-amber-700',
}

function BillingBadge({ b }: { b?: SaBilling }) {
  const base = 'inline-block text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap'
  if (!b || b.status === 'free') return <span className="text-xs text-gray-400">—</span>
  if (b.status === 'paying') return <span className={`${base} bg-green-100 text-green-700`}>Paying</span>
  if (b.status === 'trial') return <span className={`${base} bg-blue-100 text-blue-700`}>Trial · {b.trialDaysLeft}d</span>
  return <span className={`${base} bg-amber-100 text-amber-700`}>Comp</span>
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<SaRestaurant[]>([])
  const [stats, setStats] = useState<SaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [rRes, sRes] = await Promise.all([
      fetch('/api/restaurants'),
      fetch('/api/superadmin/stats'),
    ])
    const data = rRes.ok ? await rRes.json() : []
    setRestaurants(Array.isArray(data) ? data : [])
    setStats(sRes.ok ? await sRes.json() : null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleStatus(r: SaRestaurant) {
    setUpdating(r.id)
    const newStatus = r.status === 'active' ? 'inactive' : 'active'
    const res = await fetch(`/api/restaurants/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, status: newStatus } : x))
    else alert('Could not update status.')
    setUpdating(null)
  }

  async function suspendRestaurant(r: SaRestaurant) {
    const reason = window.prompt(`Suspend "${r.name}"? Enter a reason (internal):`)
    if (reason === null) return
    setUpdating(r.id)
    const res = await fetch(`/api/restaurants/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended', suspended_reason: reason }),
    })
    if (res.ok) setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, status: 'suspended' } : x))
    else alert('Could not suspend restaurant.')
    setUpdating(null)
  }

  async function changePlan(r: SaRestaurant, plan: string) {
    setUpdating(r.id)
    const res = await fetch(`/api/restaurants/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    if (res.ok) setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, plan } : x))
    else alert('Could not change plan.')
    setUpdating(null)
  }

  async function deleteRestaurant(id: string) {
    setUpdating(id)
    const res = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' })
    if (res.ok) setRestaurants(prev => prev.filter(x => x.id !== id))
    else alert('Could not delete restaurant.')
    setConfirmDelete(null)
    setUpdating(null)
  }

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.subdomain.toLowerCase().includes(search.toLowerCase()) ||
    (r.owner_email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all onboarded restaurants</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search name, subdomain, email…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">{search ? 'No restaurants match your search.' : 'No restaurants yet.'}</div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto scrollbar-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Restaurant', 'Link', 'Plan', 'Billing', 'Activity', 'Status', 'Joined'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const act = stats?.activity?.[r.id]
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 whitespace-nowrap">{r.name}</span>
                          {act?.orders === 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase shrink-0">Dormant</span>}
                        </div>
                        {r.owner_email && <div className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{r.owner_email}</div>}
                        {r.phone && <div className="text-xs text-gray-400 whitespace-nowrap">📞 {r.phone}</div>}
                      </td>
                      <td className="px-3 py-4">
                        <a href={`/${r.subdomain}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-700 hover:text-blue-900 font-mono text-xs whitespace-nowrap">
                          /{r.subdomain}<ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 py-4">
                        <select value={r.plan} disabled={updating === r.id} onChange={e => changePlan(r, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800 ${PLAN_COLORS[r.plan] || 'bg-gray-100 text-gray-600'}`}>
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap"><BillingBadge b={stats?.billing?.[r.id]} /></td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{act?.orders ?? 0} orders · {formatCurrency(act?.gmv ?? 0)}</div>
                        <div className="text-xs text-gray-400">
                          {act?.tables ?? 0} tables · {act?.lastActive ? formatDate(act.lastActive) : 'never active'}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <button onClick={() => toggleStatus(r)} disabled={updating === r.id}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-75 disabled:opacity-50 whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {updating === r.id ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : r.status === 'active' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                          <span className="capitalize">{r.status}</span>
                        </button>
                      </td>
                      <td className="px-3 py-4 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-3 py-4 text-right">
                        {confirmDelete === r.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-red-600">Sure?</span>
                            <button onClick={() => deleteRestaurant(r.id)} disabled={updating === r.id}
                              className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50">Delete</button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {r.status !== 'suspended' && (
                              <button onClick={() => suspendRestaurant(r)} disabled={updating === r.id} title="Suspend with reason"
                                className="p-1.5 text-gray-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setConfirmDelete(r.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(r => {
              const act = stats?.activity?.[r.id]
              return (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">{r.name}</span>
                        {act?.orders === 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase shrink-0">Dormant</span>}
                      </div>
                      {r.owner_email && <div className="text-xs text-gray-400 truncate">{r.owner_email}</div>}
                      {r.phone && <div className="text-xs text-gray-400">📞 {r.phone}</div>}
                    </div>
                    <button onClick={() => toggleStatus(r)} disabled={updating === r.id}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {updating === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : r.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span className="capitalize">{r.status}</span>
                    </button>
                  </div>

                  <a href={`/${r.subdomain}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 font-mono text-xs">
                    bicres.com/{r.subdomain}<ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={r.plan} disabled={updating === r.id} onChange={e => changePlan(r, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800 ${PLAN_COLORS[r.plan] || 'bg-gray-100 text-gray-600'}`}>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <BillingBadge b={stats?.billing?.[r.id]} />
                  </div>

                  <div className="text-xs text-gray-500">
                    {act?.orders ?? 0} orders · {act?.tables ?? 0} tables · {formatCurrency(act?.gmv ?? 0)}
                    {' · '}{act?.lastActive ? `last ${formatDate(act.lastActive)}` : 'never active'}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">
                      Joined {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                    {confirmDelete === r.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">Sure?</span>
                        <button onClick={() => deleteRestaurant(r.id)} disabled={updating === r.id}
                          className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {r.status !== 'suspended' && (
                          <button onClick={() => suspendRestaurant(r)} disabled={updating === r.id} title="Suspend"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setConfirmDelete(r.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>
    </div>
  )
}
