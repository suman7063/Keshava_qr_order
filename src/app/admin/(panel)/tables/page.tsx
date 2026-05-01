'use client'

import { useEffect, useState } from 'react'
import { RestaurantTable, TableStatus } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { QrCode, Plus, Trash2, Download, RefreshCw } from 'lucide-react'
import QRCode from 'qrcode'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const statusVariant = (status: string) => {
  if (status === 'available') return 'success'
  if (status === 'occupied') return 'danger'
  return 'warning'
}

const STATUS_CYCLE: Record<TableStatus, TableStatus> = {
  available: 'occupied',
  occupied: 'available',
  reserved: 'available',
}

const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [qrModal, setQrModal] = useState<RestaurantTable | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState({ table_number: '', capacity: 4 })

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

  async function deleteTable(id: string) {
    if (!confirm('Delete this table?')) return
    await fetch(`/api/tables/${id}`, { method: 'DELETE' })
    fetchTables()
  }

  async function toggleStatus(table: RestaurantTable) {
    setTogglingId(table.id)
    const nextStatus = STATUS_CYCLE[table.status]
    await fetch(`/api/tables/${table.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    await fetchTables()
    setTogglingId(null)
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
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Table {table.table_number}</h3>
                  <p className="text-sm text-gray-500">Capacity: {table.capacity} people</p>
                </div>
                {/* Click badge to toggle status */}
                <button
                  onClick={() => toggleStatus(table)}
                  disabled={togglingId === table.id}
                  title={`Click to mark as ${STATUS_CYCLE[table.status]}`}
                  className="cursor-pointer hover:opacity-70 transition-opacity disabled:opacity-40"
                >
                  <Badge variant={statusVariant(table.status) as 'success' | 'danger' | 'warning'}>
                    {togglingId === table.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />
                    ) : null}
                    {STATUS_LABEL[table.status]}
                  </Badge>
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">Added {formatDate(table.created_at)}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => showQR(table)} className="flex-1">
                  <QrCode className="w-4 h-4 mr-1.5" /> QR Code
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteTable(table.id)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Table">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number / Name</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
              placeholder="e.g. T1, Table A"
              value={form.table_number}
              onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input
              type="number"
              min={1}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 text-gray-900"
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={addTable}>Add Table</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!qrModal} onClose={() => setQrModal(null)} title={`QR Code — Table ${qrModal?.table_number}`}>
        <div className="text-center">
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-xl border border-gray-100 shadow" />
          )}
          <p className="text-sm text-gray-500 mt-3 break-all">
            {BASE_URL}/table/{qrModal?.id}
          </p>
          <Button className="mt-4 w-full" onClick={() => qrModal && downloadQR(qrModal)}>
            <Download className="w-4 h-4 mr-2" /> Download QR Code
          </Button>
        </div>
      </Modal>
    </div>
  )
}
