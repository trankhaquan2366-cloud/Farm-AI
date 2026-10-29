'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Check,
  Copy,
  Download,
  LoaderCircle,
  MessageCircle,
  NotebookPen,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'

import { ThoughtLine } from '@/components/effects/greenfarm-motion'
import { ApiError, API_BASE_URL, api, fetcher } from '@/lib/api'
import { isNavItemActive, NAV_ITEMS } from '@/lib/nav'
import { normalizeRole, ROLES } from '@/lib/auth/permissions'
import type { AiAlertOut, AiScheduleOut, AiSummaryOut, CropBatch } from '@/lib/types'

type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  text: string
}

type ChatResponse = {
  reply?: string
  response?: string
  answer?: string
  disclaimer?: string
}

type ChatTab = 'chat' | 'schedule' | 'summary' | 'alerts'
type ToolResult = AiScheduleOut | AiSummaryOut | AiAlertOut

const CHAT_TABS: { id: ChatTab; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Hỏi đáp AI', icon: MessageCircle },
  { id: 'schedule', label: 'Lịch chăm sóc', icon: CalendarDays },
  { id: 'summary', label: 'Tóm tắt nhật ký', icon: NotebookPen },
  { id: 'alerts', label: 'Cảnh báo AI', icon: AlertTriangle },
]

const QUICK_SUGGESTIONS: Record<string, string[]> = {
  '/': ['Tóm tắt tình hình trang trại', 'Việc nào cần ưu tiên hôm nay?'],
  '/varieties': ['Giống nào phù hợp mùa này?', 'Tôi nên lưu ý gì khi chăm giống?'],
  '/crop-lots': ['Đánh giá điều kiện đất hiện tại', 'Cách cải thiện đất cho vụ tới?'],
  '/batches': ['Lô trồng nào cần theo dõi?', 'Dấu hiệu nào cần kiểm tra hôm nay?'],
  '/care-logs': ['Tóm tắt nhật ký gần đây', 'Có hoạt động nào cần điều chỉnh?'],
  '/supplies': ['Vật tư nào sắp cần bổ sung?', 'Cách dùng vật tư an toàn?'],
  '/traceability': ['Tôi cần chuẩn bị gì để truy xuất?', 'Giải thích thông tin của một lô'],
}

const TOOL_TITLES: Record<Exclude<ChatTab, 'chat'>, string> = {
  schedule: 'Đang xây dựng lịch chăm sóc',
  summary: 'Gemini AI đang tổng hợp nhật ký...',
  alerts: 'Đang rà soát cảnh báo',
}

function getTaskLabel(taskType: string) {
  switch (taskType) {
    case 'tuoi':
      return 'Tưới nước'
    case 'bon_phan':
      return 'Bón phân'
    case 'kiem_tra_sau_benh':
      return 'Kiểm tra sâu bệnh'
    default:
      return taskType
  }
}

function getSuggestions(pathname: string) {
  const route = NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href))
  return QUICK_SUGGESTIONS[route?.href ?? '/'] ?? QUICK_SUGGESTIONS['/']
}

/**
 * Gọi API tóm tắt nhật ký AI.
 * Gửi cả lot_id và batch_id để backend tự phân giải (ID số, mã lô, tên lô, mã thửa đất).
 * Log rõ status + body khi lỗi để dễ chẩn đoán thay vì chỉ hiện thông báo chung chung.
 */
