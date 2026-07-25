'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { Users, XCircle, RefreshCw, ClipboardList } from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  total_price: number
  menu_item?: { name: string }
}

interface Order {
  id: string
  customer_name?: string
  status: string
  total_amount: number
  created_at: string
  items?: OrderItem[]
}

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
  const [detailSession, setDetailSession] = useState<Session | null>(null)
  const [detailOrders, setDetailOrders] = useState<Order[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  async function fetchSessions() {
    setLoading(true)
    const res = await fetch('/api/sessions/all')
    const data = res.ok ? await res.json() : []
    setSessions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchSessions() }, [])

  async function openDetails(s: Session) {
    setDetailSession(s)
    setDetailOrders([])
    setDetailLoading(true)
    const res = await fetch(`/api/orders?session_id=${s.id}`)
    const data = res.ok ? await res.json() : []
    setDetailOrders(Array.isArray(data) ? data : [])
    setDetailLoading(false)
  }

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
  const grandTotal = detailOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0)

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
        {(['active', 'closed'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize',
              activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {tab === 'active' ? 'Active Sessions' : 'Closed Sessions'}
            <span className={cn('ml-2 text-xs font-bold px-2 py-0.5 rounded-full',
              activeTab === tab ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500')}>
              {tab === 'active' ? active.length : closed.length}
            </span>
          </button>
        ))}
      </div>

      {/* Active Sessions Tab */}
      {activeTab === 'active' && (
        loading ? <p className="text-gray-400 text-sm">Loading...</p>
        : active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No active sessions</p>
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
                      {s.otp
                        ? <span className="inline-flex bg-orange-50 border border-orange-200 text-orange-700 font-bold tracking-widest text-sm px-2.5 py-1 rounded-lg">{s.otp}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(s.started_at)}</td>
                    <td className="px-5 py-4">
                      {s.bill_requested ? <Badge variant="warning">Requested</Badge> : <Badge variant="default">Pending</Badge>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openDetails(s)} title="View Orders">
                          <ClipboardList className="w-4 h-4 text-gray-400" />
                        </Button>
                        <Button variant="danger" size="sm" loading={closingId === s.id}
                          onClick={() => closeSession(s.id, s.table?.table_number || '')}>
                          <XCircle className="w-4 h-4 mr-1" /> Close
                        </Button>
                      </div>
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
        loading ? <p className="text-gray-400 text-sm">Loading...</p>
        : closed.length === 0 ? (
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
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {closed.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-medium text-gray-700">Table {s.table?.table_number}</td>
                    <td className="px-5 py-4 text-gray-600">{s.customer_name || '—'}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(s.started_at)}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{s.ended_at ? formatDate(s.ended_at) : '—'}</td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetails(s)} title="View Orders">
                        <ClipboardList className="w-4 h-4 text-gray-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Orders Detail Modal */}
      <Modal isOpen={!!detailSession} onClose={() => setDetailSession(null)}
        title={`Orders — Table ${detailSession?.table?.table_number}`}>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {detailLoading ? (
            <p className="text-gray-400 text-sm text-center py-6">Loading...</p>
          ) : detailOrders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No orders found</p>
          ) : detailOrders.map((order, i) => (
            <div key={order.id} className={`bg-gray-50 rounded-xl p-4 ${order.status === 'cancelled' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                    {order.customer_name?.[0]?.toUpperCase() || (i + 1)}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{order.customer_name || `Order ${i + 1}`}</p>
                </div>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                  order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                  order.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                  'bg-blue-100 text-blue-700')}>
                  {order.status}
                </span>
              </div>
              <div className="space-y-1">
                {order.items?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.menu_item?.name}{item.quantity > 1 && <span className="font-semibold text-orange-500"> ×{item.quantity}</span>}</span>
                    <span className="text-gray-500">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-bold">
                <span className="text-gray-700">Order Total</span>
                <span className="text-orange-600">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>
        {detailOrders.length > 0 && (
          <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Grand Total</span>
            <span className="text-xl font-bold text-orange-600">{formatCurrency(grandTotal)}</span>
          </div>
        )}
      </Modal>
    </div>
  )
}
