'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, Users, Eye, EyeOff, Pencil, Camera } from 'lucide-react'
import Image from 'next/image'

interface Manager {
  user_id: string
  email: string
  name: string
  avatar_url: string
  created_at: string
}

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"

async function uploadAvatar(file: File, key: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${key}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

function Avatar({ name, email, avatar_url, size = 9 }: { name: string; email: string; avatar_url: string; size?: number }) {
  const letter = (name || email)[0]?.toUpperCase() || '?'
  const px = size * 4
  if (avatar_url) {
    return (
      <Image
        src={avatar_url}
        alt={name || email}
        width={px}
        height={px}
        className="rounded-full object-cover shrink-0"
        style={{ width: px, height: px }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center bg-purple-100 text-purple-700 font-bold shrink-0"
      style={{ width: px, height: px, fontSize: px * 0.4 }}
    >
      {letter}
    </div>
  )
}

function AvatarPicker({ preview, onChange }: { preview: string; onChange: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 shrink-0 cursor-pointer" onClick={() => ref.current?.click()}>
        {preview ? (
          <Image src={preview} alt="Preview" width={64} height={64} className="w-16 h-16 rounded-full object-cover border border-gray-200" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div className="absolute bottom-0 right-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow">
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div>
        <button type="button" onClick={() => ref.current?.click()} className="text-sm font-medium text-orange-600 hover:text-orange-700 cursor-pointer">
          Upload photo
        </button>
        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP · Max 2MB</p>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f) }} />
    </div>
  )
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editManager, setEditManager] = useState<Manager | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [addAvatarFile, setAddAvatarFile] = useState<File | null>(null)
  const [addAvatarPreview, setAddAvatarPreview] = useState('')

  const [editName, setEditName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState('')

  async function fetchManagers() {
    const res = await fetch('/api/admin/managers')
    setManagers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchManagers() }, [])

  function onAddAvatar(file: File) {
    setAddAvatarFile(file)
    setAddAvatarPreview(URL.createObjectURL(file))
  }

  function onEditAvatar(file: File) {
    setEditAvatarFile(file)
    setEditAvatarPreview(URL.createObjectURL(file))
  }

  async function addManager() {
    setSaving(true)
    setError('')
    try {
      let avatar_url = ''
      if (addAvatarFile) {
        avatar_url = await uploadAvatar(addAvatarFile, `new-${Date.now()}`)
      }
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, avatar_url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
      } else {
        setSuccess(`Manager "${form.name || form.email}" created successfully!`)
        setForm({ name: '', email: '', password: '' })
        setAddAvatarFile(null)
        setAddAvatarPreview('')
        setShowAdd(false)
        fetchManagers()
        setTimeout(() => setSuccess(''), 4000)
      }
    } catch (e) {
      setError((e as Error).message || 'Upload failed.')
    }
    setSaving(false)
  }

  async function updateManager() {
    if (!editManager) return
    if (newPassword && newPassword.length < 6) { setEditError('Password must be at least 6 characters'); return }
    setSaving(true)
    setEditError('')
    try {
      let avatar_url: string | undefined
      if (editAvatarFile) {
        avatar_url = await uploadAvatar(editAvatarFile, editManager.user_id)
      }
      const body: Record<string, string> = { name: editName }
      if (newPassword) body.password = newPassword
      if (avatar_url) body.avatar_url = avatar_url
      const res = await fetch(`/api/admin/managers/${editManager.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Something went wrong.')
      } else {
        setSuccess(`Manager "${editName || editManager.email}" updated!`)
        setEditManager(null)
        setNewPassword('')
        setEditAvatarFile(null)
        setEditAvatarPreview('')
        fetchManagers()
        setTimeout(() => setSuccess(''), 4000)
      }
    } catch (e) {
      setEditError((e as Error).message || 'Upload failed.')
    }
    setSaving(false)
  }

  async function deleteManager(id: string, email: string) {
    if (!confirm(`Are you sure you want to delete "${email}"?`)) return
    setDeletingId(id)
    await fetch(`/api/admin/managers/${id}`, { method: 'DELETE' })
    await fetchManagers()
    setDeletingId(null)
  }

  function openEdit(m: Manager) {
    setEditManager(m)
    setEditName(m.name)
    setNewPassword('')
    setEditAvatarFile(null)
    setEditAvatarPreview(m.avatar_url || '')
    setEditError('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Managers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create and manage manager accounts</p>
        </div>
        <Button onClick={() => { setShowAdd(true); setError(''); setAddAvatarPreview(''); setAddAvatarFile(null) }}>
          <Plus className="w-4 h-4 mr-2" /> Add Manager
        </Button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : managers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No managers found</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Manager" to create one</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Manager</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Created</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {managers.map(m => (
                <tr key={m.user_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} email={m.email} avatar_url={m.avatar_url} size={9} />
                      <div>
                        {m.name && <p className="font-semibold text-gray-900 text-sm leading-tight">{m.name}</p>}
                        <p className={m.name ? 'text-xs text-gray-400' : 'font-medium text-gray-900 text-sm'}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(m.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="sm"
                        loading={deletingId === m.user_id}
                        onClick={() => deleteManager(m.user_id, m.email)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Manager Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Manager">
        <div className="space-y-4">
          <AvatarPicker preview={addAvatarPreview} onChange={onAddAvatar} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input type="text" className={inputClass} placeholder="Enter full name"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <input type="email" className={inputClass} placeholder="Enter email"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} className={inputClass + ' pr-10'}
                placeholder="Min 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={addManager}>Create Manager</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Manager Modal */}
      <Modal isOpen={!!editManager} onClose={() => setEditManager(null)} title={`Edit — ${editManager?.name || editManager?.email}`}>
        <div className="space-y-4">
          <AvatarPicker preview={editAvatarPreview} onChange={onEditAvatar} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input type="text" className={inputClass} placeholder="Enter full name"
              value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Email (cannot change)</p>
            <p className="font-medium text-gray-900 text-sm">{editManager?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
            </label>
            <div className="relative">
              <input type={showEditPassword ? 'text' : 'password'} className={inputClass + ' pr-10'}
                placeholder="Min 6 characters"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button type="button" onClick={() => setShowEditPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {editError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{editError}</div>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditManager(null)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={updateManager}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
