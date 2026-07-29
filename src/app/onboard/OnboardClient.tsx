'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  QrCode, ArrowRight, CheckCircle2, AlertCircle, Loader2,
  Store, Globe, Mail, Phone, ChevronRight, Lock, Eye, EyeOff, RefreshCw
} from 'lucide-react'

type Plan = 'free' | 'pro'

interface FormData {
  name: string
  subdomain: string
  owner_email: string
  phone: string
  plan: Plan
  password: string
  confirmPassword: string
}

const PLANS: { id: Plan; label: string; price: string; perks: string[] }[] = [
  {
    id: 'free',
    label: 'Starter',
    price: 'Free',
    perks: ['Up to 10 tables', 'Up to 50 menu items', 'Digital QR menu', 'QR code download'],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '₹499/mo · 14-day free trial',
    perks: ['Unlimited tables', 'Unlimited menu items', 'Kitchen display', 'Priority support'],
  },
]

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 32)
}

export default function OnboardClient() {
  const [form, setForm] = useState<FormData>({
    name: '', subdomain: '', owner_email: '', phone: '',
    plan: 'free', password: '', confirmPassword: '',
  })
  const [subdomainTouched, setSubdomainTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ email: string; subdomain: string } | null>(null)
  const [resendMsg, setResendMsg] = useState('')
  // Remember the auth user across retries so a failed restaurant-create
  // (e.g. subdomain taken) doesn't strand an orphan signup.
  const [createdUserId, setCreatedUserId] = useState<string | null>(null)
  const [availability, setAvailability] = useState<'unknown' | 'checking' | 'available' | 'taken'>('unknown')

  const subdomainValid = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(form.subdomain) || /^[a-z0-9]{2,32}$/.test(form.subdomain)
  const subdomainError = subdomainTouched && form.subdomain.length > 0 && !subdomainValid
    ? 'Only lowercase letters, numbers, and hyphens. Min 2 characters.'
    : ''
  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword

  // Live subdomain availability check (debounced)
  useEffect(() => {
    if (!form.subdomain || !subdomainValid) { setAvailability('unknown'); return }
    setAvailability('checking')
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/subdomain-check?value=${encodeURIComponent(form.subdomain)}`)
        const data = await res.json()
        setAvailability(data.available ? 'available' : 'taken')
      } catch {
        setAvailability('unknown')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [form.subdomain, subdomainValid])

  function handleNameChange(value: string) {
    setForm(f => ({ ...f, name: value, subdomain: subdomainTouched ? f.subdomain : toSlug(value) }))
  }

  function handleSubdomainChange(value: string) {
    setSubdomainTouched(true)
    setForm(f => ({ ...f, subdomain: toSlug(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subdomainValid || passwordMismatch) return
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (availability === 'taken') {
      setError('This URL is already taken. Please pick another one.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()

    // 1. Create auth user → sends verification email automatically.
    //    On retry (e.g. subdomain was taken) reuse the already-created user.
    let userId = createdUserId
    if (!userId) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.owner_email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: { name: form.name },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // Supabase returns a user with an empty `identities` array when the
      // email is already registered (it won't create a duplicate). Stop here
      // with a clear message instead of a confusing "Invalid user" later.
      if (authData.user && (authData.user.identities?.length ?? 0) === 0) {
        setError('This email is already registered. Please log in instead, or use a different email.')
        setLoading(false)
        return
      }

      userId = authData.user?.id ?? null
      setCreatedUserId(userId)
    }

    // 2. Create restaurant entry
    const res = await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        subdomain: form.subdomain,
        owner_email: form.owner_email,
        phone: form.phone,
        plan: form.plan,
        user_id: userId,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setSuccess({ email: form.owner_email, subdomain: form.subdomain })
    setLoading(false)
  }

  async function handleResend() {
    setResending(true)
    setResendMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: success!.email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    setResendMsg(error ? 'Could not resend. Try again.' : 'Verification email sent!')
    setResending(false)
  }

  // ── Email verification pending screen ─────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
          <p className="text-gray-500 mb-2">We sent a verification link to:</p>
          <p className="font-semibold text-gray-900 mb-6">{success.email}</p>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 mb-6 text-sm text-blue-700">
            Click the link in the email to activate your account, then login.
          </div>

          <div className="bg-gray-50 rounded-xl px-5 py-3 mb-6 text-sm text-gray-600">
            Your menu URL: <span className="font-semibold text-blue-800">bicres.com/{success.subdomain}</span>
          </div>

          {resendMsg && (
            <p className={`text-sm mb-3 ${resendMsg.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>
              {resendMsg}
            </p>
          )}

          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors mb-3 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-blue-800 text-white font-semibold py-3 rounded-xl hover:bg-blue-900 transition-colors"
          >
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>

          <Link href="/" className="block mt-4 text-sm text-gray-400 hover:text-gray-600">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  // ── Registration form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">bicres</span>
          </Link>
          <span className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-800 font-semibold hover:underline">Login</Link>
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register your restaurant</h1>
          <p className="text-gray-500">Set up your digital menu in under 2 minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Restaurant Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-800" /> Restaurant details
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Restaurant name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" required placeholder="e.g. Zara Restaurant"
                value={form.name} onChange={e => handleNameChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your URL <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-800 focus-within:border-transparent transition">
                <span className="bg-gray-50 border-r border-gray-200 px-4 py-3 text-sm text-gray-500 font-medium select-none">
                  bicres.com/
                </span>
                <input
                  type="text" required placeholder="zara"
                  value={form.subdomain} onChange={e => handleSubdomainChange(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
                />
              </div>
              {subdomainError ? (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {subdomainError}
                </p>
              ) : availability === 'taken' ? (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> This URL is already taken.
                </p>
              ) : form.subdomain ? (
                <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Your menu: <span className="font-semibold">bicres.com/{form.subdomain}</span>
                  {availability === 'checking' && <span className="text-gray-400 ml-1">checking…</span>}
                  {availability === 'available' && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
                </p>
              ) : null}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-800" /> Contact details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address <span className="text-red-500">*</span></label>
                <input
                  type="email" required placeholder="owner@restaurant.com"
                  value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone number
                </label>
                <input
                  type="tel" placeholder="9876543210"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-800" /> Set password
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    placeholder="Min 8 characters"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password <span className="text-red-500">*</span></label>
                <input
                  type="password" required placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition ${passwordMismatch ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                />
                {passwordMismatch && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Choose a plan</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {PLANS.map(p => (
                <button key={p.id} type="button" onClick={() => setForm(f => ({ ...f, plan: p.id }))}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${form.plan === p.id ? 'border-blue-800 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{p.label}</span>
                    <span className={`text-sm font-bold ${form.plan === p.id ? 'text-blue-800' : 'text-gray-500'}`}>{p.price}</span>
                  </div>
                  <ul className="space-y-1">
                    {p.perks.map(perk => (
                      <li key={perk} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <ChevronRight className="w-3 h-3 text-blue-800 flex-shrink-0" /> {perk}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.name || !form.subdomain || !form.owner_email || !form.password || !!subdomainError || passwordMismatch || availability === 'taken'}
            className="w-full flex items-center justify-center gap-2 bg-blue-800 text-white font-semibold py-4 rounded-xl text-base hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-100"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Setting up your restaurant…</>
            ) : (
              <><CheckCircle2 className="w-5 h-5" /> Register Restaurant</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            By registering, you agree to our terms of service. No credit card required for the free plan.
          </p>
        </form>
      </div>
    </div>
  )
}
