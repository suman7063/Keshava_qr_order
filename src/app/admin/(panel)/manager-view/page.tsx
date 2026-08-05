'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, ChevronRight, MonitorSmartphone } from 'lucide-react'

interface Manager {
  user_id: string
  email: string
  name: string
  avatar_url: string
  created_at: string
}

export default function ManagerViewPicker() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/managers')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setManagers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manager View</h1>
        <p className="text-gray-500 text-sm mt-0.5">See what each manager has been doing, or open the live orders desk</p>
      </div>

      {/* Live desk — the shared screen every manager works on */}
      <Link href="/manager"
        className="flex items-center gap-4 bg-slate-900 rounded-2xl p-5 mb-6 hover:bg-slate-800 transition-colors group">
        <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
          <MonitorSmartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">Live Orders Desk</p>
          <p className="text-slate-400 text-xs mt-0.5">The shared screen all managers work on — accept orders, bills, tables</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
      </Link>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Per-manager activity</p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : managers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No managers yet</p>
          <p className="text-gray-300 text-sm mt-1">
            Create one on the <Link href="/admin/managers" className="text-orange-500 hover:underline">Managers</Link> page
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {managers.map(m => (
            <Link key={m.user_id} href={`/admin/manager-view/${m.user_id}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-orange-200 hover:shadow transition-all group">
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt={m.name || m.email} className="w-11 h-11 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold shrink-0">
                  {(m.name || m.email)[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{m.name || 'Manager'}</p>
                <p className="text-gray-400 text-xs truncate">{m.email}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
