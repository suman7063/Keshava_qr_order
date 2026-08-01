'use client'

import { useState } from 'react'
import { uploadImage } from '@/lib/uploadImage'
import { CropModal } from './CropModal'

/**
 * Reusable crop-then-upload flow. Use it anywhere an image is uploaded:
 *   const { openCrop, cropModal, uploading } = useCropUpload('menu-items')
 *   <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) openCrop(f, 1, setUrl); e.target.value = '' }} />
 *   {cropModal}
 */
export function useCropUpload(folder = 'uploads') {
  const [crop, setCrop] = useState<{ url: string; aspect: number; onUploaded: (url: string) => void } | null>(null)
  const [uploading, setUploading] = useState(false)

  function openCrop(file: File, aspect: number, onUploaded: (url: string) => void) {
    setCrop({ url: URL.createObjectURL(file), aspect, onUploaded })
  }

  async function done(file: File) {
    const c = crop
    if (!c) return
    setUploading(true)
    try { c.onUploaded(await uploadImage(file, folder)) }
    catch { alert('Image upload failed. Try again.') }
    finally { setUploading(false); URL.revokeObjectURL(c.url); setCrop(null) }
  }

  const cropModal = crop
    ? <CropModal src={crop.url} aspect={crop.aspect}
        onCancel={() => { URL.revokeObjectURL(crop.url); setCrop(null) }} onDone={done} />
    : null

  return { openCrop, cropModal, uploading }
}
