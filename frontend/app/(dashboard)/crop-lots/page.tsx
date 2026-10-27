'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Ruler,
  Layers,
  Mountain,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'

interface CropLot {
  id: number
  code: string
  name: string
  area?: number | string
  soil_type?: string
  crop_type?: string
  status?: 'Đang canh tác' | 'Tạm nghỉ' | 'Chuẩn bị đất' | string
  location?: string
  notes?: string
  description?: string
  created_at?: string
}

const CANDIDATE_ENDPOINTS = [
  '/api/v1/plots',
  '/api/plots',
  '/api/v1/land-plots',
  '/api/land-plots',
]

function parseLotsArray(data: any): CropLot[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.lots)) return data.lots
  if (Array.isArray(data.plots)) return data.plots
  if (Array.isArray(data.result)) return data.result
  return []
}

export default function CropLotsPage() {
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUserRole(parsedUser.role)
      } catch (error) {
        console.error('Lỗi khi đọc dữ liệu user:', error)
      }
    }
  }, [])

  const canCreate = checkPermission(userRole, (PERMISSIONS as any).CROP_LOT_CREATE || (PERMISSIONS as any).PLOT_CREATE || 'crop_lot:create')
  const canUpdate = checkPermission(userRole, (PERMISSIONS as any).CROP_LOT_UPDATE || (PERMISSIONS as any).PLOT_UPDATE || 'crop_lot:update')
  const canDelete = checkPermission(userRole, (PERMISSIONS as any).CROP_LOT_DELETE || (PERMISSIONS as any).PLOT_DELETE || 'crop_lot:delete')

  const [activeEndpoint, setActiveEndpoint] = useState<string>('/api/v1/plots')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const smartFetcher = async () => {
    let lastErr: any = null
    for (const endpoint of CANDIDATE_ENDPOINTS) {
      try {
        const res = await api(endpoint, { method: 'GET' })
        setActiveEndpoint(endpoint)
        setErrorMessage(null)
        return parseLotsArray(res)
      } catch (err: any) {
        lastErr = err
      }
    }
    setErrorMessage('Chưa tìm thấy API Lô đất tương thích trên Server Backend.')
    return []
  }

  const { data: lots = [], isLoading, mutate } = useSWR('/api/smart-crop-lots', smartFetcher)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('Tất cả trạng thái')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingLot, setEditingLot] = useState<CropLot | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    area: '',
    soil_type: 'Đất thịt',
    status: 'Đang canh tác',
    location: '',
    notes: '',
  })

  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
        setSuccessMessage(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, successMessage])

  const handleOpenAddModal = () => {
    setEditingLot(null)
    setFormData({
      code: `LO-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      area: '',
      soil_type: 'Đất thịt',
      status: 'Đang canh tác',
      location: '',
      notes: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (lot: CropLot) => {
    setEditingLot(lot)
    setFormData({
      code: lot.code || '',
      name: lot.name || '',
      area: lot.area ? String(lot.area) : '',
      soil_type: lot.soil_type || lot.crop_type || 'Đất thịt',
      status: lot.status || 'Đang canh tác',
      location: lot.location || '',
      notes: lot.notes || lot.description || '',
    })
    setIsModalOpen(true)
  }

  async function executeRequest(method: 'POST' | 'PUT' | 'DELETE', payload?: any, id?: number) {
    const targetEndpoints = activeEndpoint
      ? [activeEndpoint, ...CANDIDATE_ENDPOINTS.filter((e) => e !== activeEndpoint)]
      : CANDIDATE_ENDPOINTS

    let lastError: any = null

    for (const ep of targetEndpoints) {
      const url = id ? `${ep}/${id}` : ep
      try {
        const res = await api(url, {
          method,
          body: payload ? JSON.stringify(payload) : undefined,
        })
        setActiveEndpoint(ep)
        return res
      } catch (err: any) {
        lastError = err
        if (err?.status === 404 || err?.message?.includes('Not Found')) {
          continue
        }
        throw err
      }
    }
    throw lastError || new Error('Không thể kết nối đến API Lô đất.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMessage('Vui lòng nhập Mã lô và Tên lô đất.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      area: formData.area ? parseFloat(formData.area) || formData.area : 0,
      soil_type: formData.soil_type,
      status: formData.status,
      location: formData.location.trim(),
      notes: formData.notes.trim(),
    }

    try {
      if (editingLot) {
        await executeRequest('PUT', payload, editingLot.id)
        setSuccessMessage('Cập nhật thông tin lô đất thành công!')
      } else {
        await executeRequest('POST', payload)
        setSuccessMessage('Thêm lô đất mới thành công!')
      }

      await mutate()
      setIsModalOpen(false)
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : 'Lỗi kết nối Backend. Vui lòng kiểm tra Server Backend.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lô đất này không?')) return

    try {
      await executeRequest('DELETE', undefined, id)
      setSuccessMessage('Xóa lô đất thành công!')
      await mutate()
    } catch (err) {
      setErrorMessage('Không thể xóa lô đất. Kiểm tra lại kết nối Backend.')
    }
  }

  const filteredLots = lots.filter((lot) => {
    const matchSearch =
      lot.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.soil_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.crop_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.location?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus =
      filterStatus === 'Tất cả trạng thái' || lot.status === filterStatus

    return matchSearch && matchStatus
  })

  const totalArea = lots.reduce((acc, lot) => acc + (Number(lot.area) || 0), 0)
  const activeLotsCount = lots.filter((l) => l.status === 'Đang canh tác').length

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Thông báo lỗi & thành công */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="size-5 shrink-0 text-red-600" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Thanh công cụ: Tìm kiếm & Nút thêm mới */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã lô, tên lô đất, loại đất..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-[#1b3e2b]/30 focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="relative shrink-0 w-full sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white pl-4 pr-10 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#1b3e2b]/30 focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            >
              <option value="Tất cả trạng thái">Tất cả trạng thái</option>
              <option value="Đang canh tác">Đang canh tác</option>
              <option value="Tạm nghỉ">Tạm nghỉ</option>
              <option value="Chuẩn bị đất">Chuẩn bị đất</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#1b3e2b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021] active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Thêm lô đất mới
          </button>
        )}
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-xl bg-[#1b3e2b]/10 p-2.5 text-[#1b3e2b] dark:bg-emerald-500/10 dark:text-emerald-400">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Tổng số lô đất
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {lots.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <Ruler className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Tổng diện tích
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {totalArea > 0 ? `${totalArea.toLocaleString()} m²` : '--'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
            <Mountain className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Đang canh tác
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {activeLotsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Danh sách Lô đất */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
            Đang tải dữ liệu lô đất...
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            Chưa có lô đất nào hoặc không tìm thấy dữ liệu phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredLots.map((lot) => (
              <div
                key={lot.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#f8faf8] p-5 transition hover:border-[#1b3e2b]/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#1b3e2b] dark:text-emerald-400">
                        {lot.code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {lot.name}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        lot.status === 'Đang canh tác'
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : lot.status === 'Chuẩn bị đất'
                            ? 'border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'border-slate-300 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {lot.status || 'Đang canh tác'}
                    </span>
                  </div>

                  <div className="space-y-2 py-2 text-xs text-slate-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Mountain className="size-4 shrink-0 text-slate-400" />
                      <span>
                        Loại đất:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {lot.soil_type || lot.crop_type || 'Chưa xác định'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Ruler className="size-4 shrink-0 text-slate-400" />
                      <span>
                        Diện tích:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {lot.area ? `${lot.area} m²` : 'Chưa cập nhật'}
                        </strong>
                      </span>
                    </div>

                    {lot.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 shrink-0 text-slate-400" />
                        <span>
                          Vị trí:{' '}
                          <strong className="text-slate-900 dark:text-white">
                            {lot.location}
                          </strong>
                        </span>
                      </div>
                    )}

                    {(lot.notes || lot.description) && (
                      <p className="mt-2 text-xs italic text-slate-600 dark:text-zinc-400 line-clamp-2">
                        "{lot.notes || lot.description}"
                      </p>
                    )}
                  </div>
                </div>

                {(canUpdate || canDelete) && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3 dark:border-zinc-800">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenEditModal(lot)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <Pencil className="size-3.5" />
                        Sửa
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(lot.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                        Xóa
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Thêm / Sửa Lô đất */}
      {(canCreate || canUpdate) && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingLot ? 'Chỉnh sửa Lô đất' : 'Thêm Lô đất mới'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Mã lô đất *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: LO-01"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Tên lô đất *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Lô Đất Phía Bắc"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Diện tích (m²)
                  </label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="VD: 1200"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Loại đất
                  </label>
                  <select
                    value={formData.soil_type}
                    onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="Đất thịt">Đất thịt (Loam)</option>
                    <option value="Đất cát">Đất cát</option>
                    <option value="Đất phù sa">Đất phù sa</option>
                    <option value="Đất đỏ bazan">Đất đỏ bazan</option>
                    <option value="Đất sét">Đất sét</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="Đang canh tác">Đang canh tác</option>
                    <option value="Tạm nghỉ">Tạm nghỉ</option>
                    <option value="Chuẩn bị đất">Chuẩn bị đất</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Vị trí / Tọa độ
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="VD: Khu A - Hàng 1..5"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về chất đất, hệ thống tưới..."
                  className="w-full resize-none rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl bg-slate-200/80 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1b3e2b] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021] disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingLot ? 'Cập nhật' : 'Lưu lô đất'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}