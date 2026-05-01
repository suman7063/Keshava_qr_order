'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MenuItem, MenuCategory, CartItem, TableSession } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { ShoppingCart, Plus, Minus, ChevronDown, Leaf, CheckCircle, Clock, Phone, User, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Step = 'menu' | 'customer-info' | 'show-otp' | 'verify-otp' | 'success'

export default function TablePage() {
  const params = useParams()
  const tableId = params.tableId as string

  const [step, setStep] = useState<Step>('menu')
  const [session, setSession] = useState<TableSession | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)

  // Forms
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('') // sirf testing ke liye
  const [otpError, setOtpError] = useState('')

  useEffect(() => {
    async function load() {
      const [catRes, itemRes] = await Promise.all([
        fetch('/api/menu-categories'),
        fetch('/api/menu-items'),
      ])
      const cats = await catRes.json()
      const items = await itemRes.json()
      setCategories(cats)
      setMenuItems(items)
      if (cats.length > 0) setActiveCategory(cats[0].id)
      setLoading(false)
    }
    load()
  }, [])

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item.id === item.id)
      if (existing) return prev.map(c => c.menu_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menu_item: item, quantity: 1 }]
    })
  }

  function removeFromCart(itemId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item.id === itemId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter(c => c.menu_item.id !== itemId)
      return prev.map(c => c.menu_item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c)
    })
  }

  function getQuantity(itemId: string) {
    return cart.find(c => c.menu_item.id === itemId)?.quantity || 0
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.menu_item.price * c.quantity, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  // Place Order button click
  async function handlePlaceOrderClick() {
    if (cart.length === 0) return
    setCartOpen(false)

    // Check karo — table par active session hai?
    const res = await fetch(`/api/sessions?table_id=${tableId}`)
    const { session: existing } = await res.json()

    if (existing) {
      // Customer 2 — session hai, OTP verify karo
      setSession(existing)
      setStep('verify-otp')
    } else {
      // Customer 1 — pehla order, info maango
      setStep('customer-info')
    }
  }

  // Customer 1 — session banao + OTP generate karo
  async function handleCreateSession() {
    if (!name || !phone) return
    setPlacing(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, phone, customer_name: name }),
    })
    const data = await res.json()
    setSession(data.session)
    setGeneratedOtp(data.otp) // testing ke liye screen pe dikhao
    setStep('show-otp')
    setPlacing(false)
  }

  // Order place karo (Customer 1 — OTP dekh liya)
  async function placeOrder(sessionData: TableSession) {
    setPlacing(true)
    const items = cart.map(c => ({
      menu_item_id: c.menu_item.id,
      quantity: c.quantity,
      unit_price: c.menu_item.price,
    }))
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionData.id, table_id: tableId, items }),
    })
    if (res.ok) {
      setCart([])
      setStep('success')
      setTimeout(() => setStep('menu'), 4000)
    }
    setPlacing(false)
  }

  // Customer 2 — OTP verify karo phir order place karo
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
      setOtpError('Invalid OTP. Please ask the first customer for their OTP.')
      setPlacing(false)
      return
    }

    await placeOrder(data.session)
  }

  const filteredItems = activeCategory ? menuItems.filter(i => i.category_id === activeCategory) : menuItems

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── STEP: Customer Info (Customer 1) ──
  if (step === 'customer-info') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <User className="w-7 h-7 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your Details</h2>
            <p className="text-gray-400 text-sm mt-1">We'll send an OTP to your phone</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
            <Button size="lg" className="w-full" loading={placing} onClick={handleCreateSession}>
              Get OTP
            </Button>
            <button onClick={() => setStep('menu')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
              ← Back to menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP: Show OTP (Customer 1 — testing) ──
  if (step === 'show-otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone className="w-7 h-7 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">OTP Generated</h2>
          <p className="text-gray-400 text-sm mb-6">
            (Testing mode — OTP shown here. In production this will be sent via SMS)
          </p>
          {/* Testing ke liye OTP screen pe dikha rahe hain */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-6">
            <p className="text-xs text-orange-400 font-medium mb-1">Your OTP</p>
            <p className="text-5xl font-bold tracking-widest text-orange-600">{generatedOtp}</p>
            <p className="text-xs text-orange-400 mt-2">Share this with others at your table</p>
          </div>
          <Button size="lg" className="w-full" loading={placing} onClick={() => session && placeOrder(session)}>
            Confirm & Place Order
          </Button>
        </div>
      </div>
    )
  }

  // ── STEP: Verify OTP (Customer 2) ──
  if (step === 'verify-otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-purple-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Enter OTP</h2>
            <p className="text-gray-400 text-sm mt-1">
              This table already has an active order.{' '}
              <span className="font-medium text-gray-600">Ask the first customer for their OTP.</span>
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="number"
              className="w-full text-center text-3xl font-bold tracking-widest py-4 border-2 border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder:text-gray-300"
              placeholder="------"
              maxLength={6}
              value={otpInput}
              onChange={e => setOtpInput(e.target.value.slice(0, 6))}
            />
            {otpError && (
              <p className="text-red-500 text-sm text-center">{otpError}</p>
            )}
            <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700" loading={placing} onClick={handleVerifyOtp}>
              Verify & Place Order
            </Button>
            <button onClick={() => setStep('menu')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
              ← Back to menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP: Success ──
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-400">Kitchen has received your order and is preparing it.</p>
        </div>
      </div>
    )
  }

  // ── STEP: Menu ──
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-linear-to-br from-orange-500 to-red-500 text-white px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto">
          <p className="text-orange-100 text-sm font-medium">Welcome to</p>
          <h1 className="text-2xl font-bold mt-1">The QR Kitchen</h1>
          <p className="text-orange-100 mt-1">Table {tableId.slice(-4)}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
        <div className="max-w-lg mx-auto overflow-x-auto">
          <div className="flex gap-1 px-4 py-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  activeCategory === cat.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
        {filteredItems.filter(i => i.is_available).map(item => {
          const qty = getQuantity(item.id)
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h3 className="font-semibold text-gray-900 leading-tight">{item.name}</h3>
                  {item.is_vegetarian && <Leaf className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                </div>
                {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-lg font-bold text-orange-600">{formatCurrency(item.price)}</span>
                  {item.prep_time_minutes && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> {item.prep_time_minutes}m
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-center justify-center">
                {qty === 0 ? (
                  <button onClick={() => addToCart(item)} className="w-9 h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm">
                    <Plus className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
                      <Minus className="w-4 h-4 text-gray-700" />
                    </button>
                    <span className="w-6 text-center font-bold text-gray-900">{qty}</span>
                    <button onClick={() => addToCart(item)} className="w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart Bottom Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setCartOpen(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-4 flex items-center shadow-lg transition-colors">
              <div className="bg-orange-400 rounded-xl w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">{cartCount}</div>
              <span className="flex-1 text-left font-semibold">View Cart</span>
              <span className="font-bold">{formatCurrency(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              {cart.map(c => (
                <div key={c.menu_item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{c.menu_item.name}</p>
                    <p className="text-sm text-orange-600">{formatCurrency(c.menu_item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(c.menu_item.id)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold">{c.quantity}</span>
                    <button onClick={() => addToCart(c.menu_item)} className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="w-20 text-right font-semibold">{formatCurrency(c.menu_item.price * c.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(cartTotal)}</span>
              </div>
              <Button size="lg" className="w-full" onClick={handlePlaceOrderClick}>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Place Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
