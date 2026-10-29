'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import {
  AlertCircle,
  Bot,
  CalendarDays,
  Check,
  Copy,
  Download,
  Droplets,
  ImagePlus,
  Loader2,
  Lock,
  MessageCircle,
  NotebookPen,
  Plus,
  Send,
  Sparkles,
  Sprout,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, fetcher, ApiError, RAW_BASE_URL } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'
import type { AiScheduleOut, CropBatch, FarmingLog, FarmingLogActivity } from '@/lib/types'

const ACTIVITY_OPTIONS: FarmingLogActivity[] = [
  'Tưới nước',
  'Bón phân',
  'Phun thuốc',
  'Bệnh hại',
  'Thu hoạch',
  'Khác',
]
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const FIELD_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white'
const LABEL_CLASS =
  'mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300'

type BatchOption = CropBatch & {
  batch_name?: string
  status?: string
  variety_name?: string
  varietyName?: string
  plot_name?: string
  plotName?: string
}

type LogItem = FarmingLog & {
  action_type?: string
  notes?: string
  note?: string
  content?: string
  details?: string
  quantity?: number | null
  quality_percent?: number | null
  created_at?: string
  supply_usages?: Array<{
    supply_name?: string
    quantity_used: number
    unit?: string
  }>
}

type SupplyOption = {
  id: number
  name: string
  unit: string
  quantity?: number
  stock_quantity?: number
}

type AiAdvisorResponse = {
  reply?: string
  answer?: string
  response?: string
  disclaimer?: string
}

type UploadResponse = { image_url: string }

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function unwrapArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (!data || typeof data !== 'object') return []
  const record = data as Record<string, unknown>
  for (const key of ['data', 'logs', 'batches', 'supplies', 'result']) {
    if (Array.isArray(record[key])) return record[key] as T[]
  }
  return []
}

function resolveImageUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  return `${RAW_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function getLogActivity(log: LogItem) {
  return log.activity_type || log.action_type || 'Chăm sóc'
}

function getLogNotes(log: LogItem) {
  return log.description || log.notes || log.note || log.content || log.details || ''
}

function getLogBadge(activity: string) {
  switch (activity) {
    case 'Thu hoạch':
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'
    case 'Tưới nước':
      return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300'
    case 'Bón phân':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
    case 'Phun thuốc':
    case 'Bệnh hại':
      return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
  }
}

function parseLocalLogs(batchId: string): LogItem[] {
  try {
    const stored = localStorage.getItem(`local_logs_${batchId}`)
    return stored ? unwrapArray<LogItem>(JSON.parse(stored)) : []
  } catch (error) {
    console.error('Không thể đọc nhật ký đã lưu cục bộ:', error)
    return []
  }
}

export default function CareLogsPage() {
  const [userRole, setUserRole] = useState('')
  const [isAuthLoaded, setIsAuthLoaded] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [logDate, setLogDate] = useState(localDateString())
  const [activityType, setActivityType] = useState<FarmingLogActivity>('Tưới nước')
  const [description, setDescription] = useState('')
  const [waterLiters, setWaterLiters] = useState('')
  const [supplyId, setSupplyId] = useState('')
  const [supplyQuantity, setSupplyQuantity] = useState('')
  const [harvestKg, setHarvestKg] = useState('')
  const [qualityPercent, setQualityPercent] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatDisclaimer, setChatDisclaimer] = useState('')
  const [chatError, setChatError] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [logAnalysis, setLogAnalysis] = useState<Record<number, string>>({})
  const [analysisLoadingId, setAnalysisLoadingId] = useState<number | null>(null)
  const [schedule, setSchedule] = useState<AiScheduleOut | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState('')

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        setUserRole(JSON.parse(storedUser).role ?? '')
      } catch (error) {
        console.error('Không thể đọc thông tin người dùng:', error)
      }
    }
    setIsAuthLoaded(true)
  }, [])

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview('')
      return
    }
    const objectUrl = URL.createObjectURL(selectedImage)
    setImagePreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedImage])

  useEffect(() => {
    if (!isCreateOpen && !isAiOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting && !chatLoading) {
        setIsCreateOpen(false)
        setIsAiOpen(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isCreateOpen, isAiOpen, isSubmitting, chatLoading])

  useEffect(() => {
    if (!isCreateOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const drawer = document.querySelector<HTMLElement>('[data-care-log-drawer]')
    const getFocusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null)
    getFocusable()[0]?.focus()

    const keepFocusInDrawer = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const elements = getFocusable()
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keepFocusInDrawer)
    return () => {
      document.removeEventListener('keydown', keepFocusInDrawer)
      previousFocus?.focus()
    }
  }, [isCreateOpen])

  const canCreateLog = checkPermission(userRole, PERMISSIONS.LOG_CREATE)
  const canDeleteLog = checkPermission(userRole, PERMISSIONS.LOG_DELETE)
  const canAskAI = checkPermission(userRole, PERMISSIONS.AI_ASK)
  const canGenerateSchedule = checkPermission(userRole, PERMISSIONS.AI_SCHEDULE)
  const {
    data: rawBatches,
    isLoading: loadingBatches,
    mutate: mutateBatches,
  } = useSWR<unknown>(isAuthLoaded ? '/api/batches' : null, fetcher)
  const batches = unwrapArray<BatchOption>(rawBatches)
  const { data: rawSupplies, mutate: mutateSupplies } = useSWR<unknown>(
    isAuthLoaded ? '/api/supplies' : null,
    fetcher,
  )
  const supplies = unwrapArray<SupplyOption>(rawSupplies)
  const selectedSupply = supplies.find((supply) => String(supply.id) === supplyId)
  const selectedSupplyStock = selectedSupply?.stock_quantity ?? selectedSupply?.quantity ?? 0

  useEffect(() => {
    if (batches.length && !batches.some((batch) => String(batch.id) === selectedBatchId)) {
      setSelectedBatchId(String(batches[0].id))
    }
  }, [batches, selectedBatchId])

  const {
    data: rawLogs,
    isLoading: loadingLogs,
    mutate: mutateLogs,
  } = useSWR<unknown>(
    isAuthLoaded && selectedBatchId ? `/api/care-logs?batch_id=${selectedBatchId}` : null,
    fetcher,
  )
  const apiLogs = unwrapArray<LogItem>(rawLogs)
  const displayLogs = useMemo(() => {
    if (!selectedBatchId || typeof window === 'undefined') return apiLogs
    const localLogs = parseLocalLogs(selectedBatchId)
    const merged = [...localLogs, ...apiLogs].reduce((result, log) => {
      if (!result.some((item) => item.id === log.id)) result.push(log)
      return result
    }, [] as LogItem[])
    return merged.sort((first, second) => {
      const dateOrder = (second.log_date ?? '').localeCompare(first.log_date ?? '')
      return dateOrder || second.id - first.id
    })
  }, [apiLogs, selectedBatchId])

  const filteredLogs = useMemo(
    () =>
      displayLogs.filter((log) => {
        const activity = getLogActivity(log)
        const date = String(log.log_date ?? '').slice(0, 10)
        return (
          (activityFilter === 'all' || activity === activityFilter) &&
          (!fromDate || date >= fromDate) &&
          (!toDate || date <= toDate)
        )
      }),
    [activityFilter, displayLogs, fromDate, toDate],
  )

  const resetForm = () => {
    setLogDate(localDateString())
    setActivityType('Tưới nước')
    setDescription('')
    setWaterLiters('')
    setSupplyId('')
    setSupplyQuantity('')
    setHarvestKg('')
    setQualityPercent('')
    setSelectedImage(null)
    setFormError('')
  }

  const handleImageSelect = (file?: File) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setFormError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFormError('Ảnh tải lên không được vượt quá 5 MB.')
      return
    }
    setFormError('')
    setSelectedImage(file)
  }

  async function handleCreateLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!selectedBatchId) {
      setFormError('Vui lòng chọn lô trồng trước.')
      return
    }
    if (!logDate) {
      setFormError('Vui lòng chọn ngày ghi nhật ký.')
      return
    }

    const isWatering = activityType === 'Tưới nước'
    const usesSupply = activityType === 'Bón phân' || activityType === 'Phun thuốc'
    const isHarvest = activityType === 'Thu hoạch'
    const numericQuantity = Number(
      isWatering ? waterLiters : usesSupply ? supplyQuantity : harvestKg,
    )
    if ((isWatering || usesSupply || isHarvest) && (!Number.isFinite(numericQuantity) || numericQuantity <= 0)) {
      setFormError(
        isWatering
          ? 'Lượng nước tưới phải lớn hơn 0 lít.'
          : isHarvest
            ? 'Sản lượng thu hoạch phải lớn hơn 0 kg.'
            : 'Liều lượng vật tư phải lớn hơn 0.',
      )
      return
    }
    if (usesSupply && !supplyId) {
      setFormError('Chọn vật tư đã sử dụng để ghi nhận và trừ kho.')
      return
    }
    if (usesSupply && numericQuantity > selectedSupplyStock) {
      setFormError(`Tồn kho không đủ. Hiện còn ${selectedSupplyStock} ${selectedSupply?.unit ?? ''}.`)
      return
    }
    const quality = qualityPercent.trim() ? Number(qualityPercent) : null
    if (isHarvest && quality !== null && (!Number.isFinite(quality) || quality < 0 || quality > 100)) {
      setFormError('Tỷ lệ đạt chuẩn phải nằm trong khoảng 0–100%.')
      return
    }

    const notes = [
      description.trim(),
      isWatering ? `Lượng nước tưới: ${numericQuantity} lít` : '',
      isHarvest ? `Sản lượng thu được: ${numericQuantity} kg` : '',
      isHarvest && quality !== null ? `Đạt chuẩn: ${quality}%` : '',
      usesSupply && selectedSupply
        ? `Vật tư: ${selectedSupply.name}, liều lượng: ${numericQuantity} ${selectedSupply.unit}`
        : '',
    ].filter(Boolean).join('\n')
    setIsSubmitting(true)

    try {
      let imageUrl: string | null = null
      if (selectedImage) {
        const upload = new FormData()
        upload.append('file', selectedImage)
        const uploaded = await api<UploadResponse>('/api/care-logs/upload', {
          method: 'POST',
          body: upload,
        })
        imageUrl = uploaded.image_url
      }

      await api('/api/care-logs', {
        method: 'POST',
        body: {
          batch_id: Number(selectedBatchId),
          log_date: logDate,
          action_type: activityType,
          notes,
          quantity: numericQuantity > 0 ? numericQuantity : undefined,
          quality_percent: quality,
          image_url: imageUrl,
          supply_usages:
            usesSupply && selectedSupply
              ? [{
                  supply_id: selectedSupply.id,
                  quantity_used: numericQuantity,
                }]
              : [],
        },
      })

      await Promise.all([mutateLogs(), mutateBatches(), mutateSupplies()])
      const lowerDescription = description.toLocaleLowerCase('vi-VN')
      if (
        activityType === 'Bệnh hại' ||
        activityType === 'Phun thuốc' ||
        ['sâu', 'bệnh', 'rệp', 'nấm', 'héo', 'vàng lá', 'bọ trĩ'].some((term) =>
          lowerDescription.includes(term),
        )
      ) {
        window.dispatchEvent(new CustomEvent('newPestAlert', {
          detail: {
            id: Date.now(),
            title: 'Cảnh báo sâu bệnh',
            message: `Lô ${selectedBatchId}: ${description.trim() || activityType}`,
            type: 'warning',
            time: new Date().toISOString(),
          },
        }))
      }
      resetForm()
      setIsCreateOpen(false)
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Không thể lưu nhật ký. Vui lòng kiểm tra kết nối rồi thử lại.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteLog(logId: number) {
    if (!canDeleteLog || !selectedBatchId) return
    if (!window.confirm('Bạn có chắc muốn xóa nhật ký chăm sóc này không?')) return
    try {
      await api(`/api/care-logs/${logId}`, { method: 'DELETE' })
      const localKey = `local_logs_${selectedBatchId}`
      const localLogs = parseLocalLogs(selectedBatchId).filter((log) => log.id !== logId)
      localStorage.setItem(localKey, JSON.stringify(localLogs))
      await mutateLogs()
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'Không thể xóa nhật ký.')
    }
  }

  async function handleDeleteDateRange() {
    if (!canDeleteLog || !selectedBatchId || !fromDate || !toDate) {
      window.alert('Chọn lô trồng, ngày bắt đầu và ngày kết thúc trước.')
      return
    }
    if (fromDate > toDate) {
      window.alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.')
      return
    }
    if (!window.confirm(`Xóa nhật ký từ ${fromDate} đến ${toDate}?`)) return
    try {
      await api(
        `/api/care-logs/range?batch_id=${selectedBatchId}&from_date=${fromDate}&to_date=${toDate}`,
        { method: 'DELETE' },
      )
      const localKey = `local_logs_${selectedBatchId}`
      const localLogs = parseLocalLogs(selectedBatchId).filter((log) => {
        const date = String(log.log_date ?? '').slice(0, 10)
        return date < fromDate || date > toDate
      })
      localStorage.setItem(localKey, JSON.stringify(localLogs))
      await mutateLogs()
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'Không thể xóa nhật ký trong khoảng ngày.')
    }
  }

  async function handleGenerateSchedule() {
    if (!canGenerateSchedule || !selectedBatchId) return
    setScheduleLoading(true)
    setScheduleError('')
    try {
      setSchedule(await api<AiScheduleOut>(
        `/api/ai-schedule/batches/${selectedBatchId}/schedule`,
        { method: 'POST' },
      ))
    } catch (error) {
      setScheduleError(error instanceof ApiError ? error.message : 'Không thể tạo lịch chăm sóc lúc này.')
    } finally {
      setScheduleLoading(false)
    }
  }

  async function handleCopySchedule() {
    if (!schedule) return
    const text = [
      `Lịch chăm sóc tham khảo - Lô ${schedule.batch_code}`,
      `Ngày gieo: ${schedule.seeding_date}`,
      ...schedule.schedule.map((item) => `${item.date} - ${item.task_type}: ${item.description}`),
      `Lưu ý: ${schedule.disclaimer}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.alert('Không thể sao chép lịch chăm sóc.')
    }
  }

  function handleDownloadSchedule() {
    if (!schedule) return
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = [
      ['Ngày thực hiện', 'Công việc', 'Ngày sau gieo', 'Hướng dẫn'],
      ...schedule.schedule.map((item) => [
        item.date,
        item.task_type,
        String(item.day_offset),
        item.description,
      ]),
    ]
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(quote).join(',')).join('\r\n')}`],
      { type: 'text/csv;charset=utf-8;' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lich-cham-soc-ai-${schedule.batch_code}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleAnalyzeLog(log: LogItem) {
    if (!canAskAI || !selectedBatchId) return
    setAnalysisLoadingId(log.id)
    setLogAnalysis((current) => ({ ...current, [log.id]: '' }))
    const quantity = log.quantity ? `Số lượng ghi nhận: ${log.quantity}.` : ''
    try {
      const result = await api<AiAdvisorResponse>('/api/v1/ai-advisor/chat', {
        method: 'POST',
        body: {
          batch_id: Number(selectedBatchId),
          message: [
            'Hãy đánh giá riêng hoạt động canh tác dưới đây theo nguyên tắc an toàn và chỉ dựa trên thông tin được cung cấp.',
            `Hoạt động: ${getLogActivity(log)}.`,
            `Ngày ghi: ${String(log.log_date ?? '').slice(0, 10) || 'không rõ'}.`,
            quantity,
            `Ghi chú: ${getLogNotes(log) || 'không có'}.`,
            'Trả lời ngắn gọn theo ba ý: đánh giá, điểm cần lưu ý, khuyến nghị thực tế. Nếu thiếu dữ liệu để kết luận, hãy nói rõ.',
          ].join('\n'),
        },
      })
      setLogAnalysis((current) => ({
        ...current,
        [log.id]: [
          result.reply || result.response || result.answer || 'Chưa có nội dung phân tích.',
          result.disclaimer,
        ].filter(Boolean).join('\n\n'),
      }))
    } catch (error) {
      setLogAnalysis((current) => ({
        ...current,
        [log.id]: error instanceof ApiError ? error.message : 'Không thể phân tích nhật ký lúc này.',
      }))
    } finally {
      setAnalysisLoadingId(null)
    }
  }

  async function handleSendQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = chatInput.trim()
    if (!message || !selectedBatchId) return
    setChatLoading(true)
    setChatError('')
    setChatAnswer('')
    setChatDisclaimer('')
    try {
      const result = await api<AiAdvisorResponse>('/api/v1/ai-advisor/chat', {
        method: 'POST',
        body: { batch_id: Number(selectedBatchId), message },
      })
      setChatAnswer(result.reply || result.response || result.answer || '')
      setChatDisclaimer(result.disclaimer || 'Thông tin AI mang tính tham khảo; hãy đối chiếu với điều kiện thực tế tại vườn.')
      setChatInput('')
    } catch (error) {
      setChatError(error instanceof ApiError ? error.message : 'Không thể kết nối cố vấn AI lúc này.')
    } finally {
      setChatLoading(false)
    }
  }

  const selectedBatch = batches.find((batch) => String(batch.id) === selectedBatchId)

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-24">
      <header className="flex flex-col gap-4 border-b border-emerald-950/10 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-400">
            <Sprout className="size-4" aria-hidden="true" />
            Nhật ký mùa vụ
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Nhật ký &amp; Trợ lý AI
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-400">
            Ghi lại hoạt động ngoài đồng, theo dõi diễn biến và nhận gợi ý chăm sóc theo từng lô.
          </p>
        </div>
        {canCreateLog ? (
          <button
            type="button"
            onClick={() => {
              resetForm()
              setIsCreateOpen(true)
            }}
            disabled={loadingBatches || batches.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1b4332] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#143021] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950"
          >
            <Plus className="size-4" aria-hidden="true" />
            Thêm ghi chép mới
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Lock className="size-4" aria-hidden="true" /> Bạn chưa có quyền thêm nhật ký
          </span>
        )}
      </header>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Hoạt động canh tác</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
              {selectedBatch?.batch_name || selectedBatch?.batch_code || 'Chọn lô trồng để xem nhật ký'}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            {filteredLogs.length} ghi chép
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={LABEL_CLASS}>Lô trồng</span>
            <select
              value={selectedBatchId}
              onChange={(event) => {
                setSelectedBatchId(event.target.value)
                setLogAnalysis({})
              }}
              disabled={loadingBatches || batches.length === 0}
              className={FIELD_CLASS}
            >
              {batches.length === 0 && <option value="">Chưa có lô trồng</option>}
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_name || batch.batch_code || `Lô #${batch.id}`}
                  {batch.batch_code ? ` (${batch.batch_code})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Loại hoạt động</span>
            <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)} className={FIELD_CLASS}>
              <option value="all">Tất cả hoạt động</option>
              {ACTIVITY_OPTIONS.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Từ ngày</span>
            <input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Đến ngày</span>
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className={FIELD_CLASS} />
          </label>
        </div>
        {canDeleteLog && fromDate && toDate && (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={handleDeleteDateRange} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30">
              <Trash2 className="size-3.5" aria-hidden="true" /> Xóa nhật ký trong khoảng ngày
            </button>
          </div>
        )}
      </section>

      <section aria-label="Timeline nhật ký canh tác">
        {loadingLogs && displayLogs.length === 0 ? (
          <div className="flex justify-center py-16 text-sm text-slate-500">
            <Loader2 className="mr-2 size-5 animate-spin text-emerald-800" aria-hidden="true" />
            Đang tải nhật ký…
          </div>
        ) : !selectedBatchId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-zinc-700">
            Chọn lô trồng để xem hoạt động canh tác.
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
            <NotebookPen className="mx-auto size-8 text-emerald-800/60 dark:text-emerald-400/60" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">
              {displayLogs.length ? 'Không có ghi chép khớp bộ lọc' : 'Chưa có ghi chép cho lô này'}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              {displayLogs.length ? 'Thử đổi loại hoạt động hoặc khoảng ngày.' : 'Thêm hoạt động đầu tiên để theo dõi tiến trình mùa vụ.'}
            </p>
            {!displayLogs.length && canCreateLog && (
              <button type="button" onClick={() => setIsCreateOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1b4332] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#143021]">
                <Plus className="size-4" aria-hidden="true" /> Thêm ghi chép
              </button>
            )}
          </div>
        ) : (
          <ol className="relative space-y-4 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-emerald-900/15 dark:before:bg-emerald-300/15">
            {filteredLogs.map((log, index) => {
              const activity = getLogActivity(log)
              const note = getLogNotes(log)
              const date = String(log.log_date ?? '').slice(0, 10)
              const dateLabel = date
                ? new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Ngày chưa xác định'
              return (
                <li key={log.id || `${date}-${index}`} className="relative pl-11">
                  <span className="absolute left-2.5 top-5 flex size-5 items-center justify-center rounded-full border-[3px] border-[#ebf0ec] bg-emerald-700 ring-1 ring-emerald-800/20 dark:border-zinc-950 dark:bg-emerald-400" aria-hidden="true" />
                  <article className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-emerald-900/25 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getLogBadge(activity)}`}>{activity}</span>
                        <time dateTime={date} className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400">
                          <CalendarDays className="size-3.5" aria-hidden="true" /> {dateLabel}
                        </time>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        {canAskAI && (
                          <button
                            type="button"
                            onClick={() => handleAnalyzeLog(log)}
                            disabled={analysisLoadingId === log.id}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          >
                            {analysisLoadingId === log.id ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                            Phân tích bằng AI
                          </button>
                        )}
                        {canDeleteLog && (
                          <button type="button" onClick={() => handleDeleteLog(log.id)} aria-label="Xóa ghi chép" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-300">
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    {note ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-zinc-300">{note}</p>
                    ) : (
                      <p className="mt-3 text-sm italic text-slate-400">Chưa có ghi chú cho hoạt động này.</p>
                    )}
                    {(activity === 'Tưới nước' || activity === 'Thu hoạch') && log.quantity != null && log.quantity > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {activity === 'Tưới nước' ? <Droplets className="size-3.5 text-blue-600" /> : <Sprout className="size-3.5 text-emerald-700" />}
                        {activity === 'Tưới nước' ? `${log.quantity} lít` : `${log.quantity} kg`}
                        {activity === 'Thu hoạch' && log.quality_percent != null && <span className="ml-1 border-l border-slate-300 pl-2">{log.quality_percent}% đạt chuẩn</span>}
                      </div>
                    )}
                    {log.image_url && (
                      <a href={resolveImageUrl(log.image_url)} target="_blank" rel="noreferrer" className="mt-4 block w-fit overflow-hidden rounded-xl border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-zinc-700">
                        <img src={resolveImageUrl(log.image_url)} alt={`Ảnh minh họa: ${activity}`} loading="lazy" className="max-h-56 max-w-full object-cover sm:max-w-md" />
                      </a>
                    )}
                    {logAnalysis[log.id] && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          <Sparkles className="size-3.5" aria-hidden="true" /> Nhận xét của AI
                        </div>
                        <p className="whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-zinc-300">{logAnalysis[log.id]}</p>
                      </div>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {canGenerateSchedule && (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/15 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Lịch chăm sóc gợi ý</h2>
                <p className="text-xs text-slate-600 dark:text-zinc-400">Tạo lịch dựa trên lô trồng đang chọn</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {schedule && (
                <>
                  <button type="button" onClick={handleCopySchedule} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-zinc-900 dark:text-emerald-300">
                    <Copy className="size-3.5" aria-hidden="true" /> Sao chép
                  </button>
                  <button type="button" onClick={handleDownloadSchedule} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-zinc-900 dark:text-emerald-300">
                    <Download className="size-3.5" aria-hidden="true" /> Tải CSV
                  </button>
                </>
              )}
              <button type="button" onClick={handleGenerateSchedule} disabled={scheduleLoading || !selectedBatchId} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">
                {scheduleLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {scheduleLoading ? 'Đang tạo…' : schedule ? 'Tạo lại lịch' : 'Tạo lịch AI'}
              </button>
            </div>
          </div>
          {scheduleError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{scheduleError}</p>}
          {schedule && !scheduleError && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-zinc-400">
                <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900">Lô: {schedule.batch_code}</span>
                <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900">Gieo: {schedule.seeding_date}</span>
                {schedule.expected_harvest_date && <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900">Thu hoạch: {schedule.expected_harvest_date}</span>}
              </div>
              <ol className="grid gap-2 md:grid-cols-2">
                {schedule.schedule.map((item) => (
                  <li key={`${item.day_offset}-${item.task_type}`} className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-zinc-900/70">
                    <div className="flex justify-between gap-3 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                      <span>{item.task_type.replaceAll('_', ' ')}</span><time>{item.date}</time>
                    </div>
                    <p className="mt-1.5 text-sm leading-5 text-slate-700 dark:text-zinc-300">{item.description}</p>
                  </li>
                ))}
              </ol>
              <p className="text-xs leading-5 text-slate-500 dark:text-zinc-400">{schedule.disclaimer}</p>
            </div>
          )}
        </section>
      )}

      {canAskAI && (
        <div className="fixed bottom-5 right-5 z-40">
          {isAiOpen && (
            <section aria-label="Hỏi đáp AI" className="mb-3 flex max-h-[min(70dvh,560px)] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-emerald-900/15 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <header className="flex items-center justify-between bg-[#1b4332] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <Bot className="size-5" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-semibold">Cố vấn AI</h2>
                    <p className="text-xs text-white/75">Theo ngữ cảnh lô đang chọn</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsAiOpen(false)} aria-label="Đóng cố vấn AI" className="rounded-lg p-1.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </header>
              <div className="min-h-36 flex-1 space-y-3 overflow-y-auto p-4">
                {!chatAnswer && !chatError && !chatLoading && (
                  <p className="text-sm leading-6 text-slate-500 dark:text-zinc-400">
                    Hỏi về tưới tiêu, dinh dưỡng hoặc dấu hiệu bất thường của lô đang theo dõi.
                  </p>
                )}
                {chatLoading && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Đang phân tích dữ liệu…</p>}
                {chatError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{chatError}</p>}
                {chatAnswer && <p className="whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-zinc-300">{chatAnswer}</p>}
                {chatDisclaimer && <p className="border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500 dark:border-zinc-800 dark:text-zinc-400">{chatDisclaimer}</p>}
              </div>
              <form onSubmit={handleSendQuestion} className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-zinc-800">
                <label className="sr-only" htmlFor="care-ai-question">Câu hỏi cho cố vấn AI</label>
                <textarea id="care-ai-question" rows={2} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Nhập câu hỏi…" className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-800" />
                <button type="submit" disabled={chatLoading || !chatInput.trim() || !selectedBatchId} aria-label="Gửi câu hỏi" className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#1b4332] text-white hover:bg-[#143021] disabled:opacity-50">
                  {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
            </section>
          )}
          <button type="button" onClick={() => setIsAiOpen((open) => !open)} aria-expanded={isAiOpen} aria-label={isAiOpen ? 'Đóng cố vấn AI' : 'Mở cố vấn AI'} className="ml-auto flex size-14 items-center justify-center rounded-full bg-[#1b4332] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950">
            {isAiOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
          </button>
        </div>
      )}

      {isCreateOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) setIsCreateOpen(false)
        }}>
          <section data-care-log-drawer role="dialog" aria-modal="true" aria-labelledby="create-care-log-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-zinc-700 dark:bg-zinc-950 sm:max-h-[calc(100dvh-3rem)]">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-7">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                  <NotebookPen className="size-4" aria-hidden="true" /> Nhật ký canh tác
                </div>
                <h2 id="create-care-log-title" className="text-xl font-bold text-slate-900 dark:text-white">Ghi chép mới</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  {selectedBatch?.batch_name || selectedBatch?.batch_code || 'Chọn lô trồng'}
                </p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting} aria-label="Đóng biểu mẫu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            {loadingBatches ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Đang tải danh sách lô…</div>
            ) : batches.length === 0 ? (
              <div className="m-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Tạo lô trồng trước khi ghi nhật ký.</div>
            ) : !canCreateLog ? (
              <div className="m-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"><Lock className="mx-auto mb-2 size-5" />Bạn chưa có quyền thêm nhật ký.</div>
            ) : (
              <form onSubmit={handleCreateLog} noValidate className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-7">
                {formError && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{formError}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={LABEL_CLASS}>Lô trồng *</span>
                    <select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)} className={FIELD_CLASS}>
                      {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_name || batch.batch_code}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={LABEL_CLASS}>Ngày ghi *</span>
                    <input type="date" required value={logDate} onChange={(event) => setLogDate(event.target.value)} className={FIELD_CLASS} />
                  </label>
                </div>

                <label>
                  <span className={LABEL_CLASS}>Loại hoạt động *</span>
                  <select value={activityType} onChange={(event) => {
                    setActivityType(event.target.value as FarmingLogActivity)
                    setSupplyId('')
                    setSupplyQuantity('')
                    setFormError('')
                  }} className={FIELD_CLASS}>
                    {ACTIVITY_OPTIONS.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
                  </select>
                </label>

                {activityType === 'Tưới nước' && (
                  <label>
                    <span className={LABEL_CLASS}>Lượng nước tưới (Lít) *</span>
                    <div className="relative">
                      <Droplets className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-600" aria-hidden="true" />
                      <input type="number" min="0.01" step="any" value={waterLiters} onChange={(event) => setWaterLiters(event.target.value)} placeholder="Ví dụ: 120" className={`${FIELD_CLASS} pl-10 pr-14`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Lít</span>
                    </div>
                  </label>
                )}

                {(activityType === 'Bón phân' || activityType === 'Phun thuốc') && (
                  <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <label className="block">
                      <span className={LABEL_CLASS}>Vật tư từ kho *</span>
                      <select value={supplyId} onChange={(event) => {
                        setSupplyId(event.target.value)
                        setSupplyQuantity('')
                      }} className={FIELD_CLASS}>
                        <option value="">Chọn vật tư</option>
                        {supplies.map((supply) => {
                          const stock = supply.stock_quantity ?? supply.quantity ?? 0
                          return <option key={supply.id} value={supply.id}>{supply.name} — còn {stock} {supply.unit}</option>
                        })}
                      </select>
                    </label>
                    {selectedSupply && (
                      <>
                        <p className="text-xs text-emerald-900 dark:text-emerald-300">
                          Tồn kho khả dụng: <strong>{selectedSupplyStock} {selectedSupply.unit}</strong>
                        </p>
                        <label className="block">
                          <span className={LABEL_CLASS}>Liều lượng sử dụng *</span>
                          <div className="relative">
                            <input type="number" min="0.01" max={selectedSupplyStock} step="any" value={supplyQuantity} onChange={(event) => setSupplyQuantity(event.target.value)} placeholder="Nhập lượng sử dụng" className={`${FIELD_CLASS} pr-16`} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{selectedSupply.unit}</span>
                          </div>
                        </label>
                      </>
                    )}
                    {supplies.length === 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Chưa có vật tư trong kho.</p>}
                  </div>
                )}

                {activityType === 'Thu hoạch' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className={LABEL_CLASS}>Sản lượng thu được (Kg) *</span>
                      <input type="number" min="0.01" step="any" value={harvestKg} onChange={(event) => setHarvestKg(event.target.value)} placeholder="Ví dụ: 85" className={FIELD_CLASS} />
                    </label>
                    <label>
                      <span className={LABEL_CLASS}>Tỷ lệ đạt chuẩn (%)</span>
                      <input type="number" min="0" max="100" step="any" value={qualityPercent} onChange={(event) => setQualityPercent(event.target.value)} placeholder="0–100" className={FIELD_CLASS} />
                    </label>
                  </div>
                )}

                <label>
                  <span className={LABEL_CLASS}>Ghi chú / diễn biến</span>
                  <textarea rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ghi lại tình trạng cây, điều kiện thời tiết hoặc thao tác đã thực hiện…" className={`${FIELD_CLASS} resize-y`} />
                </label>

                <div>
                  <span className={LABEL_CLASS}>Ảnh minh họa (không bắt buộc)</span>
                  {imagePreview ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700">
                      <img src={imagePreview} alt="Xem trước ảnh nhật ký" className="max-h-56 w-full object-contain bg-slate-100 dark:bg-zinc-900" />
                      <button type="button" onClick={() => setSelectedImage(null)} aria-label="Xóa ảnh đã chọn" className="absolute right-2 top-2 rounded-full bg-slate-950/75 p-2 text-white hover:bg-slate-950">
                        <X className="size-4" aria-hidden="true" />
                      </button>
                      <p className="truncate bg-white px-3 py-2 text-xs text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">{selectedImage?.name}</p>
                    </div>
                  ) : (
                    <label
                      onDragOver={(event) => {
                        event.preventDefault()
                        setIsDraggingImage(true)
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={(event) => {
                        event.preventDefault()
                        setIsDraggingImage(false)
                        handleImageSelect(event.dataTransfer.files[0])
                      }}
                      className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${isDraggingImage ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-300 bg-white hover:border-emerald-700 dark:border-zinc-700 dark:bg-zinc-900'}`}
                    >
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleImageSelect(event.target.files?.[0])} />
                      <span className="mb-2 flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {isDraggingImage ? <Upload className="size-4" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
                      </span>
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">Kéo ảnh vào đây hoặc chọn tệp</span>
                      <span className="mt-1 text-xs text-slate-500 dark:text-zinc-400">JPEG, PNG hoặc WebP · tối đa 5 MB</span>
                    </label>
                  )}
                </div>

                <footer className="sticky bottom-0 mt-auto flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">Hủy</button>
                  <button type="submit" disabled={isSubmitting || !selectedBatchId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#143021] disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                    {isSubmitting ? 'Đang lưu…' : 'Lưu ghi chép'}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>,
        document.body,
      )}
    </main>
  )
}
