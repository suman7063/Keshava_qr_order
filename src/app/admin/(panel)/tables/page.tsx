'use client'

import { useEffect, useState } from 'react'
import { RestaurantTable, TableStatus } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { QrCode, Plus, Trash2, Download, Pencil } from 'lucide-react'
import QRCode from 'qrcode'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const statusVariant = (status: string) => {
  if (status === 'available') return 'success'
  if (status === 'occupied') return 'danger'
  return 'warning'
}

const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTable, setEditTable] = useState<RestaurantTable | null>(null)
  const [qrModal, setQrModal] = useState<RestaurantTable | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ table_number: '', capacity: 4 })
  const [editForm, setEditForm] = useState<{ table_number: string; capacity: number; status: TableStatus }>({ table_number: '', capacity: 4, status: 'available' })

  async function fetchTables() {
    const res = await fetch('/api/tables')
    setTables(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchTables() }, [])

  async function addTable() {
    setSaving(true)
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ table_number: '', capacity: 4 })
      fetchTables()
    }
    setSaving(false)
  }

  async function saveEdit() {
    if (!editTable) return
    setSaving(true)
    await fetch(`/api/tables/${editTable.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setEditTable(null)
    fetchTables()
    setSaving(false)
  }

  async function deleteTable(id: string) {
    if (!confirm('Delete this table?')) return
    await fetch(`/api/tables/${id}`, { method: 'DELETE' })
    fetchTables()
  }

  async function showQR(table: RestaurantTable) {
    setQrModal(table)
    const url = `${BASE_URL}/table/${table.id}`
    const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#1f2937', light: '#ffffff' } })
    setQrDataUrl(dataUrl)
  }

  function downloadQR(table: RestaurantTable) {
    const link = document.createElement('a')
    link.download = `table-${table.table_number}-qr.png`
    link.href = qrDataUrl
    link.click()
  }

  function openEdit(table: RestaurantTable) {
    setEditTable(table)
    setEditForm({ table_number: table.table_number, capacity: table.capacity, status: table.status })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage restaurant tables and generate QR codes</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Table
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <div key={table.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Table {table.table_number}</h3>
                  <p className="text-sm text-gray-500">Capacity: {table.capacity} people</p>
                </div>
                <Badge variant={statusVariant(table.status) as 'success' | 'danger' | 'warning'}>
                  {STATUS_LABEL[table.status]}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mb-4">Added {formatDate(table.created_at)}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => showQR(table)} className="flex-1">
                  <QrCode className="w-3.5 h-3.5 mr-1.5" /> QR Code
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(table)} className="flex-1">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteTable(table.id)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Table">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number / Name</label>
            <input className={inputClass} placeholder="e.g. T6, Table A"
              value={form.table_number} onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (people)</label>
            <input type="number" min={1} className={inputClass} placeholder="e.g. 4"
              value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={addTable}>Add Table</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Table Modal — includes status + capacity */}
      <Modal isOpen={!!editTable} onClose={() => setEditTable(null)} title={`Edit — Table ${editTable?.table_number}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number / Name</label>
            <input className={inputClass} placeholder="e.g. T1"
              value={editForm.table_number} onChange={e => setEditForm(f => ({ ...f, table_number: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (people)</label>
            <input type="number" min={1} className={inputClass} placeholder="e.g. 4"
              value={editForm.capacity} onChange={e => setEditForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['available', 'occupied', 'reserved'] as TableStatus[]).map(s => (
                <button key={s} onClick={() => setEditForm(f => ({ ...f, status: s }))}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all capitalize
                    ${editForm.status === s
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-100 text-gray-500 hover:border-orange-200'}`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditTable(null)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={saveEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={!!qrModal} onClose={() => setQrModal(null)} title={`QR Code — Table ${qrModal?.table_number}`}>
        <div className="text-center">
          {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-xl border border-gray-100 shadow" />}
          <p className="text-sm text-gray-500 mt-3 break-all">{BASE_URL}/table/{qrModal?.id}</p>
          <Button className="mt-4 w-full" onClick={() => qrModal && downloadQR(qrModal)}>
            <Download className="w-4 h-4 mr-2" /> Download QR Code
          </Button>
        </div>
      </Modal>
    </div>
  )
}
