'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { SaAuditEntry } from '@/lib/superadmin'

const ACTION_COLORS: Record<string, string> = {
  'restaurant.created': 'bg-green-100 text-green-700',
  'restaurant.deleted': 'bg-red-100 text-red-700',
  'manager.created': 'bg-blue-100 text-blue-700',
  'manager.deleted': 'bg-red-100 text-red-700',
}

export default function ActivityPage() {
  const [audit, setAudit] = useState<SaAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/superadmin/audit')
    const data = res.ok ? await res.json() : []
    setAudit(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-gray-500 text-sm mt-0.5">Recent platform actions — who did what</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : audit.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No activity logged yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {audit.map(a => (
              <div key={a.id} className="px-5 py-3.5 flex items-center gap-3 text-sm">
                <span className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${ACTION_COLORS[a.action] || 'bg-gray-100 text-gray-600'}`}>{a.action}</span>
                <span className="text-gray-700 flex-1 truncate">
                  {a.restaurant?.name || a.entity || '—'}
                  {a.details?.email ? ` · ${String(a.details.email)}` : ''}
                  {a.details?.plan ? ` · ${String(a.details.plan)}` : ''}
                  {a.details?.subdomain ? ` · ${String(a.details.subdomain)}` : ''}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
