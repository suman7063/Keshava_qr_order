'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, Users, Eye, EyeOff, Pencil } from 'lucide-react'

interface Manager {
  user_id: string
  email: string
  created_at: string
}

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"

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
  const [form, setForm] = useState({ email: '', password: '' })
  const [newPassword, setNewPassword] = useState('')

  async function fetchManagers() {
    const res = await fetch('/api/admin/managers')
    setManagers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchManagers() }, [])

  async function addManager() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/managers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
    } else {
      setSuccess(`Manager "${form.email}" created successfully!`)
      setForm({ email: '', password: '' })
      setShowAdd(false)
      fetchManagers()
      setTimeout(() => setSuccess(''), 4000)
    }
    setSaving(false)
  }

  async function updatePassword() {
    if (!editManager) return
    if (newPassword.length < 6) { setEditError('Password must be at least 6 characters'); return }
    setSaving(true)
    setEditError('')
    const res = await fetch(`/api/admin/managers/${editManager.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    const data = await res.json()
    if (!res.ok) {
      setEditError(data.error || 'Something went wrong.')
    } else {
      setSuccess(`Password updated for "${editManager.email}"!`)
      setEditManager(null)
      setNewPassword('')
      setTimeout(() => setSuccess(''), 4000)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Managers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create and manage manager accounts</p>
        </div>
        <Button onClick={() => { setShowAdd(true); setError('') }}>
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
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Created</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {managers.map(m => (
                <tr key={m.user_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold text-sm">
                        {m.email[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{m.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(m.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm"
                        onClick={() => { setEditManager(m); setNewPassword(''); setEditError('') }}>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <input type="email" className={inputClass} placeholder="Enter email"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} className={inputClass + ' pr-10'}
                placeholder="Enter password (min 6 characters)"
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

      {/* Edit Manager Modal — password change */}
      <Modal isOpen={!!editManager} onClose={() => setEditManager(null)} title={`Edit — ${editManager?.email}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Email</p>
            <p className="font-medium text-gray-900 text-sm">{editManager?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password *</label>
            <div className="relative">
              <input type={showEditPassword ? 'text' : 'password'} className={inputClass + ' pr-10'}
                placeholder="Enter new password (min 6 characters)"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button type="button" onClick={() => setShowEditPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {editError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{editError}</div>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditManager(null)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={updatePassword}>Update Password</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
