'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Order } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, CheckCircle, XCircle, DollarSign, ClipboardList, Info } from 'lucide-react'

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

  const today = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.updated_at || o.created_at).toDateString() === today)
  const handledToday = todayOrders.filter(o => o.status !== 'cancelled')
  const rejectedToday = todayOrders.filter(o => o.status === 'cancelled')
  const revenueToday = handledToday.reduce((s, o) => s + o.total_amount, 0)
  const closedToday = sessions.filter(s =>
    s.closed_by === managerId && s.ended_at && new Date(s.ended_at).toDateString() === today
  ).length

  const stats = [
    { label: 'Orders handled today', value: handledToday.length, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Revenue handled today', value: formatCurrency(revenueToday), icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Rejected today', value: rejectedToday.length, icon: XCircle, color: 'bg-red-500' },
    { label: 'Tables closed today', value: closedToday, icon: ClipboardList, color: 'bg-purple-500' },
  ]

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

      {/* Today's stats */}
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

      {/* Recent handled orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Orders handled by {manager?.name || 'this manager'}</h2>
          <p className="text-gray-400 text-xs mt-0.5">Most recent first — status shows where they took it</p>
        </div>
        {orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 font-medium">Nothing recorded yet</p>
            <p className="text-gray-300 text-sm mt-1 flex items-center justify-center gap-1.5">
              <Info className="w-4 h-4" /> Tracking starts from today — older actions were not recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Table', 'Items', 'Amount', 'Status', 'When'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 25).map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">Table {o.table?.table_number}</td>
                    <td className="px-5 py-3.5 text-gray-500">{o.items?.length || 0}</td>
                    <td className="px-5 py-3.5 font-semibold text-orange-600 whitespace-nowrap">{formatCurrency(o.total_amount)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge variant={STATUS_VARIANT[o.status] || 'default'} className="capitalize text-xs">{o.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(o.updated_at || o.created_at)}</td>
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
