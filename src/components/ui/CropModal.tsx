'use client'

import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { X, RotateCw } from 'lucide-react'
import { Button } from './Button'

interface Props {
  src: string       // object URL / data URL of the picked image
  aspect: number    // width / height the crop should match where it's used
  onCancel: () => void
  onDone: (file: File) => void
}

// Simple crop dialog — drag to reposition, slider to zoom, button/slider to
// rotate — produces a cropped JPEG so the user's own image previews nicely
// where it's placed.
export function CropModal({ src, aspect, onCancel, onDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  async function apply() {
    if (!area) return
    setBusy(true)
    try {
      const blob = await cropToBlob(src, area, rotation)
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
          <Cropper image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect}
            minZoom={0.4} restrictPosition={false} objectFit="cover"
            onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
            onCropComplete={(_, a) => setArea(a)} />
        </div>
        <div className="px-5 py-3 flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 w-14">Zoom</span>
          <input type="range" min={0.4} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-orange-500 cursor-pointer" />
        </div>
        <div className="px-5 pb-3 flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 w-14">Rotate</span>
          <input type="range" min={0} max={360} step={1} value={rotation}
            onChange={e => setRotation(Number(e.target.value))} className="flex-1 accent-orange-500 cursor-pointer" />
          <button onClick={() => setRotation(r => Math.round(r / 90 + 1) % 4 * 90)} title="Rotate 90°"
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 cursor-pointer shrink-0">
            <RotateCw className="w-4 h-4" /> 90°
          </button>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button loading={busy} onClick={apply}>Use image</Button>
        </div>
      </div>
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('img-load'))
    img.src = src
  })
}

// Crop the visible area, honouring rotation. The crop area from react-easy-crop
// is relative to the rotated image's bounding box, so we first draw the rotated
// image onto a white canvas, then lift the requested region out of it.
async function cropToBlob(src: string, area: Area, rotation: number): Promise<Blob> {
  const img = await loadImage(src)
  const rot = (rotation * Math.PI) / 180

  const bw = Math.abs(Math.cos(rot) * img.width) + Math.abs(Math.sin(rot) * img.height)
  const bh = Math.abs(Math.sin(rot) * img.width) + Math.abs(Math.cos(rot) * img.height)

  // Rotated image on a white bounding-box canvas.
  const box = document.createElement('canvas')
  box.width = Math.round(bw)
  box.height = Math.round(bh)
  const bctx = box.getContext('2d')
  if (!bctx) throw new Error('no-ctx')
  bctx.fillStyle = '#ffffff'
  bctx.fillRect(0, 0, box.width, box.height)
  bctx.translate(box.width / 2, box.height / 2)
  bctx.rotate(rot)
  bctx.drawImage(img, -img.width / 2, -img.height / 2)

  // Lift the crop region out. Drawing the whole box shifted by -area keeps any
  // out-of-bounds part white instead of clipping/distorting.
  const out = document.createElement('canvas')
  out.width = Math.round(area.width)
  out.height = Math.round(area.height)
  const octx = out.getContext('2d')
  if (!octx) throw new Error('no-ctx')
  octx.fillStyle = '#ffffff'
  octx.fillRect(0, 0, out.width, out.height)
  octx.drawImage(box, -area.x, -area.y)

  return new Promise((resolve, reject) =>
    out.toBlob(b => (b ? resolve(b) : reject(new Error('no-blob'))), 'image/jpeg', 0.9))
}
