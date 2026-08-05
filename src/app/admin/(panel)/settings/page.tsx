'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Toast, useToast } from '@/components/ui/Toast'
import { useCropUpload } from '@/components/ui/useCropUpload'
import { PLANS, type PlanId } from '@/lib/plans'
import { Store, Palette, Camera, BadgeCheck, Zap, ImageIcon, MapPin, Clock, Globe, KeyRound, Smartphone, UserCheck, Layers } from 'lucide-react'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadCheckoutScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

interface RestaurantProfile {
  id: string
  name: string
  subdomain: string
  phone: string | null
  address: string | null
  logo_url: string | null
  cover_image_url: string | null
  cover_overlay?: number
  maps_url: string | null
  opening_hours: string | null
  accepting_orders: boolean
  primary_color: string | null
  plan?: string
  trial_ends_at?: string | null
}

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400'

export default function SettingsPage() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { openCrop, cropModal, uploading } = useCropUpload('branding')
  const [error, setError] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [otpMode, setOtpMode] = useState<'customer' | 'manager'>('customer')
  const [savingOtpMode, setSavingOtpMode] = useState(false)
  const { toast, showToast, dismissToast } = useToast()

  const [form, setForm] = useState({
    name: '', phone: '', address: '', logo_url: '', primary_color: '',
    cover_image_url: '', cover_overlay: 62, maps_url: '', opening_hours: '', accepting_orders: true,
  })

  useEffect(() => {
    fetch('/api/restaurants/current')
      .then(r => r.json())
      .then((r: RestaurantProfile | null) => {
        if (r) {
          setProfile(r)
          setForm({
            name: r.name || '',
            phone: r.phone || '',
            address: r.address || '',
            logo_url: r.logo_url || '',
            primary_color: r.primary_color || '',
            cover_image_url: r.cover_image_url || '',
            cover_overlay: r.cover_overlay ?? 62,
            maps_url: r.maps_url || '',
            opening_hours: r.opening_hours || '',
            accepting_orders: r.accepting_orders ?? true,
          })
        }
      })
      .catch(() => setError('Could not load restaurant profile.'))
      .finally(() => setLoading(false))

    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d?.otp_mode === 'manager') setOtpMode('manager') })
      .catch(() => {})
  }, [])

  async function changeOtpMode(mode: 'customer' | 'manager') {
    if (mode === otpMode || savingOtpMode) return
    const prev = otpMode
    setOtpMode(mode)
    setSavingOtpMode(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp_mode: mode }),
    })
    if (!res.ok) {
      setOtpMode(prev)
      showToast('Could not update the OTP mode.')
    } else {
      showToast(mode === 'manager' ? 'Manager will now share table OTPs.' : 'Customers now get the OTP themselves.')
    }
    setSavingOtpMode(false)
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openCrop(file, 1, url => setForm(f => ({ ...f, logo_url: url })))
    e.target.value = ''
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openCrop(file, 16 / 9, url => setForm(f => ({ ...f, cover_image_url: url })))
    e.target.value = ''
  }

  async function save() {
    if (!form.name.trim()) { setError('Restaurant name is required.'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/restaurants/current', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Could not save settings.')
    } else {
      setProfile(data)
      showToast('Settings saved!')
    }
    setSaving(false)
  }

  async function refreshProfile() {
    const res = await fetch('/api/restaurants/current')
    if (res.ok) {
      const r = await res.json()
      if (r) setProfile(p => ({ ...p, ...r }))
    }
  }

  async function upgradeToPro() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/billing/subscribe', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Could not start the upgrade.')
        return
      }
      const loaded = await loadCheckoutScript()
      if (!loaded || !window.Razorpay) {
        showToast('Could not load the payment window. Check your connection.')
        return
      }
      const rzp = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: profile?.name || 'bicres',
        description: 'Pro plan — ₹499/month',
        prefill: { email: data.email || '' },
        theme: { color: '#f97316' },
        handler: () => {
          showToast('Payment received! Activating your Pro plan…')
          // Activation lands via webhook — poll briefly for the flip.
          let tries = 0
          const poll = setInterval(async () => {
            tries += 1
            await refreshProfile()
            if (tries >= 6) clearInterval(poll)
          }, 3000)
        },
      })
      rzp.open()
    } finally {
      setUpgrading(false)
    }
  }

  const planInfo = profile?.plan ? PLANS[profile.plan as PlanId] : null
  const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()
  const isPaidActive = profile?.plan !== 'free' && !profile?.trial_ends_at

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div className="max-w-6xl">
      {toast && <Toast message={toast} onDismiss={dismissToast} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your restaurant profile and branding</p>
      </div>

      {planInfo && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <BadgeCheck className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-40">
            <p className="font-semibold text-gray-900 text-sm">
              {planInfo.label} plan
              {trialActive && profile?.trial_ends_at && (
                <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Trial until {new Date(profile.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {planInfo.maxTables === Infinity ? 'Unlimited tables' : `Up to ${planInfo.maxTables} tables`} ·{' '}
              {planInfo.maxMenuItems === Infinity ? 'unlimited menu items' : `up to ${planInfo.maxMenuItems} menu items`}
            </p>
          </div>
          {!isPaidActive && (
            <Button loading={upgrading} onClick={upgradeToPro} className="whitespace-nowrap">
              <Zap className="w-4 h-4 mr-1.5" />
              {trialActive ? 'Subscribe — ₹499/mo' : 'Upgrade to Pro — ₹499/mo'}
            </Button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Store className="w-4 h-4 text-orange-500" /> Restaurant profile
        </h2>

        {/* Logo */}
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center">
              <Camera className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-orange-600 hover:text-orange-700 cursor-pointer">
              {uploading ? 'Uploading…' : form.logo_url ? 'Change logo' : 'Upload logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={handleLogoUpload} />
            </label>
            {form.logo_url && (
              <button onClick={() => setForm(f => ({ ...f, logo_url: '' }))} className="block text-xs text-gray-400 hover:text-red-400 mt-1">
                Remove
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant name *</label>
          <input className={inputClass} value={form.name} maxLength={200}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">Shown to customers on the menu, bills and kitchen tickets.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input className={inputClass} value={form.phone} maxLength={20} placeholder="9876543210"
              onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^\d+\- ]/g, '') }))} />
          </div>
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
              <Palette className="w-3.5 h-3.5" /> Brand color
            </label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color || '#1e3a5f'}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              {form.primary_color && (
                <button onClick={() => setForm(f => ({ ...f, primary_color: '' }))} className="text-xs text-gray-400 hover:text-red-400">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
          <textarea rows={2} className={`${inputClass} resize-none`} value={form.address} maxLength={500}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, city" />
        </div>

      </div>

      {/* Right column: public page + ordering */}
      <div className="space-y-6">
        {/* ── Public page (bicres.com/subdomain) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-orange-500" /> Public page
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Shown to customers at bicres.com/{profile?.subdomain}
          </p>

          {/* Cover photo */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cover photo</label>
            {form.cover_image_url ? (
              // Live preview: photo + adjustable dark layer + sample text
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${form.cover_overlay / 100})` }} />
                <p className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl tracking-tight px-4 text-center">
                  {form.name || 'Your Restaurant'}
                </p>
              </div>
            ) : (
              <div className="w-full h-36 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5">
                <ImageIcon className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-400">Background photo for your public page</span>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2">
              <label className="text-sm font-medium text-orange-600 hover:text-orange-700 cursor-pointer">
                {uploading ? 'Uploading…' : form.cover_image_url ? 'Change cover photo' : 'Upload cover photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={handleCoverUpload} />
              </label>
              {form.cover_image_url && (
                <button onClick={() => setForm(f => ({ ...f, cover_image_url: '' }))} className="text-xs text-gray-400 hover:text-red-400">
                  Remove
                </button>
              )}
            </div>
            {/* Photo layer slider — darker photo, clearer text */}
            {form.cover_image_url && (
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Photo layer
                </span>
                <input type="range" min={0} max={90} step={5} value={form.cover_overlay}
                  onChange={e => setForm(f => ({ ...f, cover_overlay: Number(e.target.value) }))}
                  className="flex-1 accent-orange-500 cursor-pointer" />
                <span className="text-xs text-gray-400 w-9">{form.cover_overlay}%</span>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Opening hours
              </label>
              <input className={inputClass} value={form.opening_hours} maxLength={200} placeholder="10 AM – 11 PM"
                onChange={e => setForm(f => ({ ...f, opening_hours: e.target.value }))} />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
                <MapPin className="w-3.5 h-3.5" /> Google Maps link
              </label>
              <input className={inputClass} value={form.maps_url} maxLength={1000} placeholder="https://maps.app.goo.gl/…"
                onChange={e => setForm(f => ({ ...f, maps_url: e.target.value }))} />
            </div>
          </div>

          {/* Open/closed toggle */}
          <label className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-900">Open for dine-in</p>
              <p className="text-xs text-gray-400 mt-0.5">
                When off, your public page shows &ldquo;Currently closed&rdquo;
              </p>
            </div>
            <button type="button" role="switch" aria-checked={form.accepting_orders}
              onClick={() => setForm(f => ({ ...f, accepting_orders: !f.accepting_orders }))}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.accepting_orders ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.accepting_orders ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </label>
        </div>

        {/* ── Table OTP mode ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-orange-500" /> Table OTP
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Who shares the table code when a customer places their first order. Saved instantly.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {([
            {
              id: 'customer' as const,
              icon: Smartphone,
              title: 'Customer gets the OTP',
              desc: 'Self-service: the first customer sees the code on their phone and shares it at the table.',
            },
            {
              id: 'manager' as const,
              icon: UserCheck,
              title: 'Manager shares the OTP',
              desc: 'Staff verify the table in person: the code shows only on staff dashboards until shared.',
            },
          ]).map(opt => (
            <button key={opt.id} type="button" disabled={savingOtpMode}
              onClick={() => changeOtpMode(opt.id)}
              className={`text-left rounded-xl border-2 p-4 transition-colors ${
                otpMode === opt.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <opt.icon className={`w-4 h-4 ${otpMode === opt.id ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-semibold ${otpMode === opt.id ? 'text-orange-700' : 'text-gray-700'}`}>
                  {opt.title}
                </span>
                {otpMode === opt.id && (
                  <span className="ml-auto text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">ON</span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
          </div>
        </div>
      </div>

      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-6">{error}</div>}

      <div className="mt-6">
        <Button loading={saving} onClick={save}>Save Settings</Button>
      </div>
      {cropModal}
    </div>
  )
}