async function fetchSummary(lotId: string): Promise<AiSummaryOut> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token')
      || localStorage.getItem('access_token')
      || sessionStorage.getItem('token')
      || sessionStorage.getItem('access_token')
    : null
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}/ai-summary/summary`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lot_id: lotId, batch_id: lotId }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error('Summary API Error:', res.status, errorBody)
    let message = 'Không thể tải phân tích AI. Vui lòng thử lại.'
    try {
      const parsed = JSON.parse(errorBody) as { message?: string; detail?: string }
      message = parsed.message || parsed.detail || message
    } catch {
      // Body không phải JSON (ví dụ trang HTML lỗi 404) -> dùng thông báo mặc định.
    }
    throw new Error(message)
  }

  return (await res.json()) as AiSummaryOut
}

export function GlobalAIChatbot() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [activeTab, setActiveTab] = useState<ChatTab>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [copiedTarget, setCopiedTarget] = useState<number | 'conversation' | null>(null)
  const [clipboardError, setClipboardError] = useState('')
  const [toolResult, setToolResult] = useState<ToolResult | null>(null)
  const [toolError, setToolError] = useState('')
  const [isToolLoading, setIsToolLoading] = useState(false)
  const [toolRefresh, setToolRefresh] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [assignedPlotId, setAssignedPlotId] = useState<number | null>(null)
  const messageId = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const downloadLinkRef = useRef<HTMLAnchorElement>(null)
  const copyFeedbackTimeoutRef = useRef<number | null>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const wasOpen = useRef(false)
  const { data: batches = [] } = useSWR<CropBatch[]>(
    isOpen ? '/api/batches' : null,
    fetcher,
  )
  const availableBatches = userRole === ROLES.WORKER
    ? batches.filter((batch) => Number(batch.plot_id) === assignedPlotId)
    : batches
  const availableChatTabs = userRole === ROLES.WORKER
    ? CHAT_TABS.filter((tab) => tab.id === 'chat')
    : CHAT_TABS

  const currentPage =
    NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href))?.label ?? 'GreenFarm'
  const suggestions = getSuggestions(pathname)
  const activeTool = activeTab === 'chat' ? null : activeTab
  const selectedBatch = batches.find((batch) => String(batch.id) === selectedBatchId)
  const isThinking = isLoading || isToolLoading

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user')
      if (!storedUser) return
      const parsedUser: unknown = JSON.parse(storedUser)
      if (typeof parsedUser !== 'object' || parsedUser === null) return
      if ('role' in parsedUser) setUserRole(normalizeRole(parsedUser.role))
      if ('plot_id' in parsedUser && parsedUser.plot_id != null) {
        const plotId = Number(parsedUser.plot_id)
        if (Number.isFinite(plotId)) setAssignedPlotId(plotId)
      }
    } catch (error) {
      console.error('Không thể đọc thông tin phân công của người dùng:', error)
    }
  }, [])

  useEffect(() => {
    if (userRole === ROLES.WORKER && activeTab !== 'chat') setActiveTab('chat')
  }, [activeTab, userRole])

  useEffect(() => {
    if (
      userRole === ROLES.WORKER &&
      selectedBatchId &&
      !availableBatches.some((batch) => String(batch.id) === selectedBatchId)
    ) {
      setSelectedBatchId('')
    }
  }, [availableBatches, selectedBatchId, userRole])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!isOpen) return
    inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || activeTab === 'chat' || !selectedBatchId) {
      setIsToolLoading(false)
      setToolResult(null)
      setToolError('')
      return
    }

    let cancelled = false
    const batchId = Number(selectedBatchId)
    setToolResult(null)
    setToolError('')
    setIsToolLoading(true)

    async function loadTool() {
      try {
        const result = activeTab === 'schedule'
          ? await api<AiScheduleOut>(`/ai-schedule/batches/${batchId}/schedule`, { method: 'POST' })
          : activeTab === 'summary'
            ? await fetchSummary(selectedBatchId)
            : await api<AiAlertOut>('/ai-alert/alerts', { method: 'POST' })
        if (!cancelled) {
          setToolResult(result)
          // Chỉ bật lỗi khi thực sự không có nội dung để hiển thị.
          setToolError('')
        }
      } catch (error) {
        if (!cancelled) {
          setToolError(
            error instanceof ApiError
              ? error.message
              : error instanceof Error && error.message
                ? error.message
                : 'Không thể tải phân tích AI. Vui lòng thử lại.',
          )
        }
      } finally {
        if (!cancelled) setIsToolLoading(false)
      }
    }

    void loadTool()
    return () => {
      cancelled = true
    }
  }, [activeTab, isOpen, selectedBatchId, toolRefresh])

  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      triggerRef.current?.focus({ preventScroll: true })
    }
    wasOpen.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  useEffect(() => () => {
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current)
    }
  }, [])

  async function sendMessage(text: string) {
    const message = text.trim()
    if (!message || isLoading) return

    setDraft('')
    setErrorMessage('')
    setMessages((current) => [
      ...current,
      { id: ++messageId.current, role: 'user', text: message },
    ])
    setIsLoading(true)
    try {
      const response = await api<ChatResponse>('/v1/ai-advisor/chat', {
        method: 'POST',
        body: {
          message,
          ...(selectedBatchId ? { batch_id: Number(selectedBatchId) } : {}),
        },
      })
      const answer =
        response.reply || response.response || response.answer || 'Chưa có câu trả lời phù hợp.'
      setMessages((current) => [
        ...current,
        { id: ++messageId.current, role: 'assistant', text: answer },
      ])
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Không thể kết nối với Cố vấn AI. Vui lòng thử lại.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function copyText(text: string, target: number | 'conversation') {
    try {
      await navigator.clipboard.writeText(text)
      setClipboardError('')
      setCopiedTarget(target)
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current)
      }
      copyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setCopiedTarget(null)
        copyFeedbackTimeoutRef.current = null
      }, 2000)
    } catch (error) {
      console.error('Không thể sao chép nội dung chat:', error)
      setCopiedTarget(null)
      setClipboardError('Không thể sao chép. Hãy kiểm tra quyền clipboard của trình duyệt.')
    }
  }

  function copyConversation() {
    const transcript = messages
      .map((message) => `**${message.role === 'user' ? 'Người dùng' : 'Cố vấn AI'}:** ${message.text}`)
      .join('\n\n')
    void copyText(transcript, 'conversation')
  }

  function downloadConversation() {
    if (messages.length === 0) return

    const now = new Date()
    const contextName = selectedBatch?.batch_name
      || selectedBatch?.batch_code
      || (selectedBatchId ? `Lô ${selectedBatchId}` : 'Không chọn lô')
    const filenameContext = (selectedBatch?.batch_code || selectedBatch?.batch_name || selectedBatchId || 'khong_chon_lo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'khong_chon_lo'
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    const transcript = messages
      .map((message) => `**${message.role === 'user' ? 'Người dùng' : 'Cố vấn AI'}:** ${message.text}`)
      .join('\n\n')
    const report = [
      '# BÁO CÁO TƯ VẤN AI GREENFARM',
      `- Ngữ cảnh lô: ${contextName}`,
      `- Thời gian xuất: ${now.toLocaleString('vi-VN')}`,
      '---',
      transcript,
    ].join('\n\n')
    const downloadLink = downloadLinkRef.current
    if (!downloadLink) return

    const objectUrl = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }))
    downloadLink.href = objectUrl
    downloadLink.download = `AI_Chat_Lo_${filenameContext}_${date}.md`
    downloadLink.click()
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      downloadLink.removeAttribute('href')
    }, 0)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(draft)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? 'Đóng Cố vấn AI' : 'Mở Cố vấn AI GreenFarm'}
          aria-expanded={isOpen}
          aria-controls="global-ai-chat"
          className="group relative grid size-14 place-items-center rounded-full bg-emerald-800 text-white shadow-md transition-[background-color,transform,box-shadow] hover:scale-105 hover:bg-emerald-900 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          {isOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Sparkles className={`size-5 ${isThinking ? 'ai-thinking-sparkle' : ''}`} aria-hidden="true" />
          )}
        </button>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <section
          id="global-ai-chat"
          role="dialog"
          aria-label="Cố vấn AI GreenFarm"
          className={`fixed inset-x-3 bottom-20 z-[60] flex h-[min(640px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:w-[440px] ${
            isThinking
              ? 'ai-thinking-frame border-emerald-500/60'
              : 'border-emerald-900/10'
          }`}
        >
          <header className="flex items-center justify-between gap-3 bg-emerald-900 px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <Bot className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">Cố vấn AI GreenFarm</h2>
                <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-emerald-50">
                  <span className="size-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                  <span className="truncate">{currentPage}</span>
                </span>
                {isThinking && (
                  <span className="ai-thinking-label mt-1 block text-[10px] font-medium" role="status">
                    AI đang suy nghĩ…
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng cửa sổ chat"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-emerald-50 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex items-center gap-2 border-b border-emerald-900/10 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-950">
            <label className="shrink-0 font-medium" htmlFor="global-ai-batch">Ngữ cảnh lô</label>
            <select
              id="global-ai-batch"
              value={selectedBatchId}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-emerald-900/10 bg-white px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <option value="">Không chọn lô</option>
              {availableBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_name || batch.batch_code || `Lô #${batch.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="border-b border-slate-200 px-2 py-2">
            <div role="tablist" aria-label="Công cụ Cố vấn AI" className="grid grid-cols-2 gap-1">
              {availableChatTabs.map(({ id, label, icon: Icon }, index) => (
                <button
                  ref={(element) => { tabRefs.current[index] = element }}
                  key={id}
                  id={`global-ai-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={activeTab === id ? `global-ai-panel-${id}` : undefined}
                  tabIndex={activeTab === id ? 0 : -1}
                  onClick={() => setActiveTab(id)}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                    event.preventDefault()
                    const nextIndex = event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? availableChatTabs.length - 1
                        : (index + (event.key === 'ArrowRight' ? 1 : -1) + availableChatTabs.length) % availableChatTabs.length
                    setActiveTab(availableChatTabs[nextIndex].id)
                    tabRefs.current[nextIndex]?.focus()
                  }}
                  className={`flex min-h-9 w-full items-center gap-1.5 rounded-lg px-2.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    activeTab === id
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            id={`global-ai-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`global-ai-tab-${activeTab}`}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4"
          >
            {activeTab === 'chat' ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <p className="text-xs font-semibold text-slate-700">Cuộc hội thoại</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={copyConversation}
                      disabled={messages.length === 0}
                      aria-label="Sao chép cuộc hội thoại"
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-emerald-900 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {copiedTarget === 'conversation'
                        ? <Check className="size-3.5" aria-hidden="true" />
                        : <Copy className="size-3.5" aria-hidden="true" />}
                      <span className="hidden sm:inline">
                        {copiedTarget === 'conversation' ? 'Đã sao chép' : 'Sao chép cuộc hội thoại'}
                      </span>
                      <span className="sm:hidden">
                        {copiedTarget === 'conversation' ? 'Đã chép' : 'Sao chép'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadConversation}
                      disabled={messages.length === 0}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-emerald-900/15 px-2 text-[11px] font-medium text-emerald-900 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Tải về
                    </button>
                    <a ref={downloadLinkRef} hidden aria-hidden="true" />
                  </div>
                </div>
                {clipboardError && (
                  <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
                    {clipboardError}
                  </p>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="flex min-h-full flex-col justify-center">
                      <div className="mb-5">
                        <p className="text-sm font-semibold text-slate-900">Bạn đang cần hỗ trợ việc gì?</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Hỏi về trang trại hoặc chọn một câu gợi ý bên dưới.
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => void sendMessage(suggestion)}
                            disabled={isLoading}
                            className="max-w-full rounded-xl border border-emerald-900/10 bg-emerald-50/70 px-3 py-2 text-left text-xs leading-5 text-emerald-950 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="flex max-w-[88%] flex-col">
                            <p
                              className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                                message.role === 'user'
                                  ? 'rounded-br-md bg-emerald-800 text-white'
                                  : 'rounded-bl-md bg-slate-100 text-slate-800'
                              }`}
                            >
                              {message.text}
                            </p>
                            {message.role === 'assistant' && (
                              <button
                                type="button"
                                onClick={() => void copyText(message.text, message.id)}
                                aria-label={copiedTarget === message.id ? 'Đã sao chép câu trả lời' : 'Sao chép câu trả lời'}
                                title={copiedTarget === message.id ? 'Đã sao chép' : 'Sao chép câu trả lời'}
                                className="mt-1 inline-flex min-h-8 w-fit items-center gap-1.5 rounded-md px-2 text-[11px] text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                              >
                                {copiedTarget === message.id
                                  ? <Check className="size-3.5" aria-hidden="true" />
                                  : <Copy className="size-3.5" aria-hidden="true" />}
                                {copiedTarget === message.id ? 'Đã sao chép' : 'Sao chép'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <ThoughtLine
                          working
                          label="Đang đối chiếu dữ liệu trang trại"
                          steps={[
                            'Đọc ngữ cảnh trang hiện tại',
                            'Kiểm tra dữ liệu lô đã chọn',
                            'Soạn câu trả lời có căn cứ',
                          ]}
                        />
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                  {errorMessage && (
                    <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-800">
                      {errorMessage}
                    </p>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="mt-3 border-t border-slate-200 pt-3">
                  <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
                    <label className="sr-only" htmlFor="global-ai-chat-input">Nhập câu hỏi cho Cố vấn AI</label>
                    <textarea
                      ref={inputRef}
                      id="global-ai-chat-input"
                      rows={2}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Hỏi về việc chăm sóc cây…"
                      className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || isLoading}
                      aria-label="Gửi câu hỏi"
                      className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-800 text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[10px] leading-4 text-slate-500">
                    AI hỗ trợ tham khảo; hãy kiểm tra trước khi áp dụng.
                  </p>
                </form>
              </>
            ) : (
              <ToolPanel
                tab={activeTool}
                hasBatch={Boolean(selectedBatchId)}
                batchLabel={selectedBatch?.batch_name || selectedBatch?.batch_code || `Lô #${selectedBatchId}`}
                isLoading={isToolLoading}
                error={toolError}
                result={toolResult}
                onRefresh={() => setToolRefresh((current) => current + 1)}
              />
            )}
          </div>
        </section>,
        document.body,
      )}
    </>
  )
}

function ToolPanel({
  tab,
  hasBatch,
  batchLabel,
  isLoading,
  error,
  result,
  onRefresh,
}: {
  tab: Exclude<ChatTab, 'chat'> | null
  hasBatch: boolean
  batchLabel: string
  isLoading: boolean
  error: string
  result: ToolResult | null
  onRefresh: () => void
}) {
  if (!tab) return null
  if (!hasBatch) {
    return (
      <div className="my-auto flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Chọn lô trồng để dùng công cụ này.</p>
      </div>
    )
  }

  const actionLabel = {
    schedule: 'Sinh lịch',
    summary: 'Tóm tắt lại',
    alerts: 'Quét cảnh báo',
  }[tab]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{batchLabel}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {tab === 'schedule' && 'Lịch tham khảo dựa trên giống cây và ngày gieo của lô.'}
            {tab === 'summary' && 'Tóm tắt hoạt động đã ghi và các vấn đề được nhật ký đề cập.'}
            {tab === 'alerts' && 'Xếp hạng toàn hệ thống dựa trên nhật ký gần nhất và ghi nhận sâu bệnh.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-900/15 px-2.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {actionLabel}
        </button>
      </div>

      {isLoading && (
        <ThoughtLine
          working={isLoading}
          label={TOOL_TITLES[tab]}
          steps={[
            `Đọc dữ liệu của ${batchLabel}`,
            'Đối chiếu thông tin đã ghi trong hệ thống',
            'Tổng hợp kết quả tham khảo',
          ]}
        />
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 font-semibold text-rose-900 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && result && tab === 'schedule' && 'schedule' in result && (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-950">
            <p><strong>Ngày gieo:</strong> {result.seeding_date}</p>
            <p><strong>Dự kiến thu hoạch:</strong> {result.expected_harvest_date || 'Chưa có dữ liệu'}</p>
          </div>
          {result.schedule.length ? result.schedule.map((item, index) => (
            <article key={`${item.date}-${index}`} className="rounded-xl border border-slate-200 px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <CalendarDays className="size-3.5" aria-hidden="true" /> {item.date}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-900">
                  {getTaskLabel(item.task_type)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-700">{item.description}</p>
            </article>
          )) : (
            <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600">Chưa có mốc chăm sóc phù hợp để đề xuất.</p>
          )}
          <p className="text-[11px] leading-5 text-slate-500">{result.disclaimer}</p>
        </div>
      )}

      {!isLoading && result && tab === 'summary' && 'issues_detected' in result && (
        <article className="space-y-3 rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Check className="size-4 text-emerald-700" aria-hidden="true" />
            {result.log_count ?? 0} ghi chép · {result.batch_code || batchLabel}
          </div>
          <section className="rounded-xl bg-emerald-50 px-3.5 py-3">
            <h3 className="text-xs font-semibold text-emerald-950">Tóm tắt</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {result.summary?.trim() || 'Chưa có nội dung tóm tắt từ AI cho lô này.'}
            </p>
          </section>
          <section className="rounded-xl bg-amber-50 px-3.5 py-3">
            <h3 className="text-xs font-semibold text-amber-950">Vấn đề ghi nhận</h3>
            {(result.key_issues ?? result.issues_detected ?? []).length > 0 ? (
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs leading-5 text-slate-700">
                {(result.key_issues ?? result.issues_detected ?? []).map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-xs leading-5 text-slate-600">Chưa ghi nhận vấn đề nổi bật.</p>
            )}
          </section>
          <section className="rounded-xl bg-emerald-50 px-3.5 py-3">
            <h3 className="text-xs font-semibold text-emerald-950">Đề xuất</h3>
            {result.recommendations?.length ? (
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs leading-5 text-slate-700">
                {result.recommendations.map((recommendation, index) => (
                  <li key={`${recommendation}-${index}`}>{recommendation}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs leading-5 text-slate-600">Chưa có đề xuất bổ sung.</p>
            )}
          </section>
          <p className="border-t border-slate-100 pt-2 text-[11px] leading-5 text-slate-500">{result.disclaimer}</p>
        </article>
      )}

      {!isLoading && result && tab === 'alerts' && 'priority_batches' in result && (
        <div className="space-y-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
            Đang theo dõi {result.total_growing_batches} lô đang canh tác trong hệ thống. Kết quả dựa trên thời gian từ ghi chép gần nhất và dấu hiệu sâu bệnh; không bao gồm dữ liệu cảm biến thời tiết/độ ẩm.
          </p>
          {result.priority_batches.length > 0 ? result.priority_batches.map((item) => (
            <article key={item.batch_code} className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-white px-3.5 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-800">
                <AlertTriangle className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900">{item.batch_code}</p>
                  <span className="text-[10px] font-medium text-amber-800">Mức ưu tiên {item.priority_score}/5</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p>
              </div>
            </article>
          )) : (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-950">
              Chưa có lô nào được xếp vào danh sách cần kiểm tra ưu tiên.
            </p>
          )}
          <p className="text-[11px] leading-5 text-slate-500">{result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
