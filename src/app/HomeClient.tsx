'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  QrCode, ChefHat, LayoutDashboard, Smartphone,
  BarChart3, UtensilsCrossed, ArrowRight, CheckCircle2,
  FileText, Menu, X, Phone, ScanLine, BookOpen, MapPin, Clock, MessageCircle,
} from 'lucide-react'

// ── Scroll reveal ──────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ── Restaurant Home Page ───────────────────────────────────────────
interface RestaurantData {
  id: string
  name: string
  subdomain: string
  phone: string | null
  address: string | null
  logo_url: string | null
  cover_image_url: string | null
  cover_overlay?: number | null
  maps_url: string | null
  opening_hours: string | null
  accepting_orders: boolean
}

// wa.me needs a country code — Indian 10-digit numbers get 91 prefixed.
function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`
}

function RestaurantHomePage({ restaurant }: { restaurant: RestaurantData }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col">

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {restaurant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.logo_url} alt={restaurant.name}
              className="w-9 h-9 rounded-xl object-cover border border-white/20" />
          ) : (
            <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="font-bold text-white text-lg tracking-tight">{restaurant.name}</span>
        </div>
        {restaurant.phone && (
          <a href={`tel:${restaurant.phone}`}
            className="hidden sm:flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors">
            <Phone className="w-4 h-4" /> {restaurant.phone}
          </a>
        )}
      </nav>

      {/* Hero */}
      <div className="relative flex-1 flex items-center justify-center min-h-screen overflow-hidden">
        {/* Background image */}
        <Image
          src={restaurant.cover_image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=85'}
          alt={restaurant.name}
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay — owner-adjustable "photo layer" (defaults to the old 62%) */}
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(restaurant.cover_overlay ?? 62) / 100})` }} />
        {/* Gradient from bottom */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto py-28">
          {/* Open/closed badge */}
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.7s ease 100ms' }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
              {restaurant.accepting_orders ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" /> Open for dine-in</>
              ) : (
                <><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Currently closed</>
              )}
              {restaurant.opening_hours && (
                <span className="normal-case tracking-normal text-white/55 border-l border-white/20 pl-2 ml-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {restaurant.opening_hours}
                </span>
              )}
            </div>
          </div>

          {/* Restaurant name */}
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(28px)', transition: 'all 0.9s ease 250ms' }}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight mb-6">
              {restaurant.name}
            </h1>
          </div>

          {/* Tagline */}
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease 420ms' }}>
            <p className="text-white/60 text-lg md:text-xl mb-10 font-light">
              Scan the QR code at your table to browse the menu &amp; place your order
            </p>
          </div>

          {/* Primary CTAs */}
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease 520ms' }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <Link href={`/${restaurant.subdomain}/menu`}
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-7 py-3.5 rounded-2xl text-base hover:bg-gray-100 transition-all hover:scale-[1.03] shadow-xl">
              <BookOpen className="w-5 h-5" /> View Menu
            </Link>
            {restaurant.phone && (
              <>
                <a href={`tel:${restaurant.phone}`}
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/25 text-white font-semibold px-6 py-3.5 rounded-2xl text-base hover:bg-white/20 transition-colors">
                  <Phone className="w-4.5 h-4.5" /> Call us
                </a>
                <a href={whatsappLink(restaurant.phone)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl text-base transition-transform hover:scale-[1.03]"
                  style={{ background: '#25D366' }}>
                  <MessageCircle className="w-4.5 h-4.5" /> WhatsApp
                </a>
              </>
            )}
          </div>

          {/* QR scan instruction card */}
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease 620ms' }}>
            <div className="inline-flex flex-col sm:flex-row items-center gap-5 bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl px-8 py-6">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
                <ScanLine className="w-7 h-7 text-gray-900" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-base">How to order</p>
                <p className="text-white/55 text-sm mt-0.5 leading-relaxed">
                  Find the QR code on your table → scan it → browse menu → order
                </p>
              </div>
            </div>
          </div>

          {/* Address + directions */}
          {(restaurant.address || restaurant.maps_url) && (
            <div style={{ opacity: loaded ? 1 : 0, transition: 'all 0.8s ease 720ms' }} className="mt-8">
              <a
                href={restaurant.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/50 text-sm hover:text-white/80 transition-colors max-w-xl">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{restaurant.address || 'Get directions'}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          )}

          {/* Phone (mobile) */}
          {restaurant.phone && (
            <div style={{ opacity: loaded ? 1 : 0, transition: 'all 0.8s ease 780ms' }}
              className="mt-4 sm:hidden">
              <a href={`tel:${restaurant.phone}`}
                className="inline-flex items-center gap-2 text-white/50 text-sm hover:text-white/80 transition-colors">
                <Phone className="w-4 h-4" /> {restaurant.phone}
              </a>
            </div>
          )}
        </div>

        {/* Powered by bicres */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <a href="https://bicres.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/30 text-xs hover:text-white/50 transition-colors">
            <QrCode className="w-3 h-3" /> Powered by bicres.com
          </a>
        </div>
      </div>
    </div>
  )
}

// ── bicres.com Landing Data ────────────────────────────────────────
const FEATURES = [
  {
    icon: QrCode,
    tag: 'Core',
    title: 'Digital QR Menu',
    desc: 'Customers scan the table QR and instantly see your full menu — photos, prices, categories. No app download needed.',
  },
  {
    icon: UtensilsCrossed,
    tag: 'Design',
    title: 'Menu Templates',
    desc: 'Multiple beautiful customer-facing menu layouts. Switch templates anytime from your admin panel.',
  },
  {
    icon: QrCode,
    tag: 'Print',
    title: 'QR Card Templates',
    desc: 'Professionally designed QR table cards. Customize colors and download print-ready files for each table.',
  },
  {
    icon: FileText,
    tag: 'Export',
    title: 'PDF Menu Export',
    desc: 'Export your full menu as a stunning PDF in multiple templates — perfect for print menus and WhatsApp sharing.',
  },
  {
    icon: ChefHat,
    tag: 'Operations',
    title: 'Kitchen Display',
    desc: 'New orders appear live on your kitchen screen the moment a customer places them. No paper, no delays.',
  },
  {
    icon: LayoutDashboard,
    tag: 'Operations',
    title: 'Manager Dashboard',
    desc: 'Real-time table status, active sessions, and order overview — all from one clean manager interface.',
  },
  {
    icon: Smartphone,
    tag: 'Menu',
    title: 'Item Image Upload',
    desc: 'Upload photos for every menu item. Customers see real images before ordering, boosting order value.',
  },
  {
    icon: BarChart3,
    tag: 'Operations',
    title: 'Table & Session Management',
    desc: 'Add tables, generate QR per table, track open/closed sessions, and manage customer flow effortlessly.',
  },
  {
    icon: UtensilsCrossed,
    tag: 'Branding',
    title: 'Your Own URL',
    desc: 'Get bicres.com/yourname — a branded URL for all QR codes, posters, and digital menu sharing.',
  },
]

const STEPS = [
  { n: '01', title: 'Register', desc: 'Create your account and choose a subdomain for your restaurant.' },
  { n: '02', title: 'Add Menu', desc: 'Upload items with photos, prices, and categories.' },
  { n: '03', title: 'Print QR', desc: 'Download and print QR card templates for each table.' },
  { n: '04', title: 'Go Live', desc: 'Customers scan and order — kitchen gets notified instantly.' },
]

const PLANS = [
  {
    name: 'Starter', price: 'Free', period: 'forever', highlight: false,
    features: ['1 restaurant', 'Up to 10 tables', 'Digital QR menu', 'QR card templates', 'Basic analytics'],
  },
  {
    name: 'Pro', price: '₹499', period: 'per month', highlight: true,
    features: ['1 restaurant', 'Unlimited tables', 'All menu templates', 'PDF menu export', 'Kitchen display', 'Manager dashboard', 'Priority support'],
  },
  {
    name: 'Enterprise', price: 'Custom', period: 'pricing', highlight: false,
    features: ['Multiple locations', 'Dedicated subdomain', 'Custom integrations', 'SLA guarantee', 'Onboarding support'],
  },
]

// ── Feature cards for hero stack ──────────────────────────────────
const CARD_POSITIONS = [
  { rotate: 0,  tx: 0,  ty: 0,  scale: 1,    z: 5, opacity: 1    },
  { rotate: 6,  tx: 18, ty: 8,  scale: 0.96, z: 4, opacity: 0.85 },
  { rotate: 11, tx: 33, ty: 15, scale: 0.92, z: 3, opacity: 0.70 },
  { rotate: 16, tx: 46, ty: 21, scale: 0.88, z: 2, opacity: 0.55 },
  { rotate: 21, tx: 57, ty: 26, scale: 0.84, z: 1, opacity: 0.40 },
]

const FEATURE_CARDS = [
  // ── 1. Customer QR Menu ──────────────────────────────────────────
  {
    dotColor: '#1e3a5f',
    render: () => (
      <div className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#f8fafc' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2a4a 100%)' }} className="px-4 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-white font-black text-sm tracking-wider uppercase">The QR Kitchen</p>
              <p className="text-blue-300 text-[10px] mt-0.5 font-medium">Table T1 · 2 guests</p>
            </div>
            <div className="w-8 h-8 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <QrCode className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="bg-white border-b border-gray-100 px-3 flex gap-0.5 shrink-0">
          {['Starters', 'Mains', 'Desserts', 'Drinks'].map((c, i) => (
            <span key={c} className={`py-2.5 text-[9px] font-black uppercase tracking-wider border-b-2 px-2 ${i === 0 ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-300'}`}>{c}</span>
          ))}
        </div>
        {/* Items */}
        <div className="flex-1 p-2.5 grid grid-cols-2 gap-2 overflow-hidden">
          {[
            { name: 'Garlic Bread', price: '₹199', img: 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?w=200&h=120&fit=crop&q=80' },
            { name: 'Caesar Salad', price: '₹299', img: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=200&h=120&fit=crop&q=80' },
            { name: 'Paneer Tikka', price: '₹399', img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200&h=120&fit=crop&q=80' },
            { name: 'Cold Coffee', price: '₹149', img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=120&fit=crop&q=80' },
          ].map(item => (
            <div key={item.name} className="bg-white rounded-xl overflow-hidden border border-gray-100 flex flex-col" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.img} alt={item.name} className="h-14 w-full object-cover shrink-0" />
              <div className="p-1.5 flex-1">
                <p className="font-black text-gray-900 text-[9px] leading-tight">{item.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-red-500 text-[10px] font-black">{item.price}</span>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#1e3a5f' }}>
                    <span className="text-white text-[10px] font-bold leading-none">+</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Cart bar */}
        <div className="mx-2.5 mb-2.5 shrink-0 rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: '#1e3a5f' }}>
          <div>
            <p className="text-white text-[9px] font-black">2 items</p>
            <p className="text-blue-300 text-[8px]">₹398 total</p>
          </div>
          <span className="text-white text-[9px] font-black bg-white/20 px-2.5 py-1 rounded-lg">View Cart →</span>
        </div>
      </div>
    ),
  },
  // ── 2. Manager Dashboard ─────────────────────────────────────────
  {
    dotColor: '#f97316',
    render: () => (
      <div className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#0d1829' }}>
        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 shrink-0 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-[10px] text-white" style={{ background: '#f97316' }}>A</div>
              <div>
                <p className="text-white text-[10px] font-bold">Manager View</p>
                <p className="text-white/30 text-[8px]">Live · 3 active tables</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: '#f97316' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> New Orders (3)
            </span>
            {['Bills', 'History'].map(t => (
              <span key={t} className="text-white/30 text-[9px] px-2 py-1 rounded-full border border-white/10">{t}</span>
            ))}
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2.5 shrink-0">
          {[
            { label: 'Orders', val: '12', color: '#f97316' },
            { label: 'Revenue', val: '₹4.2k', color: '#22c55e' },
            { label: 'Tables', val: '3/8', color: '#60a5fa' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="font-black text-xs" style={{ color: s.color }}>{s.val}</p>
              <p className="text-white/30 text-[8px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Orders */}
        <div className="flex-1 px-3 pb-3 space-y-2 overflow-hidden">
          {[
            { table: 'T2', items: 'Paneer Tikka ×2, Naan ×3', total: '₹680', color: '#f97316' },
            { table: 'T4', items: 'Dal Makhani, Roti ×2', total: '₹340', color: '#f97316' },
            { table: 'T6', items: 'Biryani ×1, Raita', total: '₹420', color: '#f97316' },
          ].map(o => (
            <div key={o.table} className="rounded-xl p-2.5 border border-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black text-white" style={{ background: '#1e3a5f' }}>{o.table}</div>
                  <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">NEW</span>
                </div>
                <span className="font-black text-[10px]" style={{ color: o.color }}>{o.total}</span>
              </div>
              <p className="text-white/35 text-[9px] truncate">{o.items}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // ── 3. PDF Templates ─────────────────────────────────────────────
  {
    dotColor: '#f97316',
    render: () => (
      <div className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden bg-white">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
          <div>
            <p className="font-black text-gray-900 text-sm">PDF Menu Export</p>
            <p className="text-gray-400 text-[10px] mt-0.5">5 premium templates</p>
          </div>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
            <FileText className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
          </div>
        </div>
        {/* Template grid */}
        <div className="flex-1 p-3 grid grid-cols-2 gap-2 overflow-hidden">
          {[
            { name: 'Classic White', accent: '#f97316', bg: '#fff', dark: false, selected: true },
            { name: 'Dark Elegant', accent: '#eab308', bg: '#111827', dark: true, selected: false },
            { name: 'Wavy Green', accent: '#10b981', bg: '#ecfdf5', dark: false, selected: false },
            { name: 'Rustic Wood', accent: '#ef4444', bg: '#292524', dark: true, selected: false },
            { name: 'Dark Street', accent: '#f97316', bg: '#1c1917', dark: true, selected: false },
          ].map(t => (
            <div key={t.name}
              className="rounded-xl p-2.5 flex flex-col justify-between min-h-[62px] relative overflow-hidden"
              style={{
                background: t.bg,
                border: t.selected ? `2px solid ${t.accent}` : '2px solid transparent',
                boxShadow: t.selected ? `0 0 0 3px ${t.accent}22` : '0 1px 4px rgba(0,0,0,0.08)',
              }}>
              {t.selected && (
                <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: t.accent }}>
                  <span className="text-white text-[7px] font-black">✓</span>
                </div>
              )}
              <div className="space-y-1">
                <div className="h-1.5 rounded-full w-3/4" style={{ background: t.accent }} />
                <div className="h-px rounded w-full" style={{ background: t.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                <div className="h-px rounded w-1/2" style={{ background: t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
                <div className="h-px rounded w-2/3" style={{ background: t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
              </div>
              <p className={`text-[8px] font-bold mt-1.5 ${t.dark ? 'text-white/50' : 'text-gray-400'}`}>{t.name}</p>
            </div>
          ))}
        </div>
        {/* Download button */}
        <div className="px-3 pb-3 shrink-0">
          <div className="text-white text-[10px] font-black text-center py-2.5 rounded-xl flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
            <FileText className="w-3 h-3" /> Download PDF Menu
          </div>
        </div>
      </div>
    ),
  },
  // ── 4. QR Card Templates ─────────────────────────────────────────
  {
    dotColor: '#a78bfa',
    render: () => (
      <div className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden bg-white">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
          <div>
            <p className="font-black text-gray-900 text-sm">QR Card Templates</p>
            <p className="text-gray-400 text-[10px] mt-0.5">Print-ready table cards</p>
          </div>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#f5f3ff' }}>
            <QrCode className="w-3.5 h-3.5 text-violet-500" />
          </div>
        </div>
        {/* Template options */}
        <div className="px-3 pt-2.5 grid grid-cols-2 gap-2 shrink-0">
          {[
            { label: 'Orange Pop', bg: '#fff7ed', accent: '#f97316', selected: true },
            { label: 'Midnight', bg: '#1e1b4b', accent: '#818cf8', selected: false, dark: true },
            { label: 'Sage Green', bg: '#f0fdf4', accent: '#16a34a', selected: false },
            { label: 'Warm Sand', bg: '#fefce8', accent: '#ca8a04', selected: false },
          ].map(t => (
            <div key={t.label}
              className="rounded-xl p-2.5 flex items-center gap-2"
              style={{
                background: t.bg,
                border: t.selected ? `2px solid ${t.accent}` : '1px solid rgba(0,0,0,0.06)',
                boxShadow: t.selected ? `0 0 0 3px ${t.accent}22` : 'none',
              }}>
              <div className="w-5 h-5 rounded-full shrink-0 shadow-sm" style={{ background: t.accent }} />
              <span className="text-[9px] font-bold" style={{ color: t.dark ? 'rgba(255,255,255,0.7)' : '#374151' }}>{t.label}</span>
            </div>
          ))}
        </div>
        {/* Preview card */}
        <div className="flex-1 mx-3 mt-2.5 mb-3 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2.5 p-3 relative"
          style={{ background: 'linear-gradient(135deg,#f97316 0%,#e05c00 100%)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '12px 12px' }} />
          <div className="relative">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
              <QrCode className="w-11 h-11 text-gray-900" />
            </div>
          </div>
          <div className="text-center relative">
            <p className="text-white font-black text-[11px] tracking-wide">THE QR KITCHEN</p>
            <p className="text-white/60 text-[9px] mt-0.5 font-medium">Table T1 · Scan to order</p>
          </div>
        </div>
      </div>
    ),
  },
  // ── 5. Menu Templates ────────────────────────────────────────────
  {
    dotColor: '#60a5fa',
    render: () => (
      <div className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#f8fafc' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 shrink-0 flex items-center justify-between">
          <div>
            <p className="font-black text-gray-900 text-sm">Menu Templates</p>
            <p className="text-gray-400 text-[10px] mt-0.5">Customer-facing styles</p>
          </div>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-blue-50">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>
        {/* Template list */}
        <div className="flex-1 p-3 space-y-2 overflow-hidden">
          {[
            { name: 'Navy Classic', sub: 'Bold & elegant', hdr: '#1e3a5f', chip: '#ef4444', active: true },
            { name: 'Dark Elegance', sub: 'Upscale dining', hdr: '#0d0d1a', chip: '#c9a84c', active: false },
            { name: 'Fresh Emerald', sub: 'Vibrant & modern', hdr: '#064e3b', chip: '#059669', active: false },
            { name: 'Warm Rose', sub: 'Cozy & inviting', hdr: '#881337', chip: '#e11d48', active: false },
          ].map(t => (
            <div key={t.name}
              className="bg-white rounded-xl overflow-hidden flex items-stretch"
              style={{
                border: t.active ? '2px solid #3b82f6' : '1px solid #f1f5f9',
                boxShadow: t.active ? '0 4px 12px rgba(59,130,246,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
              <div className="w-2.5 shrink-0" style={{ background: t.hdr }} />
              <div className="flex-1 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-900">{t.name}</p>
                  {t.active
                    ? <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">Active</span>
                    : <span className="text-[8px] text-gray-300 font-medium">Apply</span>
                  }
                </div>
                <p className="text-gray-400 text-[9px] mt-0.5">{t.sub}</p>
                <div className="flex gap-1 mt-1.5 items-center">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: t.hdr }} />
                  <div className="h-1 rounded-full flex-1 bg-gray-100" />
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.chip }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div className="px-3 pb-3 shrink-0">
          <div className="text-white text-[10px] font-black text-center py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)' }}>
            Switch Template →
          </div>
        </div>
      </div>
    ),
  },
]

// ── Main Client Component ──────────────────────────────────────────
export interface HomeClientProps {
  restaurant: RestaurantData | null
}

export default function HomeClient({ restaurant }: HomeClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [frontCard, setFrontCard] = useState(0)
  const [featureIdx, setFeatureIdx] = useState(0)
  const featureIdxRef = useRef(0)
  const featureCarouselRef = useRef<HTMLDivElement>(null)
  const [planIdx, setPlanIdx] = useState(1)
  const pricingCarouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setFrontCard(f => (f + 1) % FEATURE_CARDS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const scrollToFeature = (i: number) => {
    const el = featureCarouselRef.current
    if (!el) return
    const card = el.children[i] as HTMLElement
    if (card) el.scrollTo({ left: card.offsetLeft - 24, behavior: 'smooth' })
    featureIdxRef.current = i
    setFeatureIdx(i)
  }

  // Sync dot index with scroll position
  useEffect(() => {
    const el = featureCarouselRef.current
    if (!el) return
    const onScroll = () => {
      const children = Array.from(el.children) as HTMLElement[]
      let closest = 0, minDiff = Infinity
      children.forEach((child, i) => {
        const diff = Math.abs(child.offsetLeft - 24 - el.scrollLeft)
        if (diff < minDiff) { minDiff = diff; closest = i }
      })
      featureIdxRef.current = closest
      setFeatureIdx(closest)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-scroll feature carousel on mobile
  useEffect(() => {
    const el = featureCarouselRef.current
    if (!el) return
    let paused = false
    const tick = () => {
      if (paused) return
      const next = (featureIdxRef.current + 1) % FEATURES.length
      scrollToFeature(next)
    }
    const pause = () => { paused = true }
    const resume = () => { paused = false }
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('touchend', resume, { passive: true })
    const timer = setInterval(tick, 2500)
    return () => {
      clearInterval(timer)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('touchend', resume)
    }
  }, []) // scrollToFeature is stable (uses refs only)

  // Restaurant subdomain → show restaurant home page
  if (restaurant) {
    return <RestaurantHomePage restaurant={restaurant} />
  }

  // Main bicres.com landing page
  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVIGATION ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/bicres-logo.png" alt="bicres" width={160} height={48} className="h-12 md:h-16 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#demo" className="hover:text-gray-900 transition-colors">Demo</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <Link href="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/onboard"
              className="flex items-center gap-1.5 bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <button onClick={() => setMobileOpen(v => !v)} className="md:hidden p-1 text-gray-600">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-6 py-4 space-y-3">
            {['#features', '#how-it-works', '#pricing'].map(href => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)}
                className="block text-gray-600 text-sm hover:text-gray-900 py-1 capitalize">
                {href.slice(1).replace('-', ' ')}
              </a>
            ))}
            <Link href="/contact" onClick={() => setMobileOpen(false)}
              className="block text-gray-600 text-sm hover:text-gray-900 py-1">
              Contact
            </Link>
            <Link href="/onboard" className="block bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg text-center">
              Get Started →
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white py-6 md:py-0 px-4 sm:px-6 flex items-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* Subtle background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[100px] opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #1e40af 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-20 items-center py-4">

          {/* Left: text */}
          <div>
            <div style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.7s ease 100ms' }}>
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold px-3 py-2 rounded-full mb-7 uppercase tracking-wider whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                QR Ordering Platform for Restaurants
              </div>
            </div>

            <div style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.8s ease 250ms' }}>
              <h1 className="text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6">
                Give every table<br />
                <span className="relative">
                  <span className="text-blue-800">a digital menu</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 8" fill="none">
                    <path d="M0 6 Q75 0 150 4 Q225 8 300 2" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3"/>
                  </svg>
                </span>
              </h1>
            </div>

            <div style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease 400ms' }}>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
                Register → add your menu → print QR cards → go live. Customers order from their phone, your kitchen sees orders instantly.
              </p>
            </div>

            <div style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.8s ease 530ms' }}
              className="flex flex-row  items-start gap-3 mb-6 sm:mb-8">
              <Link href="/onboard"
                className="flex items-center gap-1 sm:gap-2 bg-blue-800 text-white font-semibold px-4 py-2 sm:px-7 sm:py-4 rounded-xl  text-base hover:bg-blue-900 transition-all hover:scale-[1.03] shadow-lg shadow-blue-200/60">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#features"
                className="flex items-center gap-1 sm:gap-2 text-gray-500 font-semibold px-2 py-2 sm:px-7 sm:py-4 rounded-xl text-base hover:text-gray-900 transition-colors">
                See features <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div style={{ opacity: heroLoaded ? 1 : 0, transition: 'opacity 0.8s ease 680ms' }}
              className="flex flex-wrap gap-2 sm:gap-5 text-base sm:text-sm text-gray-400">
              {['No app needed', 'Ready in 2 min', 'Free to start', 'Your own URL'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Welspun-style stacked rotating cards */}
          <div style={{ opacity: heroLoaded ? 1 : 0, transition: 'opacity 1.2s ease 600ms' }}
            className="relative flex items-start justify-left sm:justify-center pt-0 sm:pt-8 pb-20 lg:pt-0 lg:pb-16">
            <div className="relative w-[300px] h-[400px] lg:w-[380px] lg:h-[500px]">
              {FEATURE_CARDS.map((card, i) => {
                const pos = (i - frontCard + FEATURE_CARDS.length) % FEATURE_CARDS.length
                const t = CARD_POSITIONS[pos]
                return (
                  <div key={i}
                    className="absolute inset-0 rounded-2xl overflow-hidden"
                    style={{
                      transform: `rotate(${t.rotate}deg) translateX(${t.tx}px) translateY(${t.ty}px) scale(${t.scale})`,
                      zIndex: t.z,
                      opacity: t.opacity,
                      transition: 'all 1.1s cubic-bezier(0.34, 1.15, 0.64, 1)',
                      transformOrigin: 'bottom left',
                      boxShadow: pos === 0 ? '0 28px 60px rgba(0,0,0,0.25)' : '0 8px 20px rgba(0,0,0,0.12)',
                    }}>
                    {card.render()}
                  </div>
                )
              })}
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {FEATURE_CARDS.map((card, i) => (
                <button key={i} onClick={() => setFrontCard(i)}
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: frontCard === i ? '22px' : '6px',
                    height: '6px',
                    background: frontCard === i ? card.dotColor : '#d1d5db',
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-blue-800 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '100+', label: 'Restaurants' },
            { num: '50K+', label: 'Orders Served' },
            { num: '99.9%', label: 'Uptime' },
            { num: '< 2 min', label: 'Setup Time' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="text-3xl font-bold text-white">{s.num}</div>
              <div className="text-blue-300 text-sm mt-1">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-8 sm:py-10 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-left sm:text-center mb-4 sm:mb-8">
              <p className="text-blue-700 text-xs font-bold uppercase tracking-widest mb-3">What you get</p>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Every tool your restaurant needs</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                QR menus · menu templates · QR card templates · PDF export · kitchen display · manager dashboard
              </p>
            </div>
          </Reveal>
        </div>

        {/* Mobile: horizontal carousel — Desktop: 3-col grid */}
        <div
          ref={featureCarouselRef}
          className="flex md:grid md:grid-cols-3 items-stretch gap-4 md:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none px-6 md:px-0 md:max-w-6xl md:mx-auto pb-2 md:pb-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {FEATURES.map((f, i) => (
            <div key={f.title} className="shrink-0 w-[78vw] sm:w-[52vw] md:w-auto snap-start flex">
              <Reveal delay={i * 60} className="h-full w-full">
                <div className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-xl hover:border-blue-100 hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-800 transition-colors duration-300 shrink-0">
                      <f.icon className="w-5 h-5 text-blue-800 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed flex-1">{f.desc}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>

        {/* Dots + Arrows — mobile only */}
        <div className="flex md:hidden items-center justify-center gap-4 mt-5 px-6">
          <button
            onClick={() => scrollToFeature((featureIdx - 1 + FEATURES.length) % FEATURES.length)}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-blue-800 hover:text-white transition-colors shrink-0"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>

          <div className="flex items-center gap-1.5">
            {FEATURES.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToFeature(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: featureIdx === i ? '20px' : '6px',
                  height: '6px',
                  background: featureIdx === i ? '#1e40af' : '#d1d5db',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => scrollToFeature((featureIdx + 1) % FEATURES.length)}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-blue-800 hover:text-white transition-colors shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── PRODUCT DEMO VIDEO (Welspun style) ── */}
      <section id="demo" className="bg-white overflow-hidden py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">

          {/* Tag */}
          <Reveal>
            <p className="text-blue-800 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="font-black">✦</span> Product Demo
            </p>
          </Reveal>

          {/* Two column layout */}
          <div className="grid lg:grid-cols-[42%_58%] gap-0 items-start">

            {/* LEFT: heading + dark card */}
            <div className="flex flex-col">
              <Reveal delay={100}>
                <h2 className="text-4xl font-bold text-gray-900 leading-tight mb-4 sm:mb-8">
                  See bicres in action
                </h2>
              </Reveal>

              {/* Dark card overlaps video (negative right margin on desktop) */}
              <Reveal delay={200}>
                <div className="bg-[#1e2d4a] text-white p-8 lg:p-10 rounded-2xl lg:rounded-r-none relative z-10 shadow-2xl flex flex-col gap-6">
                  <p className="text-white/65 text-sm leading-relaxed">
                    Watch how a restaurant goes from zero to a fully live digital menu — QR codes, kitchen display, manager dashboard — in under 2 minutes.
                  </p>
                  <div className="space-y-3">
                    {[
                      'Setup menu with photos & prices',
                      'Generate QR codes per table',
                      'Customers scan & order instantly',
                      'Kitchen notified in real time',
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-blue-300 font-black text-[11px] w-5 shrink-0">0{i + 1}</span>
                        <p className="text-white/80 text-sm">{t}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 border-t border-white/10 pt-5 mt-2">
                    <div className="w-9 h-9 border border-white/25 flex items-center justify-center shrink-0">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                    <Link href="/onboard" className="text-white text-xs font-bold uppercase tracking-widest hover:text-blue-300 transition-colors">
                      Get Started Free
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* RIGHT: video */}
            <Reveal delay={120} className="h-full">
              <div className="relative top-4 w-full rounded-2xl lg:rounded-l-none overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
                {/* Replace dQw4w9WgXcQ with your YouTube video ID */}
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="bicres product demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── IMAGE BREAK ── */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80"
          alt="Restaurant" fill className="object-cover"
        />
        <div className="absolute inset-0 bg-blue-900/75 flex items-center justify-center px-6">
          <Reveal>
            <p className="text-2xl md:text-4xl font-bold text-white text-center max-w-3xl leading-snug">
              &ldquo;Bring your restaurant menu alive — no app, no paper, just QR&rdquo;
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-10 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-left sm:text-center mb-10">
              <p className="text-blue-700 text-xs font-bold uppercase tracking-widest mb-3">Process</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Up and running in minutes</h2>
              <p className="text-base md:text-lg text-gray-500">Four simple steps to digitize your restaurant</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="relative bg-gray-50 md:bg-transparent rounded-2xl p-5 md:p-0 text-center">
                  {/* Connector line — desktop only */}
                  {i < 3 && <div className="hidden md:block absolute top-7 left-[58%] w-[84%] h-px bg-blue-100" />}
                  {/* Step number */}
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-800 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4 relative z-10 shadow-lg shadow-blue-100">
                    {s.n}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5 text-sm md:text-base">{s.title}</h3>
                  <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-10 md:py-14 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-left sm:text-center mb-8 md:mb-16">
              <p className="text-blue-700 text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
              <p className="text-base md:text-lg text-gray-500">Start free. Upgrade when you&apos;re ready.</p>
            </div>
          </Reveal>
        </div>

        {/* Mobile: swipeable carousel */}
        <div
          ref={pricingCarouselRef}
          className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4"
          style={{ scrollbarWidth: 'none' }}
          onScroll={() => {
            const el = pricingCarouselRef.current
            if (!el) return
            const children = Array.from(el.children) as HTMLElement[]
            let closest = 0, minDiff = Infinity
            children.forEach((child, i) => {
              const diff = Math.abs(child.offsetLeft - 24 - el.scrollLeft)
              if (diff < minDiff) { minDiff = diff; closest = i }
            })
            setPlanIdx(closest)
          }}
        >
          {PLANS.map((p) => (
            <div key={p.name} className="shrink-0 w-[82vw] snap-center">
              <div className={`relative rounded-2xl p-6 border h-full flex flex-col ${
                p.highlight
                  ? 'bg-blue-800 border-blue-800 shadow-2xl shadow-blue-300'
                  : 'bg-white border-gray-100 shadow-sm'
              }`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap shadow-sm">
                      ★ Most Popular
                    </span>
                  </div>
                )}
                <div className={`text-[11px] font-black uppercase tracking-widest mb-2 mt-1 ${p.highlight ? 'text-blue-200' : 'text-blue-700'}`}>{p.name}</div>
                <div className={`text-4xl font-black mb-0.5 ${p.highlight ? 'text-white' : 'text-gray-900'}`}>{p.price}</div>
                <div className={`text-sm mb-5 ${p.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{p.period}</div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {p.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.highlight ? 'text-amber-300' : 'text-blue-700'}`} />
                      <span className={p.highlight ? 'text-blue-100' : 'text-gray-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/onboard"
                  className={`flex items-center justify-center gap-1.5 font-bold py-3 rounded-xl transition-colors text-sm ${
                    p.highlight ? 'bg-white text-blue-800' : 'bg-blue-800 text-white'
                  }`}>
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile dots */}
        <div className="flex md:hidden justify-center gap-2 mt-4">
          {PLANS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = pricingCarouselRef.current
                const card = el?.children[i] as HTMLElement
                if (card) el?.scrollTo({ left: card.offsetLeft - 24, behavior: 'smooth' })
                setPlanIdx(i)
              }}
              className="rounded-full transition-all duration-300"
              style={{
                width: planIdx === i ? '20px' : '6px',
                height: '6px',
                background: planIdx === i ? '#1e40af' : '#d1d5db',
              }}
            />
          ))}
        </div>

        {/* Desktop: 3-col grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto px-6">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 120}>
              <div className={`rounded-2xl p-8 border transition-all ${
                p.highlight
                  ? 'bg-blue-800 border-blue-800 scale-105 shadow-2xl shadow-blue-200'
                  : 'bg-white border-gray-100 hover:shadow-lg'
              }`}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${p.highlight ? 'text-blue-200' : 'text-blue-700'}`}>{p.name}</div>
                <div className={`text-4xl font-bold mb-1 ${p.highlight ? 'text-white' : 'text-gray-900'}`}>{p.price}</div>
                <div className={`text-sm mb-8 ${p.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{p.period}</div>
                <ul className="space-y-3 mb-8">
                  {p.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.highlight ? 'text-blue-200' : 'text-blue-700'}`} />
                      <span className={p.highlight ? 'text-blue-100' : 'text-gray-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/onboard"
                  className={`flex items-center justify-center gap-1.5 font-semibold py-3 rounded-xl transition-colors ${
                    p.highlight ? 'bg-white text-blue-800 hover:bg-blue-50' : 'bg-blue-800 text-white hover:bg-blue-900'
                  }`}>
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to go digital?</h2>
            <p className="text-lg text-gray-500 mb-10">
              Join restaurants already using bicres — QR menus, kitchen display, PDF export and more.
            </p>
            <Link href="/onboard"
              className="inline-flex items-center gap-2 bg-blue-800 text-white font-semibold px-10 py-4 rounded-xl text-lg hover:bg-blue-900 transition-all hover:scale-105 shadow-lg shadow-blue-100">
              Register Your Restaurant <ArrowRight className="w-5 h-5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-500 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center">
            <Image src="/bicres-logo.png" alt="bicres" width={120} height={36} className="h-9 w-12 w-auto brightness-0 invert" />
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
          <p className="text-sm text-gray-600 text-center">© 2026 bicres.com · All rights reserved</p>
        </div>
      </footer>

      {/* ── WHATSAPP FLOATING BUTTON ── */}
      <a
        href="https://wa.me/916362130218?text=Hi%2C%20I%27m%20interested%20in%20bicres%20QR%20ordering%20for%20my%20restaurant"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-2  right-2 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200"
        style={{ background: '#25D366' }}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.882a.5.5 0 00.61.61l6.044-1.47A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.006-1.373l-.36-.214-3.724.906.924-3.61-.235-.372A9.808 9.808 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
        </svg>
      </a>

    </div>
  )
}
