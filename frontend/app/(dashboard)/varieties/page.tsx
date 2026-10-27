'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  Sprout,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronDown,
  Package,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'

interface CropVariety {
  id: number
  code: string
  name: string
  growth_days?: number
  stock_quantity?: number
  unit?: string
  expected_yield?: string
  status?: 'active' | 'inactive' | 'testing' | string
  description?: string
  created_at?: string
}

const CANDIDATE_ENDPOINTS = [
  '/api/v1/varieties',
  '/api/varieties',
  '/api/v1/crop-varieties',
  '/api/crop-varieties',
]

function parseVarietiesArray(data: any): CropVariety[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.varieties)) return data.varieties
  return []
}

export default function VarietiesPage() {
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const rawRole = parsedUser.role || parsedUser.user?.role || ''
        setUserRole(String(rawRole).toLowerCase().trim())
      } catch (error) {
        console.error('Lỗi khi đọc dữ liệu user:', error)
      }
    }
  }, [])

  const allowedRoles = ['admin', 'manager', 'technician', 'tech', 'kythuatvien']
  const isAuthorizedRole = allowedRoles.includes(userRole)

  const canCreate = isAuthorizedRole || checkPermission(userRole, (PERMISSIONS as any).VARIETY_CREATE || 'variety:create')
  const canUpdate = isAuthorizedRole || checkPermission(userRole, (PERMISSIONS as any).VARIETY_UPDATE || 'variety:update')
  const canDelete = isAuthorizedRole || checkPermission(userRole, (PERMISSIONS as any).VARIETY_DELETE || 'variety:delete')

  const [activeEndpoint, setActiveEndpoint] = useState<string>('/api/v1/varieties')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const smartFetcher = async () => {
    let lastErr: any = null
    for (const endpoint of CANDIDATE_ENDPOINTS) {
      try {
        const res = await api(endpoint, { method: 'GET' })
        setActiveEndpoint(endpoint)
        setErrorMessage(null)
        return parseVarietiesArray(res)
      } catch (err: any) {
        lastErr = err
      }
    }
    setErrorMessage('Chưa tìm thấy API Giống cây trồng tương thích trên Server Backend.')
    return []
  }

  const { data: varieties = [], isLoading, mutate } = useSWR('/api/smart-varieties', smartFetcher)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingVariety, setEditingVariety] = useState<CropVariety | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    growth_days: '',
    stock_quantity: '',
    unit: 'cây',
    expected_yield: '',
    status: 'active',
    description: '',
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
    setEditingVariety(null)
    setFormData({
      code: `GC-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      growth_days: '60',
      stock_quantity: '',
      unit: 'cây',
      expected_yield: '2.5 kg/m²',
      status: 'active',
      description: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (variety: CropVariety) => {
    setEditingVariety(variety)
    setFormData({
      code: variety.code || '',
      name: variety.name || '',
      growth_days: variety.growth_days ? String(variety.growth_days) : '',
      stock_quantity: variety.stock_quantity !== undefined && variety.stock_quantity !== null
        ? String(variety.stock_quantity)
        : '',
      unit: variety.unit || 'cây',
      expected_yield: variety.expected_yield || '',
      status: variety.status || 'active',
      description: variety.description || '',
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
    throw lastError || new Error('Không thể kết nối đến API Giống cây.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMessage('Vui lòng nhập Mã giống và Tên giống cây.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      growth_days: parseInt(formData.growth_days) || 0,
      stock_quantity: formData.stock_quantity ? parseFloat(formData.stock_quantity) : 0,
      unit: formData.unit || 'cây',
      expected_yield: formData.expected_yield.trim(),
      status: formData.status,
      description: formData.description.trim(),
    }

    try {
      if (editingVariety) {
        await executeRequest('PUT', payload, editingVariety.id)
        setSuccessMessage('Cập nhật thông tin giống cây thành công!')
      } else {
        await executeRequest('POST', payload)
        setSuccessMessage('Thêm giống cây mới thành công!')
      }

      await mutate()
      setIsModalOpen(false)
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Lỗi kết nối Backend. Vui lòng kiểm tra Server.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!canDelete) return
    if (!confirm('Bạn có chắc chắn muốn xóa giống cây này không?')) return

    try {
      await executeRequest('DELETE', undefined, id)
      setSuccessMessage('Xóa giống cây thành công!')
      await mutate()
    } catch (err) {
      setErrorMessage('Không thể xóa giống cây. Kiểm tra lại kết nối Backend.')
    }
  }

  const filteredVarieties = varieties.filter((v) => {
    const matchesSearch =
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const currentStatus = (v.status || 'active').toLowerCase()
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
      case 'Đang canh tác':
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Đang canh tác</span>
      case 'inactive':
      case 'Tạm nghỉ':
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Tạm nghỉ</span>
      case 'testing':
      case 'Thử nghiệm':
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Thử nghiệm</span>
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">Đang canh tác</span>
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm">
          <AlertCircle className="size-5 shrink-0 text-red-600" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã giống, tên giống cây..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-300/80 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="relative inline-block w-full sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-full border border-slate-300/90 bg-white px-4 py-2 pr-10 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang canh tác</option>
              <option value="inactive">Tạm nghỉ</option>
              <option value="testing">Thử nghiệm</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#1b3e2b] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021]"
          >
            <Plus className="size-4" />
            Thêm giống cây mới
          </button>
        )}
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
            Đang tải dữ liệu giống cây...
          </div>
        ) : filteredVarieties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            Không tìm thấy giống cây nào phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredVarieties.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#f8faf8] p-5 transition hover:border-[#1b3e2b]/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-[#1b3e2b]/10 px-2 py-0.5 text-xs font-bold text-[#1b3e2b] dark:bg-emerald-500/10 dark:text-emerald-400">
                      {item.code}
                    </span>
                    {renderStatusBadge(item.status)}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.name}</h3>
                    <Sprout className="size-5 text-[#1b3e2b] dark:text-emerald-400" />
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-slate-400" />
                      <span>Chu kỳ sinh trưởng: <strong className="text-slate-900 dark:text-white">{item.growth_days || 0} ngày</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="size-4 text-slate-400" />
                      <span>Tồn kho: <strong className="text-slate-900 dark:text-white">{item.stock_quantity ?? 0} {item.unit || 'cây'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-slate-400" />
                      <span>Năng suất dự kiến: <strong className="text-slate-900 dark:text-white">{item.expected_yield || 'Chưa rõ'}</strong></span>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-xs italic text-slate-500 dark:text-zinc-400 line-clamp-2">
                        "{item.description}"
                      </p>
                    )}
                  </div>
                </div>

                {(canUpdate || canDelete) && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3 dark:border-zinc-800">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <Pencil className="size-3.5" /> Sửa
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                      >
                        <Trash2 className="size-3.5" /> Xóa
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {(canCreate || canUpdate) && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingVariety ? 'Sửa Giống Cây Trồng' : 'Thêm Giống Cây Trồng'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Mã giống *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Tên giống cây *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Cà chua Cherry Red"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Chu kỳ (ngày)</label>
                  <input
                    type="number"
                    value={formData.growth_days}
                    onChange={(e) => setFormData({ ...formData, growth_days: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Năng suất dự kiến</label>
                  <input
                    type="text"
                    value={formData.expected_yield}
                    onChange={(e) => setFormData({ ...formData, expected_yield: e.target.value })}
                    placeholder="VD: 3.5 kg/m²"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Số lượng tồn kho</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="VD: 100"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Đơn vị tính</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="cây">cây</option>
                    <option value="hạt">hạt</option>
                    <option value="kg">kg</option>
                    <option value="gói">gói</option>
                    <option value="khay">khay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Trạng thái canh tác</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="active">Đang canh tác</option>
                  <option value="testing">Thử nghiệm</option>
                  <option value="inactive">Tạm nghỉ</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Mô tả đặc tính</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú về nhiệt độ thích hợp, độ pH đất..."
                  className="w-full resize-none rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl bg-slate-200/80 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1b3e2b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#143021]"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Lưu giống cây
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}