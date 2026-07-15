'use client'

import { useEffect, useState } from 'react'
import { Order, RestaurantTable } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ShoppingBag, Table2, DollarSign, Clock } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [ordersRes, tablesRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/tables'),
      ])
      const ordersData = ordersRes.ok ? await ordersRes.json() : []
      const tablesData = tablesRes.ok ? await tablesRes.json() : []
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setTables(Array.isArray(tablesData) ? tablesData : [])
      setLoading(false)
    }
    load()
  }, [])

  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })

  const totalRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0)
  const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status))
  const occupiedTables = tables.filter(t => t.status === 'occupied').length

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
                      <p className="font-medium text-sm text-gray-900">Table {order.table?.table_number}</p>
                      <p className="text-xs text-gray-400">{order.items?.length} items · {formatCurrency(order.total_amount)}</p>
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
              {tables.map(table => (
                <div key={table.id} className={`rounded-xl p-3 text-center ${
                  table.status === 'occupied' ? 'bg-red-50 border border-red-200' :
                  table.status === 'reserved' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-green-50 border border-green-200'
                }`}>
                  <p className={`font-bold text-sm ${
                    table.status === 'occupied' ? 'text-red-700' :
                    table.status === 'reserved' ? 'text-yellow-700' : 'text-green-700'
                  }`}>T{table.table_number}</p>
                  <p className={`text-xs mt-0.5 ${
                    table.status === 'occupied' ? 'text-red-500' :
                    table.status === 'reserved' ? 'text-yellow-500' : 'text-green-500'
                  }`}>{table.status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
