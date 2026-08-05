'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, KeyRound, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })
    if (resetError) {
      setError('Could not send the reset email. Please try again.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-linear-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-500 text-sm mt-1">We&apos;ll email you a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 text-left">
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Reset link sent!</p>
                <p className="text-green-600 text-xs">Check {email} for the password reset link.</p>
              </div>
            </div>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-orange-500 font-medium hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"
                  placeholder="Enter your account email"
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-60 transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Reset Link'}
            </button>
            <p className="text-center text-sm text-gray-400">
              Remembered it?{' '}
              <Link href="/login" className="text-orange-500 font-medium hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
