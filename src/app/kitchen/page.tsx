'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ChefHat, Clock, AlertCircle } from 'lucide-react'

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'warning' | 'info' | 'secondary' | 'success' | 'default' | 'danger'; next?: OrderStatus; action?: string }> = {
  pending:    { label: 'Pending',   variant: 'danger' },
  confirmed:  { label: 'Accepted',  variant: 'warning',   next: 'preparing',  action: 'Start Cooking' },
  preparing:  { label: 'Cooking',   variant: 'info',      next: 'ready',      action: 'Mark Ready' },
  ready:      { label: 'Ready',     variant: 'success',   next: 'served',     action: 'Served' },
  served:     { label: 'Served',    variant: 'default' },
  cancelled:  { label: 'Cancelled', variant: 'secondary' },
}

// Kitchen sirf manager-accepted orders dekhta hai (pending nahi)
const ACTIVE_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready']

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchOrders() {
    const res = await fetch('/api/orders')
    const data = await res.json()
    // Only show active orders in kitchen
    setOrders(data.filter((o: Order) => ACTIVE_STATUSES.includes(o.status)))
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    const supabase = createClient()
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId)
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchOrders()
    setUpdating(null)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const counts = ACTIVE_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length
    return acc
  }, {} as Record<string, number>)

  function getElapsedMinutes(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Kitchen Dashboard</h1>
              <p className="text-gray-400 text-sm">{orders.length} active orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm">Live</span>
          </div>
        </div>
      </div>

      {/* Status filters */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', filter === 'all' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}
          >
            All ({orders.length})
          </button>
          {ACTIVE_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', filter === s ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}
            >
              {STATUS_CONFIG[s].label} ({counts[s] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Koi order nahi</p>
            <p className="text-gray-500 text-sm mt-1">Manager ke accept karne ke baad orders yahan aayenge</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(order => {
              const config = STATUS_CONFIG[order.status]
              const elapsed = getElapsedMinutes(order.created_at)
              const isUrgent = elapsed > 15 && order.status !== 'ready'

              return (
                <div
                  key={order.id}
                  className={cn(
                    'bg-gray-800 rounded-2xl border flex flex-col',
                    order.status === 'pending' ? 'border-red-500 shadow-red-900/50 shadow-lg' :
                    order.status === 'preparing' ? 'border-blue-500' :
                    order.status === 'ready' ? 'border-green-500' :
                    'border-gray-700'
                  )}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">Table {order.table?.table_number}</p>
                        <p className="text-gray-400 text-sm">{formatDate(order.created_at)}</p>
                      </div>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className={cn('w-4 h-4', isUrgent ? 'text-red-400' : 'text-gray-400')} />
                      <span className={cn('text-sm', isUrgent ? 'text-red-400 font-medium' : 'text-gray-400')}>
                        {elapsed}m ago
                      </span>
                      {isUrgent && <AlertCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-4 flex-1 space-y-2">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex items-start gap-2">
                        <span className="bg-orange-500 text-white text-xs font-bold rounded px-1.5 py-0.5 shrink-0">
                          x{item.quantity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{item.menu_item?.name}</p>
                          {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="mt-2 p-2 bg-yellow-900/30 rounded-lg border border-yellow-800">
                        <p className="text-xs text-yellow-300">Note: {order.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-sm">Total</span>
                      <span className="font-bold text-orange-400">{formatCurrency(order.total_amount)}</span>
                    </div>
                    {config.next && config.action && (
                      <Button
                        size="sm"
                        className="w-full"
                        loading={updating === order.id}
                        onClick={() => updateStatus(order.id, config.next!)}
                        variant={order.status === 'pending' ? 'primary' : 'secondary'}
                      >
                        {config.action}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
