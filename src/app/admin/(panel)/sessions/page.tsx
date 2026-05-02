'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Users, XCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Session {
  id: string
  status: string
  customer_name?: string
  phone?: string
  otp?: string
  started_at: string
  ended_at?: string
  bill_requested: boolean
  table?: { table_number: string; id: string }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active')

  async function fetchSessions() {
    setLoading(true)
    const res = await fetch('/api/sessions/all')
    setSessions(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchSessions() }, [])

  async function closeSession(id: string, tableNumber: string) {
    if (!confirm(`Close session for Table ${tableNumber}? Table will become available.`)) return
    setClosingId(id)
    await fetch('/api/sessions/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: id }),
    })
    await fetchSessions()
    setClosingId(null)
  }

  const active = sessions.filter(s => s.status === 'active')
  const closed = sessions.filter(s => s.status === 'closed')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Active and past table sessions</p>
        </div>
        <Button variant="outline" onClick={fetchSessions}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'active'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Active Sessions
          <span className={cn(
            'ml-2 text-xs font-bold px-2 py-0.5 rounded-full',
            activeTab === 'active' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
          )}>
            {active.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={cn(
            'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'closed'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Closed Sessions
          <span className={cn(
            'ml-2 text-xs font-bold px-2 py-0.5 rounded-full',
            activeTab === 'closed' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
          )}>
            {closed.length}
          </span>
        </button>
      </div>

      {/* Active Sessions Tab */}
      {activeTab === 'active' && (
        loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No active sessions</p>
            <p className="text-gray-300 text-sm mt-1">Sessions will appear when customers place orders</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Table</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">OTP</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Started</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Bill</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {active.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-bold text-gray-900">Table {s.table?.table_number}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{s.customer_name || '—'}</p>
                      {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                    </td>
                    <td className="px-5 py-4">
                      {s.otp ? (
                        <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 font-bold tracking-widest text-sm px-2.5 py-1 rounded-lg">
                          {s.otp}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(s.started_at)}</td>
                    <td className="px-5 py-4">
                      {s.bill_requested
                        ? <Badge variant="warning">Requested</Badge>
                        : <Badge variant="default">Pending</Badge>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={closingId === s.id}
                        onClick={() => closeSession(s.id, s.table?.table_number || '')}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Close
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Closed Sessions Tab */}
      {activeTab === 'closed' && (
        loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : closed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No closed sessions yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Table</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Started</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Ended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {closed.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-medium text-gray-700">Table {s.table?.table_number}</td>
                    <td className="px-5 py-4 text-gray-600">{s.customer_name || '—'}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(s.started_at)}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{s.ended_at ? formatDate(s.ended_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
