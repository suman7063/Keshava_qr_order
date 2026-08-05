'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function destForRoles(roles: { role: string }[]): string | null {
  if (roles.some(r => r.role === 'superadmin')) return '/superadmin'
  if (roles.some(r => r.role === 'admin')) return '/admin'
  if (roles.some(r => r.role === 'manager')) return '/manager'
  return null
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  // Same account system for both — the tabs are visual clarity only;
  // after login everyone is routed by their real role.
  const [role, setRole] = useState<'owner' | 'manager'>(
    searchParams.get('role') === 'manager' ? 'manager' : 'owner'
  )

  const theme = role === 'manager'
    ? { icon: 'bg-slate-800', btn: 'bg-slate-800 hover:bg-slate-900', ring: 'focus:ring-slate-600', border: 'border-t-slate-800' }
    : { icon: 'bg-orange-500', btn: 'bg-orange-500 hover:bg-orange-600', ring: 'focus:ring-orange-400', border: 'border-t-orange-500' }

  // Already logged in? Send them to the right place.
  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') setError('You don’t have access to that area.')
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
      const dest = destForRoles(data || [])
      if (dest) router.replace(dest)
    })
  }, [searchParams, router])

  async function handleResend() {
    setResendMsg('')
    const supabase = createClient()
    const { error: e } = await supabase.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    setResendMsg(e ? 'Could not resend. Try again.' : 'Verification email sent! Check your inbox.')
  }

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setNeedsVerify(false); setResendMsg('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      const notConfirmed = authError.code === 'email_not_confirmed' || /not confirmed/i.test(authError.message)
      if (notConfirmed) { setNeedsVerify(true); setError('Your email isn’t verified yet. Check your inbox for the confirmation link.') }
      else setError('Incorrect email or password.')
      setLoading(false); return
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id)
    const dest = destForRoles(roles || [])
    if (!dest) {
      await supabase.auth.signOut()
      setError('This account is not linked to any restaurant.')
      setLoading(false); return
    }
    router.push(dest)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className={`bg-white rounded-2xl border border-gray-100 border-t-4 ${theme.border} shadow-xl w-full max-w-sm p-8 transition-colors`}>
        <div className="text-center mb-5">
          <div className={`w-12 h-12 ${theme.icon} rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors`}>
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{role === 'manager' ? 'Manager Login' : 'Owner Login'}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {role === 'manager' ? 'Orders, kitchen & bill requests' : 'Manage your restaurant on bicres'}
          </p>
        </div>

        {/* Who's logging in? */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-6">
          <button type="button" onClick={() => setRole('owner')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${role === 'owner' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            🏪 Owner
          </button>
          <button type="button" onClick={() => setRole('manager')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${role === 'manager' ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            👨‍🍳 Manager
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent`} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {needsVerify && (
            <button type="button" onClick={handleResend}
              className="w-full text-sm font-medium text-blue-700 hover:text-blue-800 border border-blue-100 rounded-xl py-2.5 hover:bg-blue-50 transition-colors">
              Resend verification email
            </button>
          )}
          {resendMsg && <p className={`text-sm text-center ${resendMsg.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>{resendMsg}</p>}

          <Button type="submit" size="lg" className={`w-full ${theme.btn}`} loading={loading}>
            {role === 'manager' ? 'Log in as Manager' : 'Log in as Owner'}
          </Button>
        </form>

        <p className="text-center mt-4 text-sm">
          <Link href="/admin/forgot-password" className="text-gray-400 hover:text-blue-700 hover:underline">Forgot password?</Link>
        </p>
        {role === 'owner' ? (
          <p className="text-center mt-3 text-sm text-gray-400">
            New here?{' '}
            <Link href="/onboard" className="text-orange-600 font-semibold hover:underline">Create your restaurant</Link>
          </p>
        ) : (
          <p className="text-center mt-3 text-xs text-gray-400">
            Manager accounts are created by your restaurant owner — ask them for your login.
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-800" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
