'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Tabs } from '@base-ui/react/tabs'
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
  Ruler,
  Layers,
  Mountain,
  WandSparkles,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'
import { GlideSelect } from '@/components/effects/greenfarm-motion'
import { ActionMenu } from '@/components/ui/action-menu'

const FIELD_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white'
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300'
const IRRIGATION_OPTIONS = [
  'Tưới nhỏ giọt',
  'Phun sương',
  'Phun mưa',
  'Tưới thủ công',
] as const

type CropLotFormData = {
  code: string
  name: string
  area: string
  area_unit: 'm²' | 'ha'
  soil_type: string
  status: string
  cultivation_model: string
  irrigation_systems: string[]
  ph_current: string
  ec_ms_cm: string
  previous_crop: string
  notes: string
}

const EMPTY_FORM: CropLotFormData = {
  code: '',
  name: '',
  area: '',
  area_unit: 'm²',
  soil_type: 'Đất thịt',
  status: 'Trống',
  cultivation_model: 'Đất ngoài trời',
  irrigation_systems: [],
  ph_current: '',
  ec_ms_cm: '',
  previous_crop: '',
  notes: '',
}

interface CropLot {
  id: number
  code: string
  name: string
  area?: number | string
  soil_type?: string
  crop_type?: string
  cultivation_model?: string | null
  irrigation_systems?: string[] | null
  ph_current?: number | null
  ec_ms_cm?: number | null
  previous_crop?: string | null
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

