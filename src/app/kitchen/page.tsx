'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem, OrderStatus, MenuCategory, KitchenStation } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ChefHat, Clock, AlertCircle, Printer } from 'lucide-react'
import { splitOrderByKitchen, buildKotHTML, printHtml } from '@/lib/kot'

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
  const [stations, setStations] = useState<KitchenStation[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [restaurantName, setRestaurantName] = useState('')
  // This device's kitchen: 'all' | 'main' | a kitchen id (persisted per device)
  const [selectedKitchen, setSelectedKitchen] = useState<string>('all')
  const [autoPrint, setAutoPrint] = useState(false)
  const printedRef = useRef<Set<string>>(new Set())

  // Per-device persisted choices (read after mount — no SSR localStorage)
  useEffect(() => {
    setSelectedKitchen(localStorage.getItem('kitchen-device-station') || 'all')
    setAutoPrint(localStorage.getItem('kitchen-auto-print') === '1')
    try {
      printedRef.current = new Set(JSON.parse(localStorage.getItem('kitchen-kot-printed') || '[]'))
    } catch { /* corrupt store — start fresh */ }
  }, [])

  function pickKitchen(k: string) {
    setSelectedKitchen(k)
    localStorage.setItem('kitchen-device-station', k)
  }

  function toggleAutoPrint() {
    setAutoPrint(v => {
      localStorage.setItem('kitchen-auto-print', v ? '0' : '1')
      return !v
    })
  }

  function markPrinted(key: string) {
    printedRef.current.add(key)
    localStorage.setItem('kitchen-kot-printed', JSON.stringify([...printedRef.current].slice(-300)))
  }

  // Short beep so staff notice new tickets without watching the screen
  function playBeep() {
    try {
      type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }
      const AudioCtx = window.AudioContext || (window as AudioWindow).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch { /* audio blocked — ignore */ }
  }

  function printOrder(order: Order) {
    const all = splitOrderByKitchen(order, categories, stations)
    const slips = stations.length === 0 || selectedKitchen === 'all'
      ? all
      : all.filter(s => (s.kitchenId ?? 'main') === selectedKitchen)
    if (!slips.length) return
    printHtml(buildKotHTML(slips, {
      restaurantName,
      tableNumber: order.table?.table_number || '—',
      orderCode: order.id.slice(-6).toUpperCase(),
      when: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
    }))
  }

  async function fetchOrders() {
    const res = await fetch('/api/orders?today=true')
    const data = res.ok ? await res.json() : []
    // Only show active orders in kitchen
    setOrders((Array.isArray(data) ? data : []).filter((o: Order) => ACTIVE_STATUSES.includes(o.status)))
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    // Kitchens + category defaults (for KOT routing) + restaurant name
    fetch('/api/stations').then(r => (r.ok ? r.json() : [])).then(d => setStations(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/menu-categories').then(r => (r.ok ? r.json() : [])).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/restaurants/current').then(r => r.json()).then(r => { if (r?.name) setRestaurantName(r.name) }).catch(() => {})

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
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Could not update the order.')
    }
    await fetchOrders()
    setUpdating(null)
  }

  // This device's slice of the work: orders that have at least one item for
  // the selected kitchen, showing only that kitchen's items.
  const visible = orders
    .map(order => {
      if (stations.length === 0 || selectedKitchen === 'all') {
        return { order, items: order.items || [], other: 0 }
      }
      const slip = splitOrderByKitchen(order, categories, stations)
        .find(s => (s.kitchenId ?? 'main') === selectedKitchen)
      if (!slip) return null
      return { order, items: slip.items, other: (order.items?.length || 0) - slip.items.length }
    })
    .filter((v): v is { order: Order; items: OrderItem[]; other: number } => v !== null)

  const filtered = filter === 'all' ? visible : visible.filter(v => v.order.status === filter)
  const counts = ACTIVE_STATUSES.reduce((acc, s) => {
    acc[s] = visible.filter(v => v.order.status === s).length
    return acc
  }, {} as Record<string, number>)

  // Auto-print: any confirmed order this device hasn't printed yet gets its
  // kitchen slip printed silently (hidden iframe; kiosk-printing skips the
  // dialog) — once per order per kitchen, remembered across refreshes.
  useEffect(() => {
    if (!autoPrint || loading) return
    for (const v of visible) {
      if (v.order.status !== 'confirmed') continue
      const key = `${v.order.id}:${selectedKitchen}`
      if (printedRef.current.has(key)) continue
      printOrder(v.order)
      markPrinted(key)
      playBeep()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, autoPrint, selectedKitchen, stations, categories, loading])

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
              <p className="text-gray-400 text-sm">{visible.length} active orders</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleAutoPrint}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
                autoPrint ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-600 text-gray-400 hover:text-white')}>
              <Printer className="w-4 h-4" /> Auto-print {autoPrint ? 'ON' : 'OFF'}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kitchen picker — which kitchen is this device? */}
      {stations.length > 0 && (
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
          <div className="max-w-7xl mx-auto flex gap-2 items-center overflow-x-auto scrollbar-none">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide shrink-0">Kitchen:</span>
            {[{ id: 'all', name: 'All kitchens' }, { id: 'main', name: 'Main Kitchen' }, ...stations.map(s => ({ id: s.id, name: s.name }))].map(k => (
              <button key={k.id} onClick={() => pickKitchen(k.id)}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
                  selectedKitchen === k.id ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}>
                {k.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status filters */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', filter === 'all' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white')}
          >
            All ({visible.length})
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
            <p className="text-gray-400 text-lg">No active orders</p>
            <p className="text-gray-500 text-sm mt-1">Orders will appear here once the manager accepts them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(({ order, items, other }) => {
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

                  {/* Items — only this kitchen's share when a kitchen is selected */}
                  <div className="p-4 flex-1 space-y-2">
                    {items.map(item => (
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
                    {other > 0 && (
                      <p className="text-xs text-gray-500 italic">+{other} item{other === 1 ? '' : 's'} for other kitchens</p>
                    )}
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
                    <div className="flex gap-2">
                      {config.next && config.action && (
                        <Button
                          size="sm"
                          className="flex-1"
                          loading={updating === order.id}
                          onClick={() => updateStatus(order.id, config.next!)}
                          variant={order.status === 'pending' ? 'primary' : 'secondary'}
                        >
                          {config.action}
                        </Button>
                      )}
                      <button onClick={() => printOrder(order)} title="Print KOT"
                        className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors cursor-pointer">
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
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
