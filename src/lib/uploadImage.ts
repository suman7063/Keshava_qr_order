import { createClient } from '@/lib/supabase/client'

const BUCKET = 'restaurant-images'
const MAX_DIMENSION = 1200
const QUALITY = 0.82

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = Math.round(height * MAX_DIMENSION / width); width = MAX_DIMENSION }
        else { width = Math.round(width * MAX_DIMENSION / height); height = MAX_DIMENSION }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        else resolve(file)
      }, 'image/jpeg', QUALITY)
    }
    img.src = url
  })
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const supabase = createClient()
  const compressed = await compressImage(file)
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteImage(url: string): Promise<void> {
  if (!url || url.includes('unsplash.com')) return
  const supabase = createClient()
  const path = url.split(`${BUCKET}/`)[1]
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
