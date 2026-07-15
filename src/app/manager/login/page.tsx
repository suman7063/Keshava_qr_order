'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function ManagerLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setError('You do not have manager access.')
    }
  }, [searchParams])

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    const { data: roleRows } = await supabase
      .from('user_roles').select('role').eq('user_id', data.user.id)

    const hasAccess = (roleRows || []).some(r => ['manager', 'admin', 'superadmin'].includes(r.role))
    if (!hasAccess) {
      await supabase.auth.signOut()
      setError('This account does not have manager access.')
      setLoading(false)
      return
    }

    router.push('/manager')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Login</h1>
          <p className="text-gray-500 text-sm mt-1">Restaurant Manager Panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-400"
                placeholder="Enter email"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-400"
                placeholder="Enter password"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}
          <Button type="submit" size="lg" className="w-full mt-2 bg-purple-600 hover:bg-purple-700" loading={loading}>
            Login as Manager
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-400">
          Are you an admin?{' '}
          <Link href="/admin/login" className="text-orange-500 font-medium hover:underline">Admin Login</Link>
        </p>
      </div>
    </div>
  )
}

export default function ManagerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-purple-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <ManagerLoginForm />
    </Suspense>
  )
}
