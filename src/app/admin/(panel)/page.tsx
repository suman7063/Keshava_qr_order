'use client'

import { useEffect, useState } from 'react'
import { Order, RestaurantTable } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ShoppingBag, Table2, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface DashSession {
  id: string
  table_id: string
  status: string
  started_at: string
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [sessions, setSessions] = useState<DashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [revPeriod, setRevPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d')

  async function load() {
    const [ordersRes, tablesRes, sessionsRes] = await Promise.all([
      fetch('/api/orders'),
      fetch('/api/tables'),
      fetch('/api/sessions/all'),
    ])
    const ordersData = ordersRes.ok ? await ordersRes.json() : []
    const tablesData = tablesRes.ok ? await tablesRes.json() : []
    const sessionsData = sessionsRes.ok ? await sessionsRes.json() : []
    setOrders(Array.isArray(ordersData) ? ordersData : [])
    setTables(Array.isArray(tablesData) ? tablesData : [])
    setSessions(Array.isArray(sessionsData) ? sessionsData : [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })

  const totalRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0)
  const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status))

  // "Occupied" comes from live sessions, not the table's manual status —
  // a table with diners at it is occupied no matter what the label says.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const isOld = (iso: string) => new Date(iso) < startOfToday
  const activeSessions = sessions.filter(s => s.status === 'active')
  const occupiedIds = new Set(activeSessions.map(s => s.table_id))
  const occupiedTables = tables.filter(t => occupiedIds.has(t.id)).length
  // Leftovers from earlier days that nobody closed/settled
  const staleSessions = activeSessions.filter(s => isOld(s.started_at))
  const staleOrders = pendingOrders.filter(o => isOld(o.created_at))

  async function cleanupStale() {
    setCleaning(true)
    // Close leftover sessions — the server settles their orders too
    for (const s of staleSessions) {
      await fetch('/api/sessions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: s.id }),
      })
    }
    // Old unfinished orders whose session is already gone: settle directly —
    // never-accepted ones get cancelled, in-progress ones count as served.
    const res = await fetch('/api/orders')
    const fresh: Order[] = res.ok ? await res.json() : []
    const leftover = (Array.isArray(fresh) ? fresh : []).filter(
      o => ['pending', 'confirmed', 'preparing'].includes(o.status) && isOld(o.created_at)
    )
    for (const o of leftover) {
      await fetch(`/api/orders/${o.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: o.status === 'pending' ? 'cancelled' : 'served' }),
      })
    }
    await load()
    setCleaning(false)
  }

  // Which table earns the most — ranked revenue per table for a period
  const revStart = (() => {
    if (revPeriod === 'all') return null
    const d = new Date()
    if (revPeriod === 'today') { d.setHours(0, 0, 0, 0); return d }
    d.setDate(d.getDate() - (revPeriod === '7d' ? 7 : 30))
    return d
  })()
  const revenueByTable = (() => {
    const m = new Map<string, { name: string; revenue: number; count: number }>()
    for (const o of orders) {
      if (o.status === 'cancelled') continue
      if (revStart && new Date(o.created_at) < revStart) continue
      const key = o.table_id || 'unknown'
      const cur = m.get(key) || { name: o.table?.table_number || '—', revenue: 0, count: 0 }
      cur.revenue += o.total_amount
      cur.count += 1
      m.set(key, cur)
    }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue)
  })()
  const topTableRevenue = revenueByTable[0]?.revenue || 1

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, color: 'bg-blue-500' },
    { label: "Today's Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: 'bg-green-500' },
    { label: 'Active Orders', value: pendingOrders.length, icon: Clock, color: 'bg-orange-500' },
    { label: 'Occupied Tables', value: `${occupiedTables}/${tables.length}`, icon: Table2, color: 'bg-purple-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview of restaurant operations</p>
      </div>

      {/* Leftovers from earlier days — one click settles everything */}
      {!loading && (staleSessions.length > 0 || staleOrders.length > 0) && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 flex-1 min-w-48">
            {staleSessions.length > 0 && `${staleSessions.length} table session${staleSessions.length === 1 ? '' : 's'}`}
            {staleSessions.length > 0 && staleOrders.length > 0 && ' and '}
            {staleOrders.length > 0 && `${staleOrders.length} order${staleOrders.length === 1 ? '' : 's'}`}
            {' '}from earlier days are still open — close them so today&apos;s numbers stay clean.
          </p>
          <Button size="sm" variant="outline" loading={cleaning} onClick={cleanupStale}
            className="border-amber-300 text-amber-700 hover:bg-amber-100">
            Close old sessions
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Active Orders</h2>
              <Link href="/kitchen" className="text-sm text-orange-600 hover:text-orange-700 font-medium">View Kitchen →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (
              <p className="text-gray-400 text-sm">No active orders</p>
            ) : (
              <div className="space-y-3">
                {pendingOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        Table {order.table?.table_number}
                        {isOld(order.created_at) && (
                          <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full align-middle">old</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{order.items?.length} items · {formatCurrency(order.total_amount)} · {formatDate(order.created_at)}</p>
                    </div>
                    <Badge variant={order.status === 'pending' ? 'danger' : order.status === 'preparing' ? 'info' : 'warning'}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Table Status</h2>
              <Link href="/admin/tables" className="text-sm text-orange-600 hover:text-orange-700 font-medium">Manage →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {tables.map(table => {
                // Live session wins over the manual label
                const status = occupiedIds.has(table.id) ? 'occupied' : table.status
                return (
                  <div key={table.id} className={`rounded-xl p-3 text-center ${
                    status === 'occupied' ? 'bg-red-50 border border-red-200' :
                    status === 'reserved' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-green-50 border border-green-200'
                  }`}>
                    <p className={`font-bold text-sm ${
                      status === 'occupied' ? 'text-red-700' :
                      status === 'reserved' ? 'text-yellow-700' : 'text-green-700'
                    }`}>T{table.table_number}</p>
                    <p className={`text-xs mt-0.5 ${
                      status === 'occupied' ? 'text-red-500' :
                      status === 'reserved' ? 'text-yellow-500' : 'text-green-500'
                    }`}>{status}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by table — which table earns the most */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Revenue by Table</h2>
              <div className="flex gap-1.5">
                {([['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All time']] as const).map(([k, lbl]) => (
                  <button key={k} onClick={() => setRevPeriod(k)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${revPeriod === k ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueByTable.length === 0 ? (
              <p className="text-gray-400 text-sm">No orders in this period</p>
            ) : (
              <div className="space-y-4">
                {revenueByTable.map((t, i) => (
                  <div key={t.name + i} className="flex items-center gap-3">
                    <span className={`w-8 text-center shrink-0 ${i === 0 ? 'text-xl' : 'text-xs font-bold text-gray-400'}`}>
                      {i === 0 ? '👑' : `#${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">Table {t.name}</span>
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(t.revenue)}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-orange-300'}`}
                          style={{ width: `${Math.max(4, Math.round((t.revenue / topTableRevenue) * 100))}%` }} />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{t.count} order{t.count === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
