'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QrCode, LayoutDashboard, LogOut, Loader2 } from 'lucide-react'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Real enforcement lives in the middleware; this is just a fast client
    // redirect for a nicer UX.
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/superadmin/login'); return }
      const { data } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id)
      if (!(data || []).some(r => r.role === 'superadmin')) {
        router.replace('/superadmin/login?error=unauthorized')
        return
      }
      setChecking(false)
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/superadmin/login')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-800" />
      </div>
    )
  }

  const navItems = [
    { href: '/superadmin', label: 'Restaurants', icon: LayoutDashboard },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-100 shadow-sm flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
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
              <Link key={item.href} href={item.href}
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
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
