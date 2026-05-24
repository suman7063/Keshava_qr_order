'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QrCode, ArrowRight, CheckCircle2, AlertCircle, Loader2, Store, Globe, Mail, Phone, ChevronRight } from 'lucide-react'

type Plan = 'free' | 'pro'

interface FormData {
  name: string
  subdomain: string
  owner_email: string
  phone: string
  plan: Plan
}

const PLANS: { id: Plan; label: string; price: string; perks: string[] }[] = [
  {
    id: 'free',
    label: 'Starter',
    price: 'Free',
    perks: ['Up to 10 tables', 'Digital QR menu', 'QR code download'],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '₹999/mo',
    perks: ['Unlimited tables', 'Kitchen display', 'Priority support'],
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

export default function OnboardPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    subdomain: '',
    owner_email: '',
    phone: '',
    plan: 'free',
  })
  const [subdomainTouched, setSubdomainTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ subdomain: string } | null>(null)

  const subdomainValid = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(form.subdomain) || /^[a-z0-9]{2,32}$/.test(form.subdomain)
  const subdomainError = subdomainTouched && form.subdomain.length > 0 && !subdomainValid
    ? 'Only lowercase letters, numbers, and hyphens. Min 2 characters.'
    : ''

  function handleNameChange(value: string) {
    setForm(f => ({
      ...f,
      name: value,
      subdomain: subdomainTouched ? f.subdomain : toSlug(value),
    }))
  }

  function handleSubdomainChange(value: string) {
    setSubdomainTouched(true)
    setForm(f => ({ ...f, subdomain: toSlug(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subdomainValid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setSuccess({ subdomain: form.subdomain })
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
          <p className="text-gray-500 mb-6">Your restaurant has been registered. Your menu is live at:</p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 mb-8 font-mono text-blue-800 font-semibold text-sm">
            {success.subdomain}.bicres.com
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/admin/login"
              className="flex items-center justify-center gap-2 bg-blue-800 text-white font-semibold py-3 rounded-xl hover:bg-blue-900 transition-colors"
            >
              Go to Admin Panel <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
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
            <Link href="/admin/login" className="text-blue-800 font-semibold hover:underline">
              Login
            </Link>
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register your restaurant</h1>
          <p className="text-gray-500">Set up your digital menu in under 2 minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Restaurant Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-800" />
              Restaurant details
            </h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Restaurant name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Zara Restaurant"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
              />
            </div>

            {/* Subdomain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your subdomain <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-800 focus-within:border-transparent transition">
                <input
                  type="text"
                  required
                  placeholder="zara"
                  value={form.subdomain}
                  onChange={e => handleSubdomainChange(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
                />
                <span className="bg-gray-50 border-l border-gray-200 px-4 py-3 text-sm text-gray-500 font-medium select-none">
                  .bicres.com
                </span>
              </div>
              {subdomainError ? (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {subdomainError}
                </p>
              ) : form.subdomain ? (
                <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Your menu: <span className="font-semibold">{form.subdomain}.bicres.com</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-800" />
              Contact details
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="owner@restaurant.com"
                  value={form.owner_email}
                  onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone number
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Choose a plan</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {PLANS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, plan: p.id }))}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${
                    form.plan === p.id
                      ? 'border-blue-800 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{p.label}</span>
                    <span className={`text-sm font-bold ${form.plan === p.id ? 'text-blue-800' : 'text-gray-500'}`}>
                      {p.price}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {p.perks.map(perk => (
                      <li key={perk} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <ChevronRight className="w-3 h-3 text-blue-800 flex-shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !form.name || !form.subdomain || !!subdomainError}
            className="w-full flex items-center justify-center gap-2 bg-blue-800 text-white font-semibold py-4 rounded-xl text-base hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-100"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Setting up your restaurant…
              </>
            ) : (
              <>
                Register Restaurant <ArrowRight className="w-5 h-5" />
              </>
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
