'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QrCode, LayoutDashboard, Store, Activity, LogOut, Loader2, Menu } from 'lucide-react'

const navItems = [
  { href: '/superadmin', label: 'Overview', icon: LayoutDashboard },
  { href: '/superadmin/restaurants', label: 'Restaurants', icon: Store },
  { href: '/superadmin/activity', label: 'Activity', icon: Activity },
]

function SidebarInner({ pathname, onNavigate, onLogout }: {
  pathname: string
  onNavigate: () => void
  onLogout: () => void
}) {
  return (
    <>
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center shrink-0">
            <QrCode className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">bicres</p>
            <p className="text-xs text-gray-400">Super Admin</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-blue-50 text-blue-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className={`w-4 h-4 ${active ? 'text-blue-800' : 'text-gray-400'}`} />
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

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Real enforcement lives in the middleware; this is just a fast client
    // redirect for a nicer UX.
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id)
      if (!(data || []).some(r => r.role === 'superadmin')) {
        router.replace('/login?error=unauthorized')
        return
      }
      setChecking(false)
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-800" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-gray-100 shadow-sm flex-col shrink-0">
        <SidebarInner pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 bg-white shadow-xl flex flex-col z-50">
            <SidebarInner pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="font-bold text-gray-900 text-sm">bicres · Super Admin</p>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  )
}