  const canCreate = checkPermission(userRole, PERMISSIONS.CROP_LOT_CREATE)
  const canUpdate = checkPermission(userRole, PERMISSIONS.CROP_LOT_UPDATE)
  const canDelete = checkPermission(userRole, PERMISSIONS.CROP_LOT_DELETE)

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
  const [filterSoil, setFilterSoil] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingLot, setEditingLot] = useState<CropLot | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<CropLotFormData>(EMPTY_FORM)
  const reduceMotion = useReducedMotion()
  const activeTabIndex = ['basic', 'infrastructure', 'soil'].indexOf(activeTab)

  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
        setSuccessMessage(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, successMessage])

  useEffect(() => {
    if (!isModalOpen) return

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const dialog = document.querySelector<HTMLElement>('[data-crop-lot-dialog]')
    const getFocusableElements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null)

    getFocusableElements()[0]?.focus()

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsModalOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown)
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown)
      previousFocus?.focus()
    }
  }, [isModalOpen])

  const handleOpenAddModal = () => {
    setEditingLot(null)
    setFormData({ ...EMPTY_FORM })
    setActiveTab('basic')
    setFormErrorMessage(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (lot: CropLot) => {
    setEditingLot(lot)
    setFormData({
      code: lot.code || '',
      name: lot.name || '',
      area: lot.area ? String(lot.area) : '',
      area_unit: 'm²',
      soil_type: lot.soil_type || lot.crop_type || 'Đất thịt',
      status: lot.status || 'Đang canh tác',
      cultivation_model: lot.cultivation_model || 'Đất ngoài trời',
      irrigation_systems: lot.irrigation_systems || [],
      ph_current: lot.ph_current != null ? String(lot.ph_current) : '',
      ec_ms_cm: lot.ec_ms_cm != null ? String(lot.ec_ms_cm) : '',
      previous_crop: lot.previous_crop || '',
      notes: lot.notes || lot.description || '',
    })
    setActiveTab('basic')
    setFormErrorMessage(null)
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
    const code = formData.code.trim() || `LO-${Math.floor(100 + Math.random() * 900)}`
    if (!formData.code.trim()) {
      setFormData((current) => ({ ...current, code }))
    }
    if (!formData.name.trim()) {
      setActiveTab('basic')
      setFormErrorMessage('Vui lòng nhập tên lô đất.')
      return
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/.test(code)) {
      setActiveTab('basic')
      setFormErrorMessage('Mã lô chỉ được chứa chữ, số, dấu gạch ngang hoặc gạch dưới (2–50 ký tự).')
      return
    }

    const enteredArea = Number(formData.area)
    if (!formData.area.trim() || !Number.isFinite(enteredArea) || enteredArea <= 0) {
      setActiveTab('infrastructure')
      setFormErrorMessage('Diện tích phải là số lớn hơn 0.')
      return
    }

    const phCurrent = formData.ph_current.trim() ? Number(formData.ph_current) : null
    if (phCurrent !== null && (!Number.isFinite(phCurrent) || phCurrent < 1 || phCurrent > 14)) {
      setActiveTab('soil')
      setFormErrorMessage('pH đất phải nằm trong khoảng 1–14.')
      return
    }
    const ecValue = formData.ec_ms_cm.trim() ? Number(formData.ec_ms_cm) : null
    if (ecValue !== null && (!Number.isFinite(ecValue) || ecValue < 0 || ecValue > 100)) {
      setActiveTab('soil')
      setFormErrorMessage('Độ EC phải là số từ 0 đến 100 mS/cm.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      code: code.toUpperCase(),
      name: formData.name.trim(),
      area: enteredArea * (formData.area_unit === 'ha' ? 10000 : 1),
      soil_type: formData.soil_type,
      status: formData.status,
      cultivation_model: formData.cultivation_model,
      irrigation_systems: formData.irrigation_systems,
      ph_current: phCurrent,
      ec_ms_cm: ecValue,
      previous_crop: formData.previous_crop.trim() || null,
      description: formData.notes.trim() || null,
    }
    setFormErrorMessage(null)

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
      setFormErrorMessage(null)
    } catch (err) {
      setFormErrorMessage(
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

  const filteredLots = useMemo(() => lots.filter((lot) => {
    const matchSearch =
      lot.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.soil_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.crop_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.location?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus =
      filterStatus === 'Tất cả trạng thái' || lot.status === filterStatus
    const matchSoil =
      filterSoil === 'all' || (lot.soil_type || lot.crop_type || '') === filterSoil

    return matchSearch && matchStatus && matchSoil
  }), [lots, searchTerm, filterStatus, filterSoil])

  const totalArea = useMemo(
    () => lots.reduce((acc, lot) => acc + (Number(lot.area) || 0), 0),
    [lots],
  )
  const activeLotsCount = useMemo(
    () => lots.filter((l) => l.status === 'Đang canh tác').length,
    [lots],
  )
  const soilOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả loại đất' },
      ...Array.from(
        new Set(lots.map((lot) => lot.soil_type || lot.crop_type).filter(Boolean)),
      ).map((soil) => ({ value: soil as string, label: soil as string })),
    ],
    [lots],
  )

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

          <GlideSelect
            label="Lọc theo trạng thái"
            className="w-full sm:w-48"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'Tất cả trạng thái', label: 'Tất cả trạng thái' },
              { value: 'Trống', label: 'Trống' },
              { value: 'Đang canh tác', label: 'Đang canh tác' },
              { value: 'Đang cải tạo/Nghỉ đất', label: 'Đang cải tạo/Nghỉ đất' },
              { value: 'Tạm nghỉ', label: 'Tạm nghỉ' },
              { value: 'Chuẩn bị đất', label: 'Chuẩn bị đất' },
            ]}
          />
          <GlideSelect
            label="Lọc theo loại đất"
            className="w-full sm:w-44"
            value={filterSoil}
            onChange={setFilterSoil}
            options={soilOptions}
          />
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
      <section aria-label="Danh sách lô đất">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500" role="status">
            <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
            Đang tải dữ liệu lô đất...
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center text-sm text-slate-500">
            Chưa có lô đất nào hoặc không tìm thấy dữ liệu phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLots.map((lot) => (
              <div
                key={lot.id}
                className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {lot.code}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        lot.status === 'Đang canh tác'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : lot.status === 'Chuẩn bị đất'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {lot.status || 'Đang canh tác'}
                    </span>
                  </div>
                  {(canUpdate || canDelete) && (
                    <ActionMenu
                      label={`Thao tác với lô đất ${lot.name}`}
                      items={[
                        ...(canUpdate
                          ? [{
                              label: 'Sửa lô đất',
                              icon: Pencil,
                              onSelect: () => handleOpenEditModal(lot),
                            }]
                          : []),
                        ...(canDelete
                          ? [{
                              label: 'Xóa lô đất',
                              icon: Trash2,
                              onSelect: () => handleDelete(lot.id),
                              destructive: true,
                            }]
                          : []),
                      ]}
                    />
                  )}
                </div>

                <h3 className="mt-3 truncate text-base font-semibold text-slate-800 dark:text-white">
                  {lot.name}
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                      <Mountain className="size-3.5 shrink-0" aria-hidden="true" />
                      Loại đất
                    </p>
                    <p className="mt-1 truncate pl-5 text-sm font-medium text-slate-800 dark:text-zinc-200">
                      {lot.soil_type || lot.crop_type || 'Chưa xác định'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                      <Ruler className="size-3.5 shrink-0" aria-hidden="true" />
                      Diện tích
                    </p>
                    <p className="mt-1 truncate pl-5 text-sm font-medium text-slate-800 dark:text-zinc-200">
                      {lot.area ? `${lot.area} m²` : 'Chưa cập nhật'}
                    </p>
                  </div>

                  {lot.location && (
                    <div className="col-span-2 min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                        Vị trí
                      </p>
                      <p className="mt-1 truncate pl-5 text-sm font-medium text-slate-800 dark:text-zinc-200">
                        {lot.location}
                      </p>
                    </div>
                  )}
                </div>

                {(lot.notes || lot.description) && (
                  <p className="mt-3 line-clamp-2 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                    {lot.notes || lot.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Thêm / Sửa Lô đất */}
      {(canCreate || canUpdate) && isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-lot-form-title"
            data-crop-lot-dialog
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/95 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-7">
              <div>
                <h2 id="crop-lot-form-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingLot ? 'Cập nhật lô đất' : 'Thêm lô đất mới'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  Khai báo quy mô, hạ tầng và các chỉ số phục vụ theo dõi canh tác.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Đóng biểu mẫu"
              >
                <X className="size-5" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
              {formErrorMessage && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{formErrorMessage}</span>
                </div>
              )}

              <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(String(value))}>
                <Tabs.List
                  className="rubber-segment crop-lot-tabs"
                  style={{ ['--segment-count' as string]: 3 }}
                >
                  <motion.span
                    className="rubber-segment__thumb crop-lot-tabs__thumb pointer-events-none"
                    aria-hidden="true"
                    animate={{ x: `${Math.max(0, activeTabIndex) * 100}%` }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 430, damping: 34 }
                    }
                  />
                  <Tabs.Tab
                    value="basic"
                    className="rubber-segment__item px-2 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-800 sm:text-sm"
                  >
                    Thông tin cơ bản
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="infrastructure"
                    className="rubber-segment__item px-2 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-800 sm:text-sm"
                  >
                    Hạ tầng & diện tích
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="soil"
                    className="rubber-segment__item px-2 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-800 sm:text-sm"
                  >
                    Thổ dưỡng & ghi chú
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="basic" className="space-y-4 py-5 outline-none">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="crop-lot-code" className={LABEL_CLASS}>Mã lô đất</label>
                      <div className="flex gap-2">
                        <input
                          id="crop-lot-code"
                          type="text"
                          maxLength={50}
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="LO-123"
                          className={FIELD_CLASS}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((current) => ({
                            ...current,
                            code: `LO-${Math.floor(100 + Math.random() * 900)}`,
                          }))}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-800/20 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950"
                        >
                          <WandSparkles className="size-4" />
                          Tự sinh
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="crop-lot-name" className={LABEL_CLASS}>Tên lô đất *</label>
                      <input
                        id="crop-lot-name"
                        type="text"
                        maxLength={150}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Lô rau phía Bắc"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="crop-lot-soil-type" className={LABEL_CLASS}>Loại đất</label>
                      <select id="crop-lot-soil-type" value={formData.soil_type} onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })} className={FIELD_CLASS}>
                        <option value="Đất thịt">Đất thịt</option>
                        <option value="Đất cát">Đất cát</option>
                        <option value="Đất phù sa">Đất phù sa</option>
                        <option value="Đất đỏ bazan">Đất đỏ bazan</option>
                        <option value="Đất phèn/sét">Đất phèn / sét</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="crop-lot-status" className={LABEL_CLASS}>Trạng thái lô đất</label>
                      <select id="crop-lot-status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={FIELD_CLASS}>
                        <option value="Trống">Trống</option>
                        <option value="Đang canh tác">Đang canh tác</option>
                        <option value="Đang cải tạo/Nghỉ đất">Đang cải tạo / Nghỉ đất</option>
                      </select>
                    </div>
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="infrastructure" className="space-y-5 py-5 outline-none">
                  <div>
                    <label htmlFor="crop-lot-area" className={LABEL_CLASS}>Diện tích *</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <input
                        id="crop-lot-area"
                        type="number"
                        min="0"
                        step="any"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        placeholder={formData.area_unit === 'ha' ? 'VD: 0.5' : 'VD: 1,200'}
                        className={FIELD_CLASS}
                      />
                      <select
                        aria-label="Đơn vị diện tích"
                        value={formData.area_unit}
                        onChange={(e) => setFormData({ ...formData, area_unit: e.target.value as CropLotFormData['area_unit'] })}
                        className={`${FIELD_CLASS} w-24`}
                      >
                        <option value="m²">m²</option>
                        <option value="ha">ha</option>
                      </select>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                      Giá trị được lưu quy đổi về mét vuông.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="crop-lot-cultivation-model" className={LABEL_CLASS}>Mô hình canh tác</label>
                    <select
                      id="crop-lot-cultivation-model"
                      value={formData.cultivation_model}
                      onChange={(e) => setFormData({ ...formData, cultivation_model: e.target.value })}
                      className={FIELD_CLASS}
                    >
                      <option value="Đất ngoài trời">Đất ngoài trời</option>
                      <option value="Nhà kính/Nhà màng">Nhà kính / Nhà màng</option>
                      <option value="Thủy canh">Thủy canh</option>
                      <option value="Khay tầng">Khay tầng</option>
                    </select>
                  </div>

                  <fieldset>
                    <legend className={LABEL_CLASS}>Hệ thống tưới</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {IRRIGATION_OPTIONS.map((system) => (
                        <label
                          key={system}
                          className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors hover:border-emerald-800/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        >
                          <input
                            type="checkbox"
                            checked={formData.irrigation_systems.includes(system)}
                            onChange={(e) => setFormData((current) => ({
                              ...current,
                              irrigation_systems: e.target.checked
                                ? [...current.irrigation_systems, system]
                                : current.irrigation_systems.filter((item) => item !== system),
                            }))}
                            className="size-4 rounded border-slate-300 accent-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800"
                          />
                          {system}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </Tabs.Panel>

                <Tabs.Panel value="soil" className="space-y-4 py-5 outline-none">
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Ghi nhận nhanh để đối chiếu chất đất và theo dõi dữ liệu cảm biến.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="crop-lot-ph" className={LABEL_CLASS}>pH đất hiện tại</label>
                      <input
                        id="crop-lot-ph"
                        type="number"
                        min="1"
                        max="14"
                        step="0.1"
                        value={formData.ph_current}
                        onChange={(e) => setFormData({ ...formData, ph_current: e.target.value })}
                        placeholder="VD: 6.2"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="crop-lot-ec" className={LABEL_CLASS}>Độ EC / độ mặn (mS/cm)</label>
                      <input
                        id="crop-lot-ec"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.ec_ms_cm}
                        onChange={(e) => setFormData({ ...formData, ec_ms_cm: e.target.value })}
                        placeholder="VD: 1.2"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="crop-lot-previous-crop" className={LABEL_CLASS}>Cây trồng vụ trước</label>
                    <input
                      id="crop-lot-previous-crop"
                      type="text"
                      maxLength={150}
                      value={formData.previous_crop}
                      onChange={(e) => setFormData({ ...formData, previous_crop: e.target.value })}
                      placeholder="VD: Cà chua, rau cải"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="crop-lot-notes" className={LABEL_CLASS}>Ghi chú chất đất & hệ thống tưới</label>
                    <textarea
                      id="crop-lot-notes"
                      rows={4}
                      maxLength={2000}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Ghi chú đặc điểm đất, lịch sử cải tạo hoặc lưu ý vận hành tưới..."
                      className={`${FIELD_CLASS} resize-y`}
                    />
                  </div>
                </Tabs.Panel>
              </Tabs.Root>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingLot ? 'Lưu thay đổi' : 'Lưu lô đất'}
                </button>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}