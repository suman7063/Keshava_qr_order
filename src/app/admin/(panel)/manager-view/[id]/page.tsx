'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Order } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, CheckCircle, XCircle, DollarSign, ClipboardList, Info, ChevronDown } from 'lucide-react'

interface Manager {
  user_id: string
  email: string
  name: string
  avatar_url: string
}

interface ClosedSession {
  id: string
  status: string
  ended_at?: string
  closed_by?: string
}

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'secondary' | 'success' | 'default' | 'danger'> = {
  pending: 'danger', confirmed: 'warning', preparing: 'info',
  ready: 'secondary', served: 'success', cancelled: 'default',
}

export default function ManagerActivityPage() {
  const params = useParams()
  const managerId = params.id as string

  const [manager, setManager] = useState<Manager | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [sessions, setSessions] = useState<ClosedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('today')
  const [openSession, setOpenSession] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [mRes, oRes, sRes] = await Promise.all([
        fetch('/api/admin/managers'),
        fetch(`/api/orders?handled_by=${managerId}`),
        fetch('/api/sessions/all'),
      ])
      const managers: Manager[] = mRes.ok ? await mRes.json() : []
      const ordersData = oRes.ok ? await oRes.json() : []
      const sessionsData = sRes.ok ? await sRes.json() : []
      setManager((Array.isArray(managers) ? managers : []).find(m => m.user_id === managerId) || null)
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setSessions(Array.isArray(sessionsData) ? sessionsData : [])
      setLoading(false)
    }
    load()
  }, [managerId])

  // Present AND past: stats + list follow the selected period.
  const periodStart = (() => {
    if (period === 'all') return null
    const d = new Date()
    if (period === 'today') { d.setHours(0, 0, 0, 0); return d }
    d.setDate(d.getDate() - (period === '7d' ? 7 : 30))
    return d
  })()
  const inPeriod = (iso?: string) => (iso ? !periodStart || new Date(iso) >= periodStart : false)
  const periodOrders = orders.filter(o => inPeriod(o.updated_at || o.created_at))
  const handled = periodOrders.filter(o => o.status !== 'cancelled')
  const rejected = periodOrders.filter(o => o.status === 'cancelled')
  const revenue = handled.reduce((s, o) => s + o.total_amount, 0)
  const closedCount = sessions.filter(s => s.closed_by === managerId && inPeriod(s.ended_at)).length

  const stats = [
    { label: 'Orders handled', value: handled.length, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Revenue handled', value: formatCurrency(revenue), icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Rejected', value: rejected.length, icon: XCircle, color: 'bg-red-500' },
    { label: 'Tables closed', value: closedCount, icon: ClipboardList, color: 'bg-purple-500' },
  ]

  // One row per table session: first customer up front, everyone inside.
  const sessionGroups = (() => {
    const bySession = new Map<string, Order[]>()
    for (const o of periodOrders) {
      const key = o.session_id || o.id
      bySession.set(key, [...(bySession.get(key) || []), o])
    }
    return [...bySession.entries()]
      .map(([key, list]) => {
        const inOrder = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        return {
          key,
          orders: inOrder,
          table: inOrder[0].table?.table_number,
          firstCustomer: inOrder[0].session?.customer_name || inOrder[0].customer_name || 'Customer',
          customers: [...new Set(inOrder.map(o => o.customer_name).filter(Boolean))],
          items: inOrder.reduce((s, o) => s + (o.items?.length || 0), 0),
          total: inOrder.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0),
          start: inOrder[0].created_at,
        }
      })
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  })()

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <Link href="/admin/manager-view" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> All managers
      </Link>

      {/* Manager header */}
      <div className="flex items-center gap-4 mb-8">
        {manager?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={manager.avatar_url} alt={manager.name || 'Manager'} className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-xl">
            {(manager?.name || manager?.email || 'M')[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{manager?.name || 'Manager'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{manager?.email}</p>
        </div>
      </div>

      {/* Period selector — present and past */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {([['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['all', 'All time']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setPeriod(k)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${period === k ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-orange-300'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Stats for the selected period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 truncate">{s.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions handled — one row per table session; click to see everyone in it */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Sessions handled by {manager?.name || 'this manager'}</h2>
          <p className="text-gray-400 text-xs mt-0.5">One row per table session — click a row to see every customer&apos;s order in it</p>
        </div>
        {sessionGroups.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 font-medium">
              {orders.length === 0 ? 'Nothing recorded yet' : 'No activity in this period'}
            </p>
            {orders.length === 0 && (
              <p className="text-gray-300 text-sm mt-1 flex items-center justify-center gap-1.5">
                <Info className="w-4 h-4" /> Tracking started recently — actions before that were not recorded.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessionGroups.slice(0, 30).map(g => {
              const open = openSession === g.key
              return (
                <div key={g.key}>
                  {/* Session row */}
                  <button onClick={() => setOpenSession(open ? null : g.key)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/60 transition-colors cursor-pointer">
                    <div className="min-w-24">
                      <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">Table {g.table}</p>
                      <p className="text-[11px] text-gray-400 whitespace-nowrap">{formatDate(g.start)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {g.firstCustomer}
                        {g.customers.length > 1 && (
                          <span className="text-xs text-gray-400"> +{g.customers.length - 1} more</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400">{g.orders.length} order{g.orders.length === 1 ? '' : 's'} · {g.items} item{g.items === 1 ? '' : 's'}</p>
                    </div>
                    <span className="font-semibold text-orange-600 whitespace-nowrap">{formatCurrency(g.total)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Everyone in this session */}
                  {open && (
                    <div className="bg-gray-50/70 px-5 pb-4 pt-1 space-y-2">
                      {g.orders.map(o => (
                        <div key={o.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2.5">
                          <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                            {o.customer_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{o.customer_name || 'Customer'}</p>
                            <p className="text-[11px] text-gray-400">{o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'} · placed {formatDate(o.created_at)}</p>
                          </div>
                          <Badge variant={STATUS_VARIANT[o.status] || 'default'} className="capitalize text-xs">{o.status}</Badge>
                          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{formatCurrency(o.total_amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
