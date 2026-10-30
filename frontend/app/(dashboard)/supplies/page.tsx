'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, CalendarDays, Loader2, Package, Plus, WandSparkles } from 'lucide-react'
import { api, ApiError, fetcher } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

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
  ['dung_cu', 'Dụng cụ & Máy móc'],
  ['khac', 'Nhiên liệu / Khác'],
]

const units = [
  ['kg', 'Kg'],
  ['lit', 'Lít'],
  ['chai', 'Chai'],
  ['goi', 'Gói'],
  ['bao', 'Bao'],
  ['can', 'Can'],
  ['cai', 'Cái'],
]

// Tránh hiển thị sai số dấu phẩy động sau khi trừ tồn kho (vd. 0.6000000000000005).
function formatQuantity(value: number) {
  const rounded = Math.round(Number(value) * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-slate-700'
const EMPTY_FORM = {
  code: '',
  name: '',
  category: 'phan_bon',
  unit: 'kg',
  initial_stock: '0',
  min_threshold: '0',
  initial_expiry_date: '',
  location: '',
  usage_notes: '',
  storage_notes: '',
}

export default function SuppliesPage() {
  const [userRole, setUserRole] = useState('')
  const { data: supplies, error: suppliesError, mutate } = useSWR<Supply[]>('/api/supplies', fetcher)
  const { data: alerts } = useSWR<AlertItem[]>('/api/supplies/alerts', fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCreateTab, setActiveCreateTab] = useState<'main' | 'stock'>('main')
  const [form, setForm] = useState(EMPTY_FORM)
  const [importForm, setImportForm] = useState({ quantity_imported: '', unit_price: '0', supplier_name: '', batch_number: '', expiry_date: '' })
  const canManageSupplies = hasPermission(userRole, PERMISSIONS.SUPPLY_CREATE)

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user')
      if (!storedUser) return
      const parsedUser: unknown = JSON.parse(storedUser)
      if (typeof parsedUser === 'object' && parsedUser !== null && 'role' in parsedUser) {
        setUserRole(String(parsedUser.role))
      }
    } catch (loadError) {
      console.error('Không thể đọc vai trò người dùng:', loadError)
    }
  }, [])

  function generateSupplyCode() {
    const highestCode = supplies?.reduce((highest, supply) => {
      const match = supply.code?.match(/^VT-(\d+)$/i)
      return match ? Math.max(highest, Number(match[1])) : highest
    }, 0) ?? 0
    setForm((current) => ({ ...current, code: `VT-${String(highestCode + 1).padStart(3, '0')}` }))
  }

  async function createSupply(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Nhập tên vật tư trước khi lưu.')
      setActiveCreateTab('main')
      return
    }
    const initialStock = Number(form.initial_stock)
    const minimumStock = Number(form.min_threshold)
    if (!Number.isFinite(initialStock) || initialStock < 0 || !Number.isFinite(minimumStock) || minimumStock < 0) {
      setError('Số lượng tồn kho và hạn mức tối thiểu phải là số không âm.')
      setActiveCreateTab('stock')
      return
    }
    if (form.initial_expiry_date && initialStock <= 0) {
      setError('Nhập tồn kho ban đầu lớn hơn 0 để ghi nhận hạn sử dụng cho lô hàng.')
      setActiveCreateTab('stock')
      return
    }
    setSaving(true); setError(null); setMessage(null)
    try {
      await api('/api/supplies', {
        method: 'POST',
        body: {
          ...form,
          initial_stock: initialStock,
          min_threshold: minimumStock,
          initial_expiry_date: form.initial_expiry_date || null,
        },
      })
      setShowCreate(false); setForm(EMPTY_FORM); setActiveCreateTab('main'); await mutate(); setMessage('Đã thêm vật tư.')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Không thể thêm vật tư.') } finally { setSaving(false) }
  }

  async function importSupply(event: FormEvent) {
    event.preventDefault(); if (!selectedSupply) return; setSaving(true); setError(null)
    try {
      await api(`/api/supplies/${selectedSupply.id}/import`, { method: 'POST', body: { ...importForm, quantity_imported: Number(importForm.quantity_imported), unit_price: Number(importForm.unit_price), expiry_date: importForm.expiry_date || null } })
      setSelectedSupply(null); setImportForm({ quantity_imported: '', unit_price: '0', supplier_name: '', batch_number: '', expiry_date: '' }); await mutate(); setMessage('Đã nhập kho thành công.')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Không thể nhập kho.') } finally { setSaving(false) }
  }

  const lowStockCount = useMemo(
    () => supplies?.filter((item) => item.quantity <= item.min_threshold).length ?? 0,
    [supplies],
  )
  const expiryCount = useMemo(
    () => alerts?.filter((item) => item.alert_type === 'expiry').length ?? 0,
    [alerts],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Package className="size-7 text-primary" /> Quản lý vật tư nông nghiệp</h1><p className="mt-1 text-sm text-muted-foreground">Theo dõi tồn kho, nhập kho và cảnh báo vật tư.</p></div>{canManageSupplies && <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Thêm vật tư</button>}</div>
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3"><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Tổng loại vật tư</p><p className="mt-1 text-2xl font-bold">{supplies?.length ?? 0}</p></div><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Tồn kho thấp</p><p className="mt-1 text-2xl font-bold text-amber-600">{lowStockCount}</p></div><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Sắp hết hạn</p><p className="mt-1 text-2xl font-bold text-red-600">{expiryCount}</p></div></div>
      {alerts && alerts.length > 0 && <div className="surface-glass rounded-2xl p-4"><h2 className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="size-4 text-amber-600" /> Cảnh báo vật tư</h2><div className="grid gap-2 md:grid-cols-2">{alerts.map((item, index) => <p key={`${item.supply_id}-${item.alert_type}-${index}`} className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{item.name}: {item.message}</p>)}</div></div>}
      <section className="surface-glass overflow-hidden rounded-3xl p-5"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-3">Mã</th><th className="px-3 py-3">Vật tư</th><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Tồn kho</th><th className="px-3 py-3">Vị trí</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-border/60">{!supplies ? <tr><td colSpan={6} className="px-3 py-10 text-center">{suppliesError ? <p className="text-sm text-red-700">Không tải được danh sách vật tư. Vui lòng thử lại.</p> : <Loader2 className="mx-auto size-5 animate-spin" />}</td></tr> : supplies.map((item) => { const ratio = item.min_threshold > 0 ? Math.min(item.quantity / item.min_threshold, 2) * 50 : 100; return <tr key={item.id}><td className="px-3 py-3 font-mono text-xs">{item.code || '-'}</td><td className="px-3 py-3 font-semibold">{item.name}<div className="mt-1 h-1.5 w-32 rounded-full bg-muted"><div className={`h-1.5 rounded-full ${item.quantity <= item.min_threshold ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(ratio, 100)}%` }} /></div></td><td className="px-3 py-3">{categories.find(([value]) => value === item.category)?.[1] || item.category || 'Chưa phân loại'}</td><td className="px-3 py-3">{formatQuantity(item.quantity)} {item.unit}<div className="text-xs text-muted-foreground">Tối thiểu: {formatQuantity(item.min_threshold)}</div></td><td className="px-3 py-3">{item.location || '-'}</td><td className="px-3 py-3 text-right">{canManageSupplies && <button onClick={() => setSelectedSupply(item)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Nhập kho</button>}</td></tr> })}</tbody></table></div></section>
      {canManageSupplies && showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setShowCreate(false)
          }}
        >
          <form
            onSubmit={createSupply}
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-supply-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
              <div>
                <h2 id="create-supply-title" className="text-xl font-bold text-slate-900">Thêm vật tư</h2>
                <p className="mt-1 text-sm text-slate-500">Khai báo thông tin và ngưỡng theo dõi tồn kho.</p>
              </div>
              <Package className="mt-1 size-5 text-emerald-800" aria-hidden="true" />
            </header>

            {error && <p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 sm:mx-7">{error}</p>}

            <div className="border-b border-slate-200 px-5 pt-4 sm:px-7">
              <div role="tablist" aria-label="Thông tin vật tư" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCreateTab === 'main'}
                  aria-controls="supply-main-panel"
                  onClick={() => setActiveCreateTab('main')}
                  className={`rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${activeCreateTab === 'main' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Thông tin chính
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCreateTab === 'stock'}
                  aria-controls="supply-stock-panel"
                  onClick={() => setActiveCreateTab('stock')}
                  className={`rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${activeCreateTab === 'stock' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Định mức & cảnh báo
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              {activeCreateTab === 'main' ? (
                <div id="supply-main-panel" role="tabpanel" className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className={LABEL_CLASS}>Mã vật tư</span>
                    <span className="flex gap-2">
                      <input
                        value={form.code}
                        onChange={(event) => setForm({ ...form, code: event.target.value })}
                        placeholder="VT-001"
                        className={FIELD_CLASS}
                      />
                      <button
                        type="button"
                        onClick={generateSupplyCode}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-800/20 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                      >
                        <WandSparkles className="size-4" aria-hidden="true" />
                        Tạo mã
                      </button>
                    </span>
                  </label>
                  <label className="sm:col-span-2">
                    <span className={LABEL_CLASS}>Tên vật tư *</span>
                    <input
                      required
                      maxLength={150}
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="Ví dụ: Phân hữu cơ vi sinh"
                      className={FIELD_CLASS}
                    />
                  </label>
                  <label>
                    <span className={LABEL_CLASS}>Phân loại</span>
                    <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={FIELD_CLASS}>
                      {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={LABEL_CLASS}>Đơn vị tính</span>
                    <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className={FIELD_CLASS}>
                      {units.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="sm:col-span-2">
                    <span className={LABEL_CLASS}>Vị trí kho</span>
                    <input
                      maxLength={150}
                      value={form.location}
                      onChange={(event) => setForm({ ...form, location: event.target.value })}
                      placeholder="Ví dụ: Kho A · Kệ 2"
                      className={FIELD_CLASS}
                    />
                  </label>
                </div>
              ) : (
                <div id="supply-stock-panel" role="tabpanel" className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className={LABEL_CLASS}>Tồn kho ban đầu</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.initial_stock}
                        onChange={(event) => setForm({ ...form, initial_stock: event.target.value })}
                        className={FIELD_CLASS}
                      />
                    </label>
                    <label>
                      <span className={LABEL_CLASS}>Hạn mức tồn tối thiểu</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.min_threshold}
                        onChange={(event) => setForm({ ...form, min_threshold: event.target.value })}
                        className={FIELD_CLASS}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className={LABEL_CLASS}>Hạn sử dụng <span className="font-normal text-slate-400">(không bắt buộc)</span></span>
                      <span className="relative block">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          type="date"
                          value={form.initial_expiry_date}
                          onChange={(event) => setForm({ ...form, initial_expiry_date: event.target.value })}
                          className={`${FIELD_CLASS} pl-10`}
                        />
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">Hạn sử dụng được lưu cho lô tồn kho ban đầu.</span>
                    </label>
                  </div>
                  <label className="block">
                    <span className={LABEL_CLASS}>Liều lượng khuyến cáo</span>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={form.usage_notes}
                      onChange={(event) => setForm({ ...form, usage_notes: event.target.value })}
                      placeholder="Ghi liều dùng, cách pha hoặc phạm vi sử dụng…"
                      className={`${FIELD_CLASS} resize-y`}
                    />
                  </label>
                  <label className="block">
                    <span className={LABEL_CLASS}>Ghi chú bảo quản</span>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={form.storage_notes}
                      onChange={(event) => setForm({ ...form, storage_notes: event.target.value })}
                      placeholder="Ví dụ: Để nơi khô ráo, tránh ánh nắng trực tiếp…"
                      className={`${FIELD_CLASS} resize-y`}
                    />
                  </label>
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(null) }}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {saving ? 'Đang lưu…' : 'Lưu vật tư'}
              </button>
            </footer>
          </form>
        </div>
      )}
      {canManageSupplies && selectedSupply && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={importSupply} className="w-full max-w-lg space-y-4 rounded-2xl bg-background p-6 shadow-xl"><h2 className="text-lg font-bold">Nhập kho: {selectedSupply.name}</h2><div className="grid gap-3 sm:grid-cols-2"><input type="number" min="0.01" step="any" required placeholder="Số lượng nhập" value={importForm.quantity_imported} onChange={(e) => setImportForm({ ...importForm, quantity_imported: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input type="number" min="0" step="any" placeholder="Đơn giá" value={importForm.unit_price} onChange={(e) => setImportForm({ ...importForm, unit_price: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Nhà cung cấp" value={importForm.supplier_name} onChange={(e) => setImportForm({ ...importForm, supplier_name: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Số lô" value={importForm.batch_number} onChange={(e) => setImportForm({ ...importForm, batch_number: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input type="date" aria-label="Hạn sử dụng" value={importForm.expiry_date} onChange={(e) => setImportForm({ ...importForm, expiry_date: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedSupply(null)} className="rounded-xl border border-border px-4 py-2">Hủy</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">Nhập kho</button></div></form></div>}
    </div>
  )
}
