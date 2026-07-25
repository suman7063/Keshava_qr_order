'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MenuItem, MenuCategory, CartItem, TableSession, Order } from '@/types'
import { formatCurrency, cn, formatDate } from '@/lib/utils'
import { Plus, Minus, ChevronDown, CheckCircle, Clock, Phone, User, KeyRound, ShoppingCart, Receipt, FileText, X } from 'lucide-react'
import MenuTemplate1 from '@/lib/menu-templates/template1'
import MenuTemplate2 from '@/lib/menu-templates/template2'
import { Button } from '@/components/ui/Button'


type Drawer = 'none' | 'cart' | 'customer-info' | 'show-otp' | 'verify-otp' | 'orders'

export default function TablePage() {
  const params = useParams()
  const tableId = params.tableId as string

  const [drawer, setDrawer] = useState<Drawer>('none')
  const [session, setSession] = useState<TableSession | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [sessionOrders, setSessionOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [guestName, setGuestName] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [showBillConfirm, setShowBillConfirm] = useState(false)
  const [billRequested, setBillRequested] = useState(false)
  const [requestingBill, setRequestingBill] = useState(false)
  const [currentCustomerName, setCurrentCustomerName] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [showOtpBadge, setShowOtpBadge] = useState(false)
  const [showMenuImages, setShowMenuImages] = useState(true)
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantId, setRestaurantId] = useState('')

  useEffect(() => {
    async function load() {
      try {
        // The table (an unguessable id) carries its own restaurant — resolve it
        // first, then load that restaurant's menu. Works on any domain, no
        // subdomain needed.
        const tableRes = await fetch(`/api/tables/${tableId}`)
        if (!tableRes.ok) { setLoadError('This table could not be found.'); setLoading(false); return }
        const tableData = await tableRes.json()
        const rid = tableData.restaurant_id as string
        setRestaurantId(rid)
        if (tableData?.table_number) setTableNumber(tableData.table_number)
        if (tableData?.restaurant?.name) setRestaurantName(tableData.restaurant.name)

        const q = `restaurant_id=${rid}`
        const [cats, items, settings] = await Promise.all([
          fetch(`/api/menu-categories?${q}`).then(r => r.json()),
          fetch(`/api/menu-items?${q}`).then(r => r.json()),
          fetch(`/api/settings?${q}`).then(r => r.json()),
        ])
        setCategories(Array.isArray(cats) ? cats : [])
        setMenuItems(Array.isArray(items) ? items : [])
        setShowMenuImages(settings?.show_menu_images ?? true)
        if (Array.isArray(cats) && cats.length > 0) setActiveCategory(cats[0].id)
        // Restore the table join code from localStorage if session was already started
        const saved = localStorage.getItem(`otp-${tableId}`)
        if (saved) { setGeneratedOtp(saved); setShowOtpBadge(true) }
      } catch (e) {
        setLoadError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tableId])

  function getSessionCode(): string {
    return localStorage.getItem(`otp-${tableId}`) || ''
  }

  async function fetchSessionOrders(sessionId: string) {
    const res = await fetch(`/api/orders?session_id=${sessionId}`, {
      headers: { 'x-session-code': getSessionCode() },
    })
    const orders = await res.json()
    setSessionOrders(Array.isArray(orders) ? orders : [])
  }

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item.id === item.id)
      if (existing) return prev.map(c => c.menu_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menu_item: item, quantity: 1 }]
    })
  }

  function removeFromCart(itemId: string) {
    setCart(prev => {
      const ex = prev.find(c => c.menu_item.id === itemId)
      if (!ex) return prev
      if (ex.quantity === 1) return prev.filter(c => c.menu_item.id !== itemId)
      return prev.map(c => c.menu_item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c)
    })
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.menu_item.price * c.quantity, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)
  const sessionTotal = sessionOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0)
  const canRequestBill = sessionOrders.some(o => !['pending', 'cancelled'].includes(o.status))

  async function handlePlaceOrderClick() {
    if (cart.length === 0 || placing) return
    setPlacing(true)
    try {
      const res = await fetch(`/api/sessions?table_id=${tableId}&restaurant_id=${restaurantId}`)
      const data = res.ok ? await res.json() : {}
      const existing = data.session
      if (existing) {
        setSession(existing)
        setBillRequested(existing.bill_requested || false)
        const savedOtp = localStorage.getItem(`otp-${tableId}`)
        if (savedOtp) {
          // Session creator — place order directly
          await placeOrder(existing, currentCustomerName || existing.customer_name || 'Customer')
        } else {
          // New person joining — ask for OTP
          setDrawer('verify-otp')
        }
      } else {
        setDrawer('customer-info')
      }
    } catch {
      setOtpError('Network error. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  async function handleCreateSession() {
    if (!name || !phone) return
    setPlacing(true)
    setOtpError('')
    setCurrentCustomerName(name)
    const res = await fetch(`/api/sessions?restaurant_id=${restaurantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, phone, customer_name: name }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.session || !data.otp) {
      setOtpError(data.error || 'Could not start your order. Please try again.')
      setPlacing(false)
      return
    }
    setSession(data.session)
    setGeneratedOtp(data.otp)
    localStorage.setItem(`otp-${tableId}`, data.otp)
    setDrawer('show-otp')
    setPlacing(false)
  }

  async function placeOrder(sessionData: TableSession, customerName: string) {
    setPlacing(true)
    const items = cart.map(c => ({
      menu_item_id: c.menu_item.id,
      quantity: c.quantity,
    }))
    const res = await fetch(`/api/orders?restaurant_id=${restaurantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-code': getSessionCode() },
      body: JSON.stringify({
        session_id: sessionData.id,
        items,
        customer_name: customerName,
      }),
    })
    if (res.ok) {
      setCart([])
      setShowOtpBadge(true)
      await fetchSessionOrders(sessionData.id)
      setDrawer('orders')
    } else {
      const data = await res.json().catch(() => ({}))
      setOtpError(data.error || 'Could not place the order. Please try again.')
    }
    setPlacing(false)
  }

  async function handleVerifyOtp() {
    if (!otpInput || !session) return
    setOtpError('')
    setPlacing(true)
    const res = await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, otp: otpInput }),
    })
    const data = await res.json()
    if (!res.ok) {
      setOtpError('Invalid code. Ask the first customer for their table code.')
      setPlacing(false)
      return
    }
    // Guest verified — remember the code so they can order & view bills too
    localStorage.setItem(`otp-${tableId}`, otpInput)
    setGeneratedOtp(otpInput)
    setShowOtpBadge(true)
    await placeOrder(data.session, guestName.trim() || 'Guest')
  }

  async function requestBill() {
    if (!session) return
    setRequestingBill(true)
    const res = await fetch('/api/sessions/bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-code': getSessionCode() },
      body: JSON.stringify({ session_id: session.id }),
    })
    if (res.ok) setBillRequested(true)
    setShowBillConfirm(false)
    setRequestingBill(false)
  }

  async function openOrdersPage() {
    const res = await fetch(`/api/sessions?table_id=${tableId}&restaurant_id=${restaurantId}`)
    const data = res.ok ? await res.json() : {}
    const existing = data.session
    if (existing) {
      setSession(existing)
      setBillRequested(existing.bill_requested || false)
      await fetchSessionOrders(existing.id)
      setDrawer('orders')
    }
  }

  useEffect(() => {
    if (!restaurantId) return
    function checkSession() {
      fetch(`/api/sessions?table_id=${tableId}&restaurant_id=${restaurantId}`)
        .then(async r => ({ ok: r.ok, body: await r.json().catch(() => null) }))
        .then(({ ok, body }) => {
          // Only act on a definitive response. A transient error must NOT wipe
          // the customer's live session / saved code.
          if (!ok || !body) return
          const existing = body.session
          if (existing) {
            setSession(existing)
            setBillRequested(existing.bill_requested || false)
          } else if (body.session === null) {
            // Staff closed the table — reset.
            setSession(null)
            setBillRequested(false)
            setSessionOrders([])
            setDrawer('none')
            localStorage.removeItem(`otp-${tableId}`)
            setGeneratedOtp('')
            setShowOtpBadge(false)
          }
        })
        .catch(() => {})
    }

    checkSession()

    // Session data is staff-only at the DB layer now, so realtime is not
    // available to anonymous customers — poll the API instead.
    const poll = setInterval(checkSession, 15000)
    return () => clearInterval(poll)
  }, [tableId, restaurantId])

  const filteredItems = activeCategory
    ? menuItems.filter(i => i.category_id === activeCategory && i.is_available)
    : menuItems.filter(i => i.is_available)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading menu...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm w-full max-w-sm text-center">
          <p className="text-red-500 font-semibold mb-2">Failed to load menu</p>
          <p className="text-gray-400 text-xs break-all">{loadError}</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 bg-[#1e3a5f] text-white px-6 py-2 rounded-xl text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#1e3a5f] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase">{restaurantName || 'Menu'}</h1>
            <p className="text-blue-300 text-xs mt-0.5">Table {tableNumber || tableId.slice(-4)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {session && (
              <button onClick={openOrdersPage}
                className="flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                <Receipt className="w-3.5 h-3.5" /> My Orders
              </button>
            )}
            {showOtpBadge && generatedOtp && (
              <button onClick={() => setDrawer('show-otp')}
                className="flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                <KeyRound className="w-3.5 h-3.5" /> {generatedOtp}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-lg mx-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center px-3 py-0">
            {categories.map((cat, i) => (
              <div key={cat.id} className="flex items-center shrink-0">
                {i > 0 && <span className="text-gray-300 mx-1 text-xs">|</span>}
                <button onClick={() => setActiveCategory(cat.id)}
                  className={cn('whitespace-nowrap px-3 py-3 text-xs font-bold uppercase tracking-wide transition-all',
                    activeCategory === cat.id ? 'text-[#1e3a5f]' : 'text-gray-400')}>
                  {cat.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      {showMenuImages
        ? <MenuTemplate1 items={filteredItems} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} />
        : <MenuTemplate2 items={filteredItems} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} />
      }

      {/* Cart Bar */}
      {cartCount > 0 && drawer === 'none' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setDrawer('cart')}
              className="w-full bg-[#1e3a5f] text-white rounded-2xl p-4 flex items-center shadow-xl">
              <div className="bg-white/20 rounded-xl w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">{cartCount}</div>
              <span className="flex-1 text-left font-semibold">View Cart</span>
              <span className="font-bold">{formatCurrency(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── ALL DRAWERS ── */}
      {drawer !== 'none' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50"
            onClick={() => (drawer !== 'show-otp' || session) && setDrawer('none')} />

          <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* CART */}
            {drawer === 'cart' && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
                  <button onClick={() => setDrawer('none')} className="p-2 hover:bg-gray-100 rounded-xl">
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  {cart.map(c => (
                    <div key={c.menu_item.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{c.menu_item.name}</p>
                        <p className="text-sm text-red-500 font-medium">{formatCurrency(c.menu_item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeFromCart(c.menu_item.id)} className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <Minus className="w-4 h-4 text-gray-800" />
                        </button>
                        <span className="w-6 text-center font-bold text-gray-900">{c.quantity}</span>
                        <button onClick={() => addToCart(c.menu_item)} className="w-8 h-8 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="w-16 text-right font-bold text-gray-900">{formatCurrency(c.menu_item.price * c.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600 font-medium">Total</span>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(cartTotal)}</span>
                  </div>
                  <Button size="lg" className="w-full bg-[#1e3a5f] hover:bg-[#16304d]" onClick={handlePlaceOrderClick}>
                    <ShoppingCart className="w-5 h-5 mr-2" /> Place Order
                  </Button>
                </div>
              </>
            )}

            {/* CUSTOMER INFO */}
            {drawer === 'customer-info' && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Your Details</h2>
                  <button onClick={() => setDrawer('cart')} className="p-2 hover:bg-gray-100 rounded-xl">
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-gray-400 text-sm">We'll generate an OTP for your order</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] placeholder:text-gray-400"
                        placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" maxLength={10}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] placeholder:text-gray-400"
                        placeholder="Enter phone number" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                  </div>
                  <Button size="lg" className="w-full bg-[#1e3a5f] hover:bg-[#16304d]" loading={placing} onClick={handleCreateSession}>
                    Get OTP
                  </Button>
                </div>
              </>
            )}

            {/* SHOW OTP */}
            {drawer === 'show-otp' && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Your OTP</h2>
                    <p className="text-gray-400 text-sm mt-0.5">Share with others at your table</p>
                  </div>
                  {session && (
                    <button onClick={() => setDrawer('none')} className="p-2 hover:bg-gray-100 rounded-xl">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                </div>
                <div className="p-5 space-y-4 text-center">
                  <div className="bg-[#1e3a5f]/5 border-2 border-[#1e3a5f]/20 rounded-2xl p-6">
                    <p className="text-xs text-[#1e3a5f]/50 font-medium mb-2">OTP Code</p>
                    <p className="text-5xl font-bold tracking-widest text-[#1e3a5f]">{generatedOtp}</p>
                    <p className="text-xs text-[#1e3a5f]/50 mt-3">Share this with others at your table</p>
                  </div>
                  {otpError && <p className="text-red-500 text-sm text-center">{otpError}</p>}
                  <Button size="lg" className="w-full bg-[#1e3a5f] hover:bg-[#16304d]" loading={placing}
                    onClick={() => session && placeOrder(session, currentCustomerName)}>
                    Confirm & Place Order
                  </Button>
                </div>
              </>
            )}

            {/* VERIFY OTP */}
            {drawer === 'verify-otp' && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Enter OTP</h2>
                  <button onClick={() => setDrawer('none')} className="p-2 hover:bg-gray-100 rounded-xl">
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3 bg-purple-50 rounded-xl p-4">
                    <KeyRound className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-purple-700">
                      Table already has an active order. Ask{' '}
                      <span className="font-semibold">{session?.customer_name || 'the first customer'}</span>
                      {' '}for their OTP.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] placeholder:text-gray-400"
                        placeholder="Enter your name"
                        value={guestName} onChange={e => setGuestName(e.target.value)} />
                    </div>
                  </div>
                  <input type="number"
                    className="w-full text-center text-4xl font-bold tracking-widest py-4 border-2 border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] placeholder:text-gray-300"
                    placeholder="------" maxLength={6}
                    value={otpInput} onChange={e => setOtpInput(e.target.value.slice(0, 6))} />
                  {otpError && <p className="text-red-500 text-sm text-center">{otpError}</p>}
                  <Button size="lg" className="w-full bg-[#1e3a5f] hover:bg-[#16304d]" loading={placing} onClick={handleVerifyOtp}>
                    Verify & Place Order
                  </Button>
                </div>
              </>
            )}

            {/* ORDERS PAGE */}
            {drawer === 'orders' && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Table Orders</h2>
                    <p className="text-gray-400 text-xs mt-0.5">All orders placed at this table</p>
                  </div>
                  <button onClick={() => setDrawer('none')} className="p-2 hover:bg-gray-100 rounded-xl">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  {sessionOrders.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No orders yet</p>
                  ) : sessionOrders.map((order, i) => (
                    <div key={order.id} className="bg-gray-50 rounded-2xl p-4">
                      {/* Order header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center text-[#1e3a5f] font-bold text-xs">
                            {order.customer_name?.[0]?.toUpperCase() || (i + 1)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {order.customer_name || `Order ${i + 1}`}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        {order.status === 'pending' && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            Pending Approval
                          </span>
                        )}
                        {order.status === 'confirmed' && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            Confirmed ✓
                          </span>
                        )}
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        {order.items?.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.menu_item?.name}{item.quantity > 1 && <span className="font-semibold text-[#1e3a5f]"> ×{item.quantity}</span>}
                            </span>
                            <span className="text-gray-600 font-medium">{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Order total */}
                      <div className="border-t border-gray-200 mt-3 pt-2 flex justify-between text-sm font-bold">
                        <span className="text-gray-700">Order Total</span>
                        <span className="text-red-500">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grand Total + Bill Button */}
                <div className="p-5 border-t border-gray-100 bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-900 text-lg">Grand Total</span>
                    <span className="text-2xl font-bold text-[#1e3a5f]">{formatCurrency(sessionTotal)}</span>
                  </div>

                  {billRequested ? (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                      <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-green-800 text-sm">Bill Requested!</p>
                        <p className="text-green-600 text-xs">Staff will bring your bill shortly.</p>
                      </div>
                    </div>
                  ) : canRequestBill ? (
                    <Button size="lg" variant="outline" className="w-full border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                      onClick={() => setShowBillConfirm(true)}>
                      <FileText className="w-5 h-5 mr-2" /> Ask for Bill
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                      <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                      <p className="text-gray-500 text-sm">Bill available once your order is accepted by staff.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bill Confirmation Popup */}
      {showBillConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBillConfirm(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-[#1e3a5f]" />            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Request Bill?</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to request the bill?{' '}
              <span className="font-medium text-gray-600">Grand Total: {formatCurrency(sessionTotal)}</span>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowBillConfirm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" loading={requestingBill} onClick={requestBill}>
                Yes, Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
