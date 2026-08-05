'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, UtensilsCrossed, Table2, BarChart3, LogOut, Users, ClipboardList, Menu, Settings, Megaphone, Tags, ChefHat } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/kitchens', label: 'Kitchens', icon: ChefHat },
  { href: '/admin/tables', label: 'Tables', icon: Table2 },
  { href: '/admin/posters', label: 'Posters', icon: Megaphone },
  { href: '/admin/managers', label: 'Managers', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/manager-view', label: 'Manager View', icon: BarChart3 },
]

function SidebarContent({ restaurantName, pathname, onNavigate, onLogout }: {
  restaurantName: string
  pathname: string
  onNavigate: () => void
  onLogout: () => void
}) {
  return (
    <>
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{restaurantName || 'My Restaurant'}</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group ${
                active ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className={`w-4 h-4 transition-colors ${active ? 'text-orange-500' : 'text-gray-400 group-hover:text-orange-500'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <button onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [restaurantName, setRestaurantName] = useState('')

  useEffect(() => {
    fetch('/api/restaurants/current')
      .then(r => r.json())
      .then(r => { if (r?.name) setRestaurantName(r.name) })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-100 shadow-sm flex-col shrink-0">
        <SidebarContent restaurantName={restaurantName} pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white shadow-xl flex flex-col z-50">
            <SidebarContent restaurantName={restaurantName} pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-linear-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-gray-900 text-sm">{restaurantName || 'My Restaurant'}</p>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
