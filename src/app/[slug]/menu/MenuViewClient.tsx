'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, QrCode, ScanLine, Search, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { VegMark } from '@/components/ui/VegMark'

interface Restaurant {
  id: string
  name: string
  subdomain: string
  phone: string | null
  logo_url: string | null
  primary_color: string | null
  accepting_orders: boolean
}

interface Category {
  id: string
  name: string
  description: string | null
  display_order: number
}

interface Item {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_vegetarian: boolean
  display_order: number
}

interface Props {
  restaurant: Restaurant
  categories: Category[]
  items: Item[]
}

export default function MenuViewClient({ restaurant, categories, items }: Props) {
  const brand = restaurant.primary_color || '#1e3a5f'
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all')
  const [query, setQuery] = useState('')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? items.filter(i =>
      i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)
    ) : items),
    [items, q]
  )

  // Only show categories that still have items after filtering.
  const sections = categories
    .map(c => ({ category: c, items: filtered.filter(i => i.category_id === c.id) }))
    .filter(s => s.items.length > 0)

  function jumpTo(catId: string | 'all') {
    setActiveCategory(catId)
    if (catId === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="text-white" style={{ background: `linear-gradient(135deg, ${brand} 0%, #0f172a 100%)` }}>
        <div className="max-w-lg mx-auto px-4 pt-5 pb-6">
          <Link href={`/${restaurant.subdomain}`}
            className="inline-flex items-center gap-1.5 text-white/60 text-xs font-medium hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> {restaurant.name}
          </Link>
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt={restaurant.name}
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0" />
            ) : (
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center border border-white/20 shrink-0">
                <QrCode className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black leading-tight">{restaurant.name}</h1>
              <p className="text-white/55 text-xs mt-0.5">Menu · view only</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search dishes…"
              className="w-full bg-white rounded-xl pl-10 pr-9 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Category pills */}
      <nav className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-3 py-2.5 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => jumpTo('all')}
            className="shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors"
            style={activeCategory === 'all'
              ? { background: brand, borderColor: brand, color: '#fff' }
              : { borderColor: '#e5e7eb', color: '#6b7280' }}>
            All
          </button>
          {sections.map(({ category }) => (
            <button key={category.id} onClick={() => jumpTo(category.id)}
              className="shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors"
              style={activeCategory === category.id
                ? { background: brand, borderColor: brand, color: '#fff' }
                : { borderColor: '#e5e7eb', color: '#6b7280' }}>
              {category.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Sections */}
      <main className="max-w-lg mx-auto px-3 pb-32">
        {sections.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🍽</p>
            <p className="text-gray-500 font-medium">
              {q ? `No dishes match “${query}”` : 'The menu is being set up — check back soon.'}
            </p>
          </div>
        )}

        {sections.map(({ category, items: catItems }) => (
          <section key={category.id}
            ref={el => { sectionRefs.current[category.id] = el }}
            className="pt-6 scroll-mt-16">
            <h2 className="font-black text-gray-900 text-lg px-1">{category.name}</h2>
            {category.description && (
              <p className="text-gray-400 text-xs px-1 mt-0.5">{category.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {catItems.map(item => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="relative w-full h-32 bg-gray-100">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill
                        sizes="(max-width: 500px) 50vw, 240px"
                        className="object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-4xl select-none">🍽</div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-start gap-1 mb-0.5">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight flex-1">{item.name}</h3>
                      <VegMark veg={item.is_vegetarian} className="mt-0.5" />
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                    )}
                    <span className="text-sm font-bold text-red-500 mt-auto pt-1.5">{formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Bottom bar: how to order */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <div className="max-w-lg mx-auto px-3 pb-3">
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl text-white" style={{ background: brand }}>
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5" style={{ color: brand }} />
            </div>
            <p className="text-xs leading-snug text-white/90">
              <span className="font-bold text-white">To order:</span> scan the QR code on your table
              {restaurant.accepting_orders ? '' : ' — currently closed'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
