'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onDismiss])

  return (
    <div className={`fixed top-6 right-6 z-999 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 max-w-sm
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
        className="text-gray-400 hover:text-white transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => setToast(msg)
  const dismissToast = () => setToast('')
  return { toast, showToast, dismissToast }
}
