'use client'

import { useEffect, useState } from 'react'
import { IndianRupee, CreditCard, Clock, AlertTriangle, Store, CheckCircle2, ShoppingBag, TrendingUp, Loader2, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { SaStats } from '@/lib/superadmin'

export default function OverviewPage() {
  const [stats, setStats] = useState<SaStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/superadmin/stats')
    setStats(res.ok ? await res.json() : null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const revenueCards = [
    { label: 'MRR (monthly)', value: stats ? formatCurrency(stats.mrr) : '—', icon: IndianRupee, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Paying', value: stats?.paying ?? '—', icon: CreditCard, color: 'text-blue-800', bg: 'bg-blue-50' },
    { label: 'On Trial', value: stats?.onTrial ?? '—', icon: Clock, color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'Trials ending ≤3d', value: stats?.trialsEndingSoon ?? '—', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ]
  const platformCards = [
    { label: 'Total restaurants', value: stats?.total ?? '—', icon: Store },
    { label: 'Active', value: stats?.active ?? '—', icon: CheckCircle2 },
    { label: 'Total orders', value: stats?.totalOrders ?? '—', icon: ShoppingBag },
    { label: 'GMV (all orders)', value: stats ? formatCurrency(stats.gmv) : '—', icon: TrendingUp },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Platform revenue and growth at a glance</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {revenueCards.map(s => (
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

      {/* Platform totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {platformCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <s.icon className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <div className="text-lg font-bold text-gray-900">{s.value || '—'}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Signups chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">New restaurants — last 6 months</h2>
          {stats && <span className="text-xs text-gray-400">Comp: {stats.comped} · Churned: {stats.churned}</span>}
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-28 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : stats ? (
          <div className="flex items-end gap-3 h-28">
            {stats.signups.map(m => {
              const max = Math.max(1, ...stats.signups.map(x => x.count))
              const h = Math.round((m.count / max) * 100)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">{m.count}</span>
                  <div className="w-full bg-blue-500/80 rounded-t-lg" style={{ height: `${Math.max(h, 4)}%` }} />
                  <span className="text-xs text-gray-400">{m.label}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Could not load stats.</p>
        )}
      </div>
    </div>
  )
}
