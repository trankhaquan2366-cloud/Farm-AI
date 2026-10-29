'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
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
  WandSparkles,
} from 'lucide-react'
import { Tabs } from '@base-ui/react/tabs'
import { api, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'
import { ActionMenu } from '@/components/ui/action-menu'

const SEASONS = ['Xuân', 'Hè', 'Thu', 'Đông', 'Quanh năm'] as const
const FIELD_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white'
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300'

type VarietyFormData = {
  code: string
  name: string
  supplier: string
  growth_days: string
  germination_day: string
  development_day: string
  harvest_day: string
  stock_quantity: string
  unit: string
  expected_yield_value: string
  expected_yield_unit: string
  suitable_seasons: string[]
  ph_min: string
  ph_max: string
  temperature_min: string
  temperature_max: string
  air_humidity_min: string
  air_humidity_max: string
  soil_humidity_min: string
  soil_humidity_max: string
  status: string
  description: string
}

const EMPTY_FORM: VarietyFormData = {
  code: '',
  name: '',
  supplier: '',
  growth_days: '',
  germination_day: '',
  development_day: '',
  harvest_day: '',
  stock_quantity: '',
  unit: 'gói',
  expected_yield_value: '',
  expected_yield_unit: 'kg/m²',
  suitable_seasons: [],
  ph_min: '',
  ph_max: '',
  temperature_min: '',
  temperature_max: '',
  air_humidity_min: '',
  air_humidity_max: '',
  soil_humidity_min: '',
  soil_humidity_max: '',
  status: 'active',
  description: '',
}

interface CropVariety {
  id: number
  code: string
  name: string
  supplier?: string | null
  category?: string | null
  growth_days?: number
  germination_day?: number | null
  development_day?: number | null
  harvest_day?: number | null
  stock_quantity?: number
  unit?: string
  expected_yield?: string
  expected_yield_value?: number | null
  expected_yield_unit?: string | null
  suitable_seasons?: string[]
  ph_min?: number | null
  ph_max?: number | null
  temperature_min?: number | null
  temperature_max?: number | null
  air_humidity_min?: number | null
  air_humidity_max?: number | null
  soil_humidity_min?: number | null
  soil_humidity_max?: number | null
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

  const canCreate = checkPermission(userRole, PERMISSIONS.VARIETY_CREATE)
  const canUpdate = checkPermission(userRole, PERMISSIONS.VARIETY_UPDATE)
  const canDelete = checkPermission(userRole, PERMISSIONS.VARIETY_DELETE)

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
  const [activeTab, setActiveTab] = useState('general')
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<VarietyFormData>(EMPTY_FORM)
  const reduceMotion = useReducedMotion()
  const activeTabIndex = ['general', 'cycle', 'technical'].indexOf(activeTab)

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
    const dialog = document.querySelector<HTMLElement>('[data-variety-dialog]')
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
    setEditingVariety(null)
    setFormData({ ...EMPTY_FORM })
    setActiveTab('general')
    setFormErrorMessage(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (variety: CropVariety) => {
    setEditingVariety(variety)
    setFormData({
      code: variety.code || '',
      name: variety.name || '',
      supplier: variety.supplier || '',
      growth_days: variety.growth_days ? String(variety.growth_days) : '',
      germination_day: variety.germination_day != null ? String(variety.germination_day) : '',
      development_day: variety.development_day != null ? String(variety.development_day) : '',
      harvest_day: variety.harvest_day != null ? String(variety.harvest_day) : '',
      stock_quantity: variety.stock_quantity !== undefined && variety.stock_quantity !== null
        ? String(variety.stock_quantity)
        : '',
      unit: variety.unit || 'gói',
      expected_yield_value: variety.expected_yield_value != null ? String(variety.expected_yield_value) : '',
      expected_yield_unit: variety.expected_yield_unit || 'kg/m²',
      suitable_seasons: variety.suitable_seasons || [],
      ph_min: variety.ph_min != null ? String(variety.ph_min) : '',
      ph_max: variety.ph_max != null ? String(variety.ph_max) : '',
      temperature_min: variety.temperature_min != null ? String(variety.temperature_min) : '',
      temperature_max: variety.temperature_max != null ? String(variety.temperature_max) : '',
      air_humidity_min: variety.air_humidity_min != null ? String(variety.air_humidity_min) : '',
      air_humidity_max: variety.air_humidity_max != null ? String(variety.air_humidity_max) : '',
      soil_humidity_min: variety.soil_humidity_min != null ? String(variety.soil_humidity_min) : '',
      soil_humidity_max: variety.soil_humidity_max != null ? String(variety.soil_humidity_max) : '',
      status: variety.status || 'active',
      description: variety.description || '',
    })
    setActiveTab('general')
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
    throw lastError || new Error('Không thể kết nối đến API Giống cây.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = formData.code.trim() ||
      `GC-${Date.now().toString(36).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`
    if (!formData.code.trim()) {
      setFormData((current) => ({ ...current, code }))
    }
    const name = formData.name.trim()
    if (!name) {
      setActiveTab('general')
      setFormErrorMessage('Vui lòng nhập tên giống cây.')
      return
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/.test(code)) {
      setActiveTab('general')
      setFormErrorMessage('Mã giống chỉ được chứa chữ, số, dấu gạch ngang hoặc gạch dưới (2–50 ký tự).')
      return
    }

    const parseOptionalNumber = (value: string) => {
      if (!value.trim()) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : Number.NaN
    }
    const numericFields = {
      stock_quantity: parseOptionalNumber(formData.stock_quantity),
      growth_days: parseOptionalNumber(formData.growth_days),
      germination_day: parseOptionalNumber(formData.germination_day),
      development_day: parseOptionalNumber(formData.development_day),
      harvest_day: parseOptionalNumber(formData.harvest_day),
      expected_yield_value: parseOptionalNumber(formData.expected_yield_value),
      ph_min: parseOptionalNumber(formData.ph_min),
      ph_max: parseOptionalNumber(formData.ph_max),
      temperature_min: parseOptionalNumber(formData.temperature_min),
      temperature_max: parseOptionalNumber(formData.temperature_max),
      air_humidity_min: parseOptionalNumber(formData.air_humidity_min),
      air_humidity_max: parseOptionalNumber(formData.air_humidity_max),
      soil_humidity_min: parseOptionalNumber(formData.soil_humidity_min),
      soil_humidity_max: parseOptionalNumber(formData.soil_humidity_max),
    }
    if (Object.values(numericFields).some((value) => value !== null && !Number.isFinite(value))) {
      setFormErrorMessage('Vui lòng nhập giá trị số hợp lệ.')
      return
    }

    const bounds: [keyof typeof numericFields, number, number, string][] = [
      ['stock_quantity', 0, Number.MAX_SAFE_INTEGER, 'Số lượng tồn kho'],
      ['growth_days', 1, 2000, 'Tổng chu kỳ sinh trưởng'],
      ['germination_day', 1, 2000, 'Mốc ươm mầm'],
      ['development_day', 1, 2000, 'Mốc phát triển'],
      ['harvest_day', 1, 2000, 'Mốc thu hoạch'],
      ['expected_yield_value', 0, Number.MAX_SAFE_INTEGER, 'Năng suất dự kiến'],
      ['ph_min', 0, 14, 'pH tối thiểu'],
      ['ph_max', 0, 14, 'pH tối đa'],
      ['temperature_min', -20, 60, 'Nhiệt độ tối thiểu'],
      ['temperature_max', -20, 60, 'Nhiệt độ tối đa'],
      ['air_humidity_min', 0, 100, 'Độ ẩm không khí tối thiểu'],
      ['air_humidity_max', 0, 100, 'Độ ẩm không khí tối đa'],
      ['soil_humidity_min', 0, 100, 'Độ ẩm đất tối thiểu'],
      ['soil_humidity_max', 0, 100, 'Độ ẩm đất tối đa'],
    ]
    for (const [field, min, max, label] of bounds) {
      const value = numericFields[field]
      if (value !== null && (value < min || value > max)) {
        setFormErrorMessage(`${label} phải nằm trong khoảng ${min}–${max}.`)
        setActiveTab(field === 'stock_quantity' ? 'general' : field === 'growth_days' || field.includes('day') || field === 'expected_yield_value' ? 'cycle' : 'technical')
        return
      }
    }

    const rangePairs: [keyof typeof numericFields, keyof typeof numericFields, string][] = [
      ['ph_min', 'ph_max', 'pH'],
      ['temperature_min', 'temperature_max', 'Nhiệt độ'],
      ['air_humidity_min', 'air_humidity_max', 'Độ ẩm không khí'],
      ['soil_humidity_min', 'soil_humidity_max', 'Độ ẩm đất'],
    ]
    for (const [minField, maxField, label] of rangePairs) {
      const min = numericFields[minField]
      const max = numericFields[maxField]
      if (min !== null && max !== null && min > max) {
        setFormErrorMessage(`${label}: giá trị tối thiểu không thể lớn hơn giá trị tối đa.`)
        setActiveTab('technical')
        return
      }
    }
    const milestones = [
      numericFields.germination_day,
      numericFields.development_day,
      numericFields.harvest_day,
    ].filter((value): value is number => value !== null)
    if (
      milestones.some((day, index) => index > 0 && day < milestones[index - 1]) ||
      (numericFields.growth_days !== null && milestones.some((day) => day > numericFields.growth_days!))
    ) {
      setFormErrorMessage('Các mốc sinh trưởng phải theo thứ tự và không vượt quá tổng chu kỳ.')
      setActiveTab('cycle')
      return
    }

    setFormErrorMessage(null)
    setIsSubmitting(true)
    const payload = {
      code: code.toUpperCase(),
      name,
      supplier: formData.supplier.trim() || null,
      growth_days: numericFields.growth_days,
      germination_day: numericFields.germination_day,
      development_day: numericFields.development_day,
      harvest_day: numericFields.harvest_day,
      stock_quantity: numericFields.stock_quantity ?? 0,
      unit: formData.unit,
      expected_yield_value: numericFields.expected_yield_value,
      expected_yield_unit: formData.expected_yield_unit,
      suitable_seasons: formData.suitable_seasons,
      ph_min: numericFields.ph_min,
      ph_max: numericFields.ph_max,
      temperature_min: numericFields.temperature_min,
      temperature_max: numericFields.temperature_max,
      air_humidity_min: numericFields.air_humidity_min,
      air_humidity_max: numericFields.air_humidity_max,
      soil_humidity_min: numericFields.soil_humidity_min,
      soil_humidity_max: numericFields.soil_humidity_max,
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
      setFormErrorMessage(
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

      <section aria-label="Danh sách giống cây">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500" role="status">
            <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
            Đang tải dữ liệu giống cây...
          </div>
        ) : filteredVarieties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center text-sm text-slate-500">
            Không tìm thấy giống cây nào phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredVarieties.map((item) => (
              <div
                key={item.id}
                className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {item.code}
                    </span>
                    {renderStatusBadge(item.status)}
                  </div>
                  {(canUpdate || canDelete) && (
                    <ActionMenu
                      label={`Thao tác với giống ${item.name}`}
                      items={[
                        ...(canUpdate
                          ? [{
                              label: 'Sửa giống cây',
                              icon: Pencil,
                              onSelect: () => handleOpenEditModal(item),
                            }]
                          : []),
                        ...(canDelete
                          ? [{
                              label: 'Xóa giống cây',
                              icon: Trash2,
                              onSelect: () => handleDelete(item.id),
                              destructive: true,
                            }]
                          : []),
                      ]}
                    />
                  )}
                </div>

                <div className="mt-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sprout className="size-4 shrink-0 text-emerald-700/70 dark:text-emerald-400/70" aria-hidden="true" />
                    <h3 className="truncate text-base font-semibold text-slate-800 dark:text-white">
                      {item.name}
                    </h3>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                        <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                        Chu kỳ
                      </p>
                      <p className="mt-1 truncate pl-5 text-sm font-medium text-slate-800 dark:text-zinc-200">
                        {item.growth_days || 0} ngày
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                        <Package className="size-3.5 shrink-0" aria-hidden="true" />
                        Tồn kho
                      </p>
                      <p className="mt-1 truncate pl-5 text-sm font-medium text-slate-800 dark:text-zinc-200">
                        {item.stock_quantity ?? 0} {item.unit || 'cây'}
                      </p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                        <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
                        Năng suất dự kiến
                      </p>
                      <p className="mt-1 truncate pl-5 text-sm font-medium text-slate-800 dark:text-zinc-200">
                        {item.expected_yield_value != null
                          ? `${item.expected_yield_value} ${item.expected_yield_unit || 'kg/m²'}`
                          : item.expected_yield || 'Chưa rõ'}
                      </p>
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-3 line-clamp-2 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(canCreate || canUpdate) && isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="variety-form-title"
            data-variety-dialog
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/95 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-7">
              <div>
                <h2 id="variety-form-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingVariety ? 'Cập nhật giống cây' : 'Thêm giống cây trồng'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  Thông tin lưu trữ dùng cho quản lý mùa vụ và tham chiếu kỹ thuật.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                  className="rubber-segment variety-tabs"
                  style={{ ['--segment-count' as string]: 3 }}
                >
                  <motion.span
                    className="rubber-segment__thumb variety-tabs__thumb pointer-events-none"
                    aria-hidden="true"
                    animate={{ x: `${Math.max(0, activeTabIndex) * 100}%` }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 430, damping: 34 }
                    }
                  />
                  <Tabs.Tab
                    value="general"
                    className="rubber-segment__item px-2 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 sm:text-sm"
                  >
                    Thông tin chung
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="cycle"
                    className="rubber-segment__item px-2 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 sm:text-sm"
                  >
                    Chu kỳ & năng suất
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="technical"
                    className="rubber-segment__item px-2 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 sm:text-sm"
                  >
                    Chỉ số kỹ thuật
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="general" className="space-y-4 py-5 outline-none">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="variety-code" className={LABEL_CLASS}>Mã giống</label>
                      <div className="flex gap-2">
                        <input
                          id="variety-code"
                          type="text"
                          maxLength={50}
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="Tự sinh nếu để trống"
                          className={FIELD_CLASS}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((current) => ({
                            ...current,
                            code: `GC-${Date.now().toString(36).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
                          }))}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-800/20 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950"
                        >
                          <WandSparkles className="size-4" />
                          Tự sinh
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="variety-name" className={LABEL_CLASS}>Tên giống cây trồng *</label>
                      <input
                        id="variety-name"
                        type="text"
                        maxLength={150}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Cà chua Cherry"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="variety-supplier" className={LABEL_CLASS}>Nhà cung cấp / thương hiệu</label>
                      <input
                        id="variety-supplier"
                        type="text"
                        maxLength={150}
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        placeholder="Tên nhà cung cấp hạt giống"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="variety-status" className={LABEL_CLASS}>Trạng thái canh tác</label>
                      <select id="variety-status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={FIELD_CLASS}>
                        <option value="active">Đang canh tác</option>
                        <option value="testing">Thử nghiệm</option>
                        <option value="inactive">Tạm nghỉ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="variety-stock" className={LABEL_CLASS}>Số lượng tồn kho</label>
                      <input id="variety-stock" type="number" min="0" step="any" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} placeholder="0" className={FIELD_CLASS} />
                    </div>
                    <div>
                      <label htmlFor="variety-stock-unit" className={LABEL_CLASS}>Đơn vị kho</label>
                      <select id="variety-stock-unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className={FIELD_CLASS}>
                        <option value="gói">Gói</option>
                        <option value="hộp">Hộp</option>
                        <option value="kg">Kg</option>
                        <option value="cây">Cây</option>
                      </select>
                    </div>
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="cycle" className="space-y-5 py-5 outline-none">
                  <div>
                    <label htmlFor="growth-days" className={LABEL_CLASS}>Tổng chu kỳ sinh trưởng (ngày)</label>
                    <input id="growth-days" type="number" min="1" max="2000" step="1" value={formData.growth_days} onChange={(e) => setFormData({ ...formData, growth_days: e.target.value })} placeholder="VD: 65" className={FIELD_CLASS} />
                  </div>

                  <details className="group rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-zinc-200">
                      Các mốc sinh trưởng
                      <ChevronDown className="size-4 text-slate-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-3 border-t border-slate-100 p-4 dark:border-zinc-800 sm:grid-cols-3">
                      {([
                        ['germination_day', 'Ươm mầm từ ngày'],
                        ['development_day', 'Phát triển từ ngày'],
                        ['harvest_day', 'Thu hoạch từ ngày'],
                      ] as const).map(([field, label]) => (
                        <div key={field}>
                          <label htmlFor={field} className={LABEL_CLASS}>{label}</label>
                          <input id={field} type="number" min="1" max="2000" step="1" value={formData[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} placeholder="Ngày" className={FIELD_CLASS} />
                        </div>
                      ))}
                    </div>
                  </details>

                  <div>
                    <label className={LABEL_CLASS}>Năng suất dự kiến</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <input aria-label="Giá trị năng suất dự kiến" type="number" min="0" step="any" value={formData.expected_yield_value} onChange={(e) => setFormData({ ...formData, expected_yield_value: e.target.value })} placeholder="VD: 3.5" className={FIELD_CLASS} />
                      <select aria-label="Đơn vị năng suất" value={formData.expected_yield_unit} onChange={(e) => setFormData({ ...formData, expected_yield_unit: e.target.value })} className={`${FIELD_CLASS} w-28`}>
                        <option value="kg/m²">kg/m²</option>
                        <option value="kg/gốc">kg/gốc</option>
                        <option value="tấn/ha">tấn/ha</option>
                      </select>
                    </div>
                  </div>

                  <fieldset>
                    <legend className={LABEL_CLASS}>Mùa vụ thích hợp</legend>
                    <div className="flex flex-wrap gap-2">
                      {SEASONS.map((season) => (
                        <label key={season} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:border-emerald-700/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={formData.suitable_seasons.includes(season)}
                            onChange={(e) => setFormData((current) => ({
                              ...current,
                              suitable_seasons: e.target.checked
                                ? [...current.suitable_seasons, season]
                                : current.suitable_seasons.filter((item) => item !== season),
                            }))}
                            className="size-4 rounded border-slate-300 accent-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                          />
                          {season}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </Tabs.Panel>

                <Tabs.Panel value="technical" className="space-y-4 py-5 outline-none">
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Các khoảng tham chiếu có thể dùng cho giám sát cảm biến và gợi ý canh tác.
                  </p>
                  {([
                    { title: 'Độ pH đất tối ưu', min: 'ph_min', max: 'ph_max', minLabel: 'pH thấp nhất', maxLabel: 'pH cao nhất', step: '0.1', lower: '0', upper: '14' },
                    { title: 'Nhiệt độ lý tưởng (°C)', min: 'temperature_min', max: 'temperature_max', minLabel: 'Nhiệt độ thấp nhất', maxLabel: 'Nhiệt độ cao nhất', step: '0.1', lower: '-20', upper: '60' },
                    { title: 'Độ ẩm không khí (%)', min: 'air_humidity_min', max: 'air_humidity_max', minLabel: 'Độ ẩm thấp nhất', maxLabel: 'Độ ẩm cao nhất', step: '1', lower: '0', upper: '100' },
                    { title: 'Độ ẩm đất (%)', min: 'soil_humidity_min', max: 'soil_humidity_max', minLabel: 'Độ ẩm thấp nhất', maxLabel: 'Độ ẩm cao nhất', step: '1', lower: '0', upper: '100' },
                  ] as const).map((range) => (
                    <fieldset key={range.min} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-zinc-200">{range.title}</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={range.min} className={LABEL_CLASS}>{range.minLabel}</label>
                          <input id={range.min} type="number" min={range.lower} max={range.upper} step={range.step} value={formData[range.min]} onChange={(e) => setFormData({ ...formData, [range.min]: e.target.value })} className={FIELD_CLASS} />
                        </div>
                        <div>
                          <label htmlFor={range.max} className={LABEL_CLASS}>{range.maxLabel}</label>
                          <input id={range.max} type="number" min={range.lower} max={range.upper} step={range.step} value={formData[range.max]} onChange={(e) => setFormData({ ...formData, [range.max]: e.target.value })} className={FIELD_CLASS} />
                        </div>
                      </div>
                    </fieldset>
                  ))}

                  <div>
                    <label htmlFor="variety-description" className={LABEL_CLASS}>Đặc tính / sâu bệnh thường gặp</label>
                    <textarea
                      id="variety-description"
                      rows={4}
                      maxLength={2000}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ghi chú đặc điểm giống, sâu bệnh và lưu ý chăm sóc..."
                      className={`${FIELD_CLASS} resize-y`}
                    />
                  </div>
                </Tabs.Panel>
              </Tabs.Root>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingVariety ? 'Lưu thay đổi' : 'Lưu giống cây'}
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