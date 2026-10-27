'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  Bot,
  CalendarDays,
  NotebookPen,
  Plus,
  Send,
  Sparkles,
  History,
  AlertTriangle,
  Loader2,
  Lock,
  Copy,
  Download,
  Trash2,
} from 'lucide-react'
import { api, fetcher, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'
import type { CropBatch, FarmingLog, FarmingLogActivity } from '@/lib/types'

const ACTIVITY_OPTIONS: FarmingLogActivity[] = [
  'Tưới nước',
  'Bón phân',
  'Phun thuốc',
  'Bệnh hại',
  'Thu hoạch',
  'Khác',
]

interface AiAdvisorResponse {
  reply?: string;
  answer?: string
  response?: string
  advice?: string
  message?: string
  warning?: string
  disclaimer?: string
}

type BatchOption = CropBatch & {
  batch_name?: string
  status?: string
}

type LogItem = FarmingLog & {
  action_type?: string
  notes?: string
  note?: string
  content?: string
  details?: string
}

type SupplyOption = { id: number; name: string; unit: string; quantity: number }

function parseLogsArray(data: any): LogItem[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.logs)) return data.logs
  if (Array.isArray(data.result)) return data.result
  if (Array.isArray(data.data?.logs)) return data.data.logs
  return []
}

export default function CareLogsPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [isAuthLoaded, setIsAuthLoaded] = useState(false)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUserRole(parsedUser.role)
      } catch (error) {
        console.error('Lỗi đọc dữ liệu user:', error)
      }
    }
    setIsAuthLoaded(true)
  }, [])

  const canCreateLog = checkPermission(userRole, PERMISSIONS.LOG_CREATE)
  const canDeleteLog = checkPermission(userRole, PERMISSIONS.LOG_DELETE)
  const canAskAI = checkPermission(userRole, PERMISSIONS.AI_ASK)
  const canGenerateSchedule = checkPermission(userRole, PERMISSIONS.AI_SCHEDULE)

  const {
    data: rawBatches,
    isLoading: loadingBatches,
    mutate: mutateBatches,
  } = useSWR<BatchOption[] | { data: BatchOption[] }>(
    isAuthLoaded ? '/api/batches' : null,
    fetcher
  )

  const batches: BatchOption[] = Array.isArray(rawBatches)
    ? rawBatches
    : Array.isArray(rawBatches?.data)
      ? rawBatches.data
      : []
  const { data: supplies = [] } = useSWR<SupplyOption[]>(isAuthLoaded ? '/api/supplies' : null, fetcher)

  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [showTimeline, setShowTimeline] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSupplyId, setSelectedSupplyId] = useState('')
  const [supplyQuantity, setSupplyQuantity] = useState('')

  // Chuẩn hóa Endpoint lấy danh sách nhật ký
  const {
    data: rawLogs,
    isLoading: loadingLogs,
    mutate: mutateLogs,
  } = useSWR<any>(
    isAuthLoaded && selectedBatchId ? `/api/care-logs?batch_id=${selectedBatchId}` : null,
    fetcher
  )

  const [displayLogs, setDisplayLogs] = useState<LogItem[]>([])

  useEffect(() => {
    if (selectedBatchId) {
      const apiLogs = parseLogsArray(rawLogs)

      const localLogsStr = localStorage.getItem(`local_logs_${selectedBatchId}`)
      const localLogs = localLogsStr ? JSON.parse(localLogsStr) : []

      const merged = [...localLogs, ...apiLogs].reduce((acc: LogItem[], current: LogItem) => {
        const exists = acc.find((item) => item.id === current.id)
        if (!exists) return [...acc, current]
        return acc
      }, [])

      merged.sort((a: any, b: any) => (b.id || 0) - (a.id || 0))

      setDisplayLogs(merged)
    }
  }, [rawLogs, selectedBatchId])

  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    activity_type: 'Tưới nước' as FarmingLogActivity,
    description: '',
    image_url: '',
  })

  const [chatInput, setChatInput] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatWarning, setChatWarning] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [schedule, setSchedule] = useState<import('@/lib/types').AiScheduleOut | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [historyFromDate, setHistoryFromDate] = useState('')
  const [historyToDate, setHistoryToDate] = useState('')
  const [isRangeDeleteOpen, setIsRangeDeleteOpen] = useState(false)
  const [isDeletingRange, setIsDeletingRange] = useState(false)

  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(String(batches[0].id))
    }
  }, [batches, selectedBatchId])

  const handleActivityChange = (activity: FarmingLogActivity) => {
    setForm((prev) => ({ ...prev, activity_type: activity }))
  }

  async function handleDeleteLog(logId: number) {
    if (!canDeleteLog || !selectedBatchId) return
    if (!window.confirm('Bạn có chắc muốn xóa nhật ký chăm sóc này không?')) return

    try {
      await api(`/api/care-logs/${logId}`, { method: 'DELETE' })
      setDisplayLogs((previous) => previous.filter((log) => log.id !== logId))
      const localLogsKey = `local_logs_${selectedBatchId}`
      const localLogs = parseLogsArray(JSON.parse(localStorage.getItem(localLogsKey) || '[]'))
      localStorage.setItem(localLogsKey, JSON.stringify(localLogs.filter((log) => log.id !== logId)))
      await mutateLogs()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể xóa nhật ký.')
    }
  }

  async function handleDeleteHistoryByDateRange() {
    if (!isRangeDeleteOpen) {
      setIsRangeDeleteOpen(true)
      return
    }
    if (!canDeleteLog || !selectedBatchId || !historyFromDate || !historyToDate) {
      alert('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.')
      return
    }
    if (historyFromDate > historyToDate) {
      alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.')
      return
    }
    setIsDeletingRange(true)
    try {
      await api(
        `/api/care-logs/range?batch_id=${selectedBatchId}&from_date=${historyFromDate}&to_date=${historyToDate}`,
        { method: 'DELETE' },
      )

      const isInRange = (log: LogItem) => {
        const logDate = (log.log_date || '').slice(0, 10)
        return logDate >= historyFromDate && logDate <= historyToDate
      }
      setDisplayLogs((previous) => previous.filter((log) => !isInRange(log)))
      const localLogsKey = `local_logs_${selectedBatchId}`
      const localLogs = parseLogsArray(JSON.parse(localStorage.getItem(localLogsKey) || '[]'))
      localStorage.setItem(localLogsKey, JSON.stringify(localLogs.filter((log) => !isInRange(log))))
      await mutateLogs()
      alert('Đã xóa lịch sử chăm sóc trong khoảng ngày đã chọn.')
      setHistoryFromDate('')
      setHistoryToDate('')
      setIsRangeDeleteOpen(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể xóa lịch sử chăm sóc.')
    } finally {
      setIsDeletingRange(false)
    }
  }

  async function handleCreateLog(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBatchId) {
      alert('Vui lòng chọn lô trồng trước.')
      return
    }

    const trimmedDescription = form.description.trim()
    const trimmedImageUrl = form.image_url.trim()
    const selectedSupply = supplies.find((item) => item.id === Number(selectedSupplyId))
    if (selectedSupplyId && (Number(supplyQuantity) <= 0 || Number(supplyQuantity) > (selectedSupply?.quantity ?? 0))) {
      alert(selectedSupply && Number(supplyQuantity) > selectedSupply.quantity
        ? `Tồn kho không đủ. Hiện còn ${selectedSupply.quantity} ${selectedSupply.unit}.`
        : 'Số lượng vật tư sử dụng phải lớn hơn 0.')
      return
    }

    setIsSubmitting(true)

    
    const payload = {
  batch_id: selectedBatchId,
  log_date: form.log_date || new Date().toISOString().split('T')[0],
  action_type: form.activity_type || 'Tưới nước',
  activity_type: form.activity_type || 'Tưới nước',
  notes: trimmedDescription || '',
  description: trimmedDescription || '',
  quantity: 0,
  image_url: trimmedImageUrl || null,
  supply_usages: selectedSupplyId ? [{ supply_id: Number(selectedSupplyId), quantity_used: Number(supplyQuantity) }] : [],
}

    try {
  await api('/api/care-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload), 
  })

      const newLogItem: LogItem = {
        id: Date.now(),
        batch_id: Number(selectedBatchId),
        log_date: form.log_date,
        activity_type: form.activity_type,
        action_type: form.activity_type,
        description: trimmedDescription,
        notes: trimmedDescription,
        image_url: trimmedImageUrl || undefined,
      } as LogItem

      setDisplayLogs((prev) => {
        const newLogs = [newLogItem, ...prev]
        localStorage.setItem(`local_logs_${selectedBatchId}`, JSON.stringify(newLogs))
        return newLogs
      })

      await Promise.all([mutateBatches(), mutateLogs()])

      const isDisease = form.activity_type === 'Bệnh hại'
      const hasKeywords =
        trimmedDescription.toLowerCase().includes('sâu') ||
        trimmedDescription.toLowerCase().includes('bệnh')

      if (isDisease || hasKeywords) {
        const event = new CustomEvent('newPestAlert', {
          detail: {
            id: Date.now(),
            title: 'Cảnh báo sâu bệnh',
            message: `Lô ${selectedBatchId}: ${trimmedDescription || 'Phát hiện bệnh hại'}`,
            type: 'warning',
            time: new Date().toISOString(),
          },
        })
        window.dispatchEvent(event)
      }

      setForm({
        log_date: new Date().toISOString().slice(0, 10),
        activity_type: 'Tưới nước',
        description: '',
        image_url: '',
      })
      setSelectedSupplyId('')
      setSupplyQuantity('')
      setShowTimeline(true)
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : 'Không thể lưu nhật ký. Vui lòng kiểm tra lại kết nối.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSend(customPrompt?: string) {
  if (!selectedBatchId) return
  const question = (customPrompt ?? chatInput).trim()
  if (!question) return

  setChatLoading(true)
  setChatAnswer('')
  setChatWarning(null)

  try {
    // Hàm api() đã tự động xử lý Content-Type và JSON.stringify(body)
    const result = (await api('/api/v1/ai-advisor/chat', {
      method: 'POST',
      body: {
        batch_id: Number(selectedBatchId),
        message: question,
      },
    })) as AiAdvisorResponse

    const answerText =
      result.reply || result.response || result.answer || result.advice || result.message || ''
    const warningText = result.warning || result.disclaimer

    setChatAnswer(answerText)
    setChatWarning(
      warningText ||
        'Khuyến nghị mang tính chất tham khảo, vui lòng kiểm tra thực tế vườn cây.'
    )
    setChatInput('')
  } catch (err) {
    setChatAnswer(
      err instanceof ApiError
        ? `Không thể kết nối AI: ${err.message}`
        : 'Không thể kết nối AI lúc này.'
    )
  } finally {
    setChatLoading(false)
  }
  }

  async function handleGenerateSchedule() {
    if (!selectedBatchId || !canGenerateSchedule) return

    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const result = await api<import('@/lib/types').AiScheduleOut>(
        `/api/ai-schedule/batches/${selectedBatchId}/schedule`,
        { method: 'POST' },
      )
      setSchedule(result)
    } catch (err) {
      setScheduleError(
        err instanceof ApiError
          ? err.message
          : 'Không thể sinh lịch chăm sóc lúc này.',
      )
    } finally {
      setScheduleLoading(false)
    }
  }

  async function handleCopySchedule() {
    if (!schedule) return
    const text = [
      `Lịch chăm sóc tham khảo - Lô ${schedule.batch_code}`,
      `Ngày gieo: ${schedule.seeding_date}`,
      ...schedule.schedule.map(
        (item) => `${item.date} - ${scheduleTaskLabels[item.task_type]}: ${item.description}`,
      ),
      `Lưu ý: ${schedule.disclaimer}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      alert('Đã sao chép lịch chăm sóc AI.')
    } catch {
      alert('Không thể sao chép lịch chăm sóc AI.')
    }
  }

  function handleDownloadSchedule() {
    if (!schedule) return
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = schedule.schedule.map((item) => [
      item.date,
      scheduleTaskLabels[item.task_type],
      item.day_offset.toString(),
      item.description,
    ])
    const csv = `\uFEFF${[
      ['Ngày thực hiện', 'Công việc', 'Ngày sau gieo', 'Hướng dẫn'],
      ...rows,
    ].map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\r\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lich-cham-soc-ai-${schedule.batch_code}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const scheduleTaskLabels = {
    tuoi: 'Tưới nước',
    bon_phan: 'Bón phân',
    kiem_tra_sau_benh: 'Kiểm tra sâu bệnh',
  } as const

  const scheduleTaskStyles = {
    tuoi: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
    bon_phan: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    kiem_tra_sau_benh: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
  } as const

  const getActivityBadgeStyle = (activity: string) => {
    switch (activity) {
      case 'Thu hoạch':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
      case 'Tưới nước':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
      case 'Bón phân':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
      case 'Phun thuốc':
      case 'Bệnh hại':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        {/* KHỐI 1: TẠO NHẬT KÝ */}
        <section className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-[#1b3e2b]/10 p-2 text-[#1b3e2b] dark:bg-emerald-500/10 dark:text-emerald-400">
              <NotebookPen className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Ghi chép mới
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Lưu lại các hoạt động tại vườn
              </p>
            </div>
          </div>

          {loadingBatches ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
              Đang tải danh sách lô trồng...
            </div>
          ) : batches.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              Chưa có lô trồng nào. Vui lòng tạo lô trồng trước.
            </div>
          ) : !canCreateLog ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Lock className="mb-2 size-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Không có quyền truy cập
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Bạn cần quyền Nhân viên, Quản lý hoặc Kỹ thuật viên để thêm nhật ký.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Chọn lô trồng
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value)
                    setSchedule(null)
                    setScheduleError(null)
                  }}
                  className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                >
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_name
                        ? `${batch.batch_name} (${batch.batch_code})`
                        : batch.batch_code}
                      {batch.status ? ` - [${batch.status}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleCreateLog} className="flex flex-1 flex-col space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Ngày ghi
                    </label>
                    <input
                      type="date"
                      value={form.log_date}
                      onChange={(e) => setForm({ ...form, log_date: e.target.value })}
                      className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Hoạt động
                    </label>
                    <select
                      value={form.activity_type}
                      onChange={(e) =>
                        handleActivityChange(e.target.value as FarmingLogActivity)
                      }
                      className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                    >
                      {ACTIVITY_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Ghi chú & Số liệu
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={
                      form.activity_type === 'Thu hoạch'
                        ? 'Ví dụ: Thu hoạch 300 kg, chất lượng đạt tiêu chuẩn...'
                        : 'Ví dụ: Tưới 30 lít, đất đủ ẩm, cây phát triển tốt...'
                    }
                    className="w-full resize-none rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Ảnh minh họa (tuỳ chọn)
                  </label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Vật tư sử dụng (tự động trừ kho)
                    <select value={selectedSupplyId} onChange={(event) => setSelectedSupplyId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal">
                      <option value="">Không sử dụng vật tư</option>
                      {supplies.map((supply) => <option key={supply.id} value={supply.id}>{supply.name} ({supply.quantity} {supply.unit})</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Số lượng sử dụng
                    <input type="number" min="0.01" step="any" disabled={!selectedSupplyId} value={supplyQuantity} onChange={(event) => setSupplyQuantity(event.target.value)} placeholder="Ví dụ: 2" className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal disabled:opacity-50" />
                  </label>
                </div>

                <div className="mt-auto flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedBatchId}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b3e2b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021] disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {isSubmitting ? 'Đang lưu...' : 'Thêm nhật ký'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                  >
                    <History className="size-4" />
                    {showTimeline ? 'Ẩn Timeline' : 'Xem Timeline'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* KHỐI 2: CỐ VẤN AI */}
        <section className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cố vấn Gemini AI
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Trợ lý thông minh phân tích và gợi ý chăm sóc
              </p>
            </div>
          </div>

          {!canAskAI ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Lock className="mb-2 size-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Không có quyền sử dụng AI
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Bạn cần quyền Nhân viên trở lên để hỏi Cố vấn AI.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <textarea
                  rows={3}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập câu hỏi cần trợ giúp về canh tác..."
                  className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-zinc-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={chatLoading || !selectedBatchId || !chatInput.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {chatLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {chatLoading ? 'Đang phân tích...' : 'Gửi'}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-1 flex-col justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Bot className="size-4 text-indigo-600 dark:text-indigo-400" />
                    Trả lời từ AI
                  </div>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                    {chatAnswer ||
                      'Chưa có phản hồi. Chọn lô trồng và gửi câu hỏi để nhận trợ giúp từ Gemini AI.'}
                  </div>
                </div>

                {chatWarning && (
                  <div className="mt-4 flex items-center gap-2 border-t border-red-200 pt-3 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:text-red-400">
                    <AlertTriangle className="size-4 shrink-0 text-red-500" />
                    <span>{chatWarning}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* KHỐI 2: LỊCH CHĂM SÓC AI */}
      <section className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lịch chăm sóc tham khảo</h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                AI dựa trên giống cây và ngày gieo của lô đang chọn
              </p>
            </div>
          </div>
          {canGenerateSchedule ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateSchedule}
                disabled={scheduleLoading || !selectedBatchId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {scheduleLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {scheduleLoading ? 'Đang sinh lịch...' : schedule ? 'Sinh lại lịch' : 'Sinh lịch AI'}
              </button>
              {schedule && (
                <>
                  <button type="button" onClick={handleCopySchedule} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-zinc-900 dark:text-emerald-300">
                    <Copy className="size-3.5" /> Sao chép lịch
                  </button>
                  <button type="button" onClick={handleDownloadSchedule} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-zinc-900 dark:text-emerald-300">
                    <Download className="size-3.5" /> Tải lịch Excel
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <Lock className="size-4" /> Chỉ kỹ thuật viên và quản lý
            </span>
          )}
        </div>

        {scheduleError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{scheduleError}</span>
          </div>
        )}

        {schedule && !scheduleError && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-zinc-400">
              <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900/60">Lô: {schedule.batch_code}</span>
              <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900/60">Gieo: {schedule.seeding_date}</span>
              {schedule.expected_harvest_date && (
                <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900/60">Dự kiến thu hoạch: {schedule.expected_harvest_date}</span>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {schedule.schedule.map((item) => (
                <div key={`${item.day_offset}-${item.task_type}`} className={`rounded-2xl border p-4 ${scheduleTaskStyles[item.task_type]}`}>
                  <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span>{scheduleTaskLabels[item.task_type]}</span>
                    <span>Ngày +{item.day_offset}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{item.description}</p>
                  <p className="mt-2 text-xs font-semibold">Thực hiện: {item.date}</p>
                </div>
              ))}
            </div>
            <p className="flex items-start gap-2 border-t border-emerald-200/70 pt-3 text-xs italic text-emerald-900/70 dark:border-emerald-900/40 dark:text-emerald-200/70">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {schedule.disclaimer}
            </p>
          </div>
        )}
      </section>

      {/* KHỐI 3: TIMELINE LỊCH SỬ CHĂM SÓC */}
      {showTimeline && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Timeline lịch sử chăm sóc
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Theo dõi tiến trình các hoạt động đã thực hiện
                </p>
              </div>
            </div>
            {canDeleteLog && (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {isRangeDeleteOpen && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/60 p-1.5 dark:border-red-900/50 dark:bg-red-950/20">
                    <label className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                      Từ
                      <input type="date" value={historyFromDate} onChange={(event) => setHistoryFromDate(event.target.value)} className="bg-transparent text-foreground outline-none" />
                    </label>
                    <span className="text-xs text-red-500">đến</span>
                    <label className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <input type="date" value={historyToDate} onChange={(event) => setHistoryToDate(event.target.value)} className="bg-transparent text-foreground outline-none" />
                    </label>
                  </div>
                )}
                <button type="button" onClick={handleDeleteHistoryByDateRange} disabled={isDeletingRange || !displayLogs.length} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {isDeletingRange ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  {isRangeDeleteOpen ? 'Xác nhận xóa' : 'Xóa theo ngày'}
                </button>
              </div>
            )}
          </div>

          {loadingLogs && displayLogs.length === 0 ? (
            <div className="flex justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
              Đang tải nhật ký chăm sóc...
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              Chưa có nhật ký nào được ghi nhận cho lô trồng này.
            </div>
          ) : (
            <div className="max-h-[min(60vh,680px)] overflow-y-auto overscroll-contain pr-2">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {displayLogs.map((log, index) => {
                const activityType = log.activity_type || log.action_type || 'Chăm sóc'

                const noteText =
                  log.description || log.notes || log.note || log.content || log.details

                const logDate = log.log_date
                  ? new Date(log.log_date).toLocaleDateString('vi-VN')
                  : 'Vừa xong'

                return (
                  <div
                    key={log.id || index}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#f8faf8] p-5 transition hover:border-[#1b3e2b]/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800/40"
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-zinc-800">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getActivityBadgeStyle(
                            activityType
                          )}`}
                        >
                          {activityType}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{logDate}</span>
                          {canDeleteLog && (
                            <button type="button" onClick={() => handleDeleteLog(log.id)} className="rounded-lg p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" title="Xóa nhật ký" aria-label="Xóa nhật ký">
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                        {noteText ? (
                          noteText
                        ) : (
                          <span className="italic text-slate-400">
                            Không có ghi chú
                          </span>
                        )}
                      </p>
                    </div>

                    {log.image_url && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700">
                        <img
                          src={log.image_url}
                          alt="Ảnh minh họa"
                          className="max-h-40 w-full object-cover transition-transform hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}