'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, Loader2, Package, Plus } from 'lucide-react'
import { api, ApiError, fetcher } from '@/lib/api'

type Supply = {
  id: number
  code: string | null
  name: string
  category: string | null
  unit: string
  quantity: number
  min_threshold: number
  location: string | null
  status: string
}

type AlertItem = {
  supply_id: number
  name: string
  alert_type: 'low_stock' | 'expiry'
  message: string
  expiry_date: string | null
}

const categories = [
  ['phan_bon', 'Phân bón'],
  ['thuoc_bvtv', 'Thuốc BVTV / Chế phẩm'],
  ['giong', 'Hạt giống / Cây giống'],
  ['dung_cu', 'Dụng cụ & Bề mặt'],
]

export default function SuppliesPage() {
  const { data: supplies, mutate } = useSWR<Supply[]>('/api/supplies', fetcher)
  const { data: alerts } = useSWR<AlertItem[]>('/api/supplies/alerts', fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ code: '', name: '', category: 'phan_bon', unit: 'kg', min_threshold: '0', location: '' })
  const [importForm, setImportForm] = useState({ quantity_imported: '', unit_price: '0', supplier_name: '', batch_number: '', expiry_date: '' })

  async function createSupply(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null)
    try {
      await api('/api/supplies', { method: 'POST', body: { ...form, min_threshold: Number(form.min_threshold) } })
      setShowCreate(false); setForm({ code: '', name: '', category: 'phan_bon', unit: 'kg', min_threshold: '0', location: '' }); await mutate(); setMessage('Đã thêm vật tư.')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Không thể thêm vật tư.') } finally { setSaving(false) }
  }

  async function importSupply(event: FormEvent) {
    event.preventDefault(); if (!selectedSupply) return; setSaving(true); setError(null)
    try {
      await api(`/api/supplies/${selectedSupply.id}/import`, { method: 'POST', body: { ...importForm, quantity_imported: Number(importForm.quantity_imported), unit_price: Number(importForm.unit_price) } })
      setSelectedSupply(null); setImportForm({ quantity_imported: '', unit_price: '0', supplier_name: '', batch_number: '', expiry_date: '' }); await mutate(); setMessage('Đã nhập kho thành công.')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Không thể nhập kho.') } finally { setSaving(false) }
  }

  const lowStockCount = supplies?.filter((item) => item.quantity <= item.min_threshold).length ?? 0
  const expiryCount = alerts?.filter((item) => item.alert_type === 'expiry').length ?? 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Package className="size-7 text-primary" /> Quản lý vật tư nông nghiệp</h1><p className="mt-1 text-sm text-muted-foreground">Theo dõi tồn kho, nhập kho và cảnh báo vật tư.</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Thêm vật tư</button></div>
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3"><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Tổng loại vật tư</p><p className="mt-1 text-2xl font-bold">{supplies?.length ?? 0}</p></div><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Tồn kho thấp</p><p className="mt-1 text-2xl font-bold text-amber-600">{lowStockCount}</p></div><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Sắp hết hạn</p><p className="mt-1 text-2xl font-bold text-red-600">{expiryCount}</p></div></div>
      {alerts && alerts.length > 0 && <div className="surface-glass rounded-2xl p-4"><h2 className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="size-4 text-amber-600" /> Cảnh báo vật tư</h2><div className="grid gap-2 md:grid-cols-2">{alerts.map((item, index) => <p key={`${item.supply_id}-${item.alert_type}-${index}`} className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{item.name}: {item.message}</p>)}</div></div>}
      <section className="surface-glass overflow-hidden rounded-3xl p-5"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-3">Mã</th><th className="px-3 py-3">Vật tư</th><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Tồn kho</th><th className="px-3 py-3">Vị trí</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-border/60">{!supplies ? <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr> : supplies.map((item) => { const ratio = item.min_threshold > 0 ? Math.min(item.quantity / item.min_threshold, 2) * 50 : 100; return <tr key={item.id}><td className="px-3 py-3 font-mono text-xs">{item.code || '-'}</td><td className="px-3 py-3 font-semibold">{item.name}<div className="mt-1 h-1.5 w-32 rounded-full bg-muted"><div className={`h-1.5 rounded-full ${item.quantity <= item.min_threshold ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(ratio, 100)}%` }} /></div></td><td className="px-3 py-3">{categories.find(([value]) => value === item.category)?.[1] || item.category || 'Chưa phân loại'}</td><td className="px-3 py-3">{item.quantity} {item.unit}<div className="text-xs text-muted-foreground">Tối thiểu: {item.min_threshold}</div></td><td className="px-3 py-3">{item.location || '-'}</td><td className="px-3 py-3 text-right"><button onClick={() => setSelectedSupply(item)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Nhập kho</button></td></tr> })}</tbody></table></div></section>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={createSupply} className="w-full max-w-lg space-y-4 rounded-2xl bg-background p-6 shadow-xl"><h2 className="text-lg font-bold">Thêm vật tư</h2><div className="grid gap-3 sm:grid-cols-2"><input placeholder="Mã VT" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" required /><input placeholder="Tên vật tư" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" required /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-border bg-background p-2.5">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input placeholder="Đơn vị: kg, lít, chai" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" required /><input type="number" min="0" placeholder="Ngưỡng tối thiểu" value={form.min_threshold} onChange={(e) => setForm({ ...form, min_threshold: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Vị trí kho" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-border px-4 py-2">Hủy</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">Lưu</button></div></form></div>}
      {selectedSupply && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={importSupply} className="w-full max-w-lg space-y-4 rounded-2xl bg-background p-6 shadow-xl"><h2 className="text-lg font-bold">Nhập kho: {selectedSupply.name}</h2><div className="grid gap-3 sm:grid-cols-2"><input type="number" min="0.01" step="any" required placeholder="Số lượng nhập" value={importForm.quantity_imported} onChange={(e) => setImportForm({ ...importForm, quantity_imported: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input type="number" min="0" step="any" placeholder="Đơn giá" value={importForm.unit_price} onChange={(e) => setImportForm({ ...importForm, unit_price: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Nhà cung cấp" value={importForm.supplier_name} onChange={(e) => setImportForm({ ...importForm, supplier_name: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Số lô" value={importForm.batch_number} onChange={(e) => setImportForm({ ...importForm, batch_number: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input type="date" aria-label="Hạn sử dụng" value={importForm.expiry_date} onChange={(e) => setImportForm({ ...importForm, expiry_date: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedSupply(null)} className="rounded-xl border border-border px-4 py-2">Hủy</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">Nhập kho</button></div></form></div>}
    </div>
  )
}
