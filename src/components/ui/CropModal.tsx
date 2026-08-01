'use client'

import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { X } from 'lucide-react'
import { Button } from './Button'

interface Props {
  src: string       // object URL / data URL of the picked image
  aspect: number    // width / height the crop should match where it's used
  onCancel: () => void
  onDone: (file: File) => void
}

// Simple crop dialog — drag to reposition, slider to zoom, produces a cropped
// JPEG so the user's own image previews nicely where it's placed.
export function CropModal({ src, aspect, onCancel, onDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  async function apply() {
    if (!area) return
    setBusy(true)
    try {
      const blob = await cropToBlob(src, area)
      onDone(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }))
    } catch { alert('Could not crop the image. Try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Crop image</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="relative bg-gray-900" style={{ height: 360 }}>
          <Cropper image={src} crop={crop} zoom={zoom} aspect={aspect}
            minZoom={0.4} restrictPosition={false} objectFit="contain"
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, a) => setArea(a)} />
        </div>
        <div className="px-5 py-3 flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 w-12">Zoom</span>
          <input type="range" min={0.4} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-orange-500 cursor-pointer" />
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button loading={busy} onClick={apply}>Use image</Button>
        </div>
      </div>
    </div>
  )
}

function cropToBlob(src: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(area.width)
      canvas.height = Math.round(area.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no-ctx'))
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no-blob'))), 'image/jpeg', 0.9)
    }
    img.onerror = () => reject(new Error('img-load'))
    img.src = src
  })
}
