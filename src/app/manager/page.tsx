'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  BarChart3, DollarSign, ShoppingBag, TrendingUp, Clock,
  CheckCircle, XCircle, LogOut, RefreshCw, AlertCircle,
  ClipboardList, LayoutDashboard, ChefHat, FileText
} from 'lucide-react'

interface BillSession {
  id: string
  table_id: string
  customer_name?: string
  started_at: string
  bill_requested: boolean
  table?: { table_number: string }
}

const STATUS_VARIANT: Record<OrderStatus, 'warning' | 'info' | 'secondary' | 'success' | 'default' | 'danger'> = {
  pending: 'danger', confirmed: 'warning', preparing: 'info',
  ready: 'secondary', served: 'success', cancelled: 'default',
}

type Tab = 'overview' | 'new-orders' | 'all-orders' | 'bill-requests'

export default function ManagerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [orders, setOrders] = useState<Order[]>([])
  const [billSessions, setBillSessions] = useState<BillSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [managerEmail, setManagerEmail] = useState('')
  const [managerName, setManagerName] = useState('')
  const [managerAvatar, setManagerAvatar] = useState('')

  async function fetchOrders() {
    const res = await fetch('/api/orders')
    setOrders(await res.json())
    setLoading(false)
  }

  async function fetchBillRequests() {
    const res = await fetch('/api/sessions?bill_requested=true')
    const data = await res.json()
    setBillSessions(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchOrders()
    fetchBillRequests()
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setManagerEmail(user.email)
      if (user?.user_metadata?.name) setManagerName(user.user_metadata.name as string)
      if (user?.user_metadata?.avatar_url) setManagerAvatar(user.user_metadata.avatar_url as string)
    })

    const channel = supabase
      .channel('manager-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, fetchBillRequests)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchOrders()
    setUpdatingId(null)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/manager/login')
    router.refresh()
  }

  async function closeSession(sessionId: string) {
    await fetch('/api/sessions/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    fetchBillRequests()
    fetchOrders()
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const today = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
  const revenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0)
  const servedOrders = todayOrders.filter(o => o.status !== 'cancelled')
  const avgOrder = servedOrders.length ? revenue / servedOrders.length : 0
  const cancelRate = todayOrders.length ? (todayOrders.filter(o => o.status === 'cancelled').length / todayOrders.length * 100) : 0

  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {}
  todayOrders.forEach(order => {
    order.items?.forEach(item => {
      const name = item.menu_item?.name || 'Unknown'
      if (!itemCounts[name]) itemCounts[name] = { name, count: 0, revenue: 0 }
      itemCounts[name].count += item.quantity
      itemCounts[name].revenue += item.total_price
    })
  })
  const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5)
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  function getElapsed(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'new-orders', label: 'New Orders', icon: <AlertCircle className="w-4 h-4" />, count: pendingOrders.length },
    { id: 'all-orders', label: 'All Orders', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'bill-requests', label: 'Bill Requests', icon: <FileText className="w-4 h-4" />, count: billSessions.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {managerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={managerAvatar} alt={managerName || managerEmail} className="w-9 h-9 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm">
                  {(managerName || managerEmail)[0]?.toUpperCase() || <BarChart3 className="w-4 h-4" />}
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  {managerName ? managerName : 'Manager Dashboard'}
                </h1>
                {managerEmail && (
                  <p className="text-purple-500 text-xs font-medium truncate max-w-[180px] sm:max-w-xs">
                    {managerEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {pendingOrders.length > 0 && (
                <button onClick={() => setActiveTab('new-orders')}
                  className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  {pendingOrders.length}
                </button>
              )}
              <button onClick={fetchOrders} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={() => router.push('/kitchen')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Kitchen">
                <ChefHat className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                <LogOut className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          {/* Tabs — scrollable on mobile */}
          <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0',
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    'text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0',
                    activeTab === tab.id ? 'bg-white text-purple-600' : 'bg-red-500 text-white'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6">

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Today's Revenue", value: formatCurrency(revenue), icon: DollarSign, bg: 'bg-green-500' },
                { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, bg: 'bg-blue-500' },
                { label: 'Avg Order Value', value: formatCurrency(avgOrder), icon: TrendingUp, bg: 'bg-orange-500' },
                { label: 'Cancel Rate', value: `${cancelRate.toFixed(1)}%`, icon: BarChart3, bg: 'bg-red-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{loading ? '—' : s.value}</p>
                    <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Sellers */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Top Sellers Today</h3>
                {topItems.length === 0 ? (
                  <p className="text-gray-400 text-sm">No sales yet today</p>
                ) : topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 mb-3 last:mb-0">
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.count} sold</p>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>

              {/* Order Status Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Order Breakdown (Today)</h3>
                {(['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'] as OrderStatus[]).map(status => {
                  const count = todayOrders.filter(o => o.status === status).length
                  const pct = todayOrders.length ? Math.round(count / todayOrders.length * 100) : 0
                  return (
                    <div key={status} className="flex items-center gap-3 mb-3 last:mb-0">
                      <Badge variant={STATUS_VARIANT[status]} className="w-20 justify-center capitalize text-xs">{status}</Badge>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-600 w-5 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: NEW ORDERS ── */}
        {activeTab === 'new-orders' && (
          <div>
            {pendingOrders.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-green-700 font-semibold text-lg">All caught up!</p>
                <p className="text-green-500 text-sm mt-1">No pending orders right now</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl border-2 border-red-200 shadow-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xl font-bold text-gray-900">Table {order.table?.table_number}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {getElapsed(order.created_at)} min ago
                        </p>
                      </div>
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">NEW</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
                      {order.items?.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            <span className="font-bold text-orange-500">×{item.quantity}</span> {item.menu_item?.name}
                          </span>
                          <span className="text-gray-500 font-medium">{formatCurrency(item.total_price)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 mt-1 flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className="text-orange-600">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                    {order.notes && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
                        📝 {order.notes}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" loading={updatingId === order.id} onClick={() => updateStatus(order.id, 'confirmed')}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="danger" loading={updatingId === order.id} onClick={() => updateStatus(order.id, 'cancelled')}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ALL ORDERS ── */}
        {activeTab === 'all-orders' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-bold text-gray-900">All Orders</h3>
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'] as const).map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize',
                      filter === s ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Table', 'Items', 'Amount', 'Status', 'Time', 'Action'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No orders found</td></tr>
                  ) : filtered.map(order => (
                    <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">Table {order.table?.table_number}</td>
                      <td className="py-3 px-4 text-gray-500">{order.items?.length || 0} items</td>
                      <td className="py-3 px-4 font-bold text-orange-600">{formatCurrency(order.total_amount)}</td>
                      <td className="py-3 px-4"><Badge variant={STATUS_VARIANT[order.status]} className="capitalize text-xs">{order.status}</Badge></td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(order.created_at)}</td>
                      <td className="py-3 px-4">
                        {order.status === 'pending' && (
                          <Button size="sm" loading={updatingId === order.id} onClick={() => updateStatus(order.id, 'confirmed')}>
                            Accept
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: BILL REQUESTS ── */}
        {activeTab === 'bill-requests' && (
          <div>
            {billSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No bill requests</p>
                <p className="text-gray-300 text-sm mt-1">Tables requesting bill will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {billSessions.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border-2 border-orange-200 shadow-md p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xl font-bold text-gray-900">Table {s.table?.table_number}</p>
                        {s.customer_name && (
                          <p className="text-sm text-gray-500 mt-0.5">Customer: {s.customer_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold">
                        <FileText className="w-3.5 h-3.5" /> Bill Ready
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      Requested at {new Date(s.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                      <p className="text-xs text-orange-500 font-medium">
                        Customer has requested the bill — please attend to Table {s.table?.table_number}
                      </p>
                      <Button
                        size="sm"
                        variant="danger"
                        className="w-full"
                        onClick={() => {
                          if (confirm(`Close session for Table ${s.table?.table_number}? Table will become available.`))
                            closeSession(s.id)
                        }}
                      >
                        ✓ Bill Paid — Close Session
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
