'use client'

import { useState, useEffect } from 'react'
import {
  Bell,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  LandPlot,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { AiAlertOut } from '@/lib/types'
import { cn } from '@/lib/utils'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'system'>('ai')
  
  // State AI Alerts
  const [aiResult, setAiResult] = useState<AiAlertOut | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // State System Notifications
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [systemLoading, setSystemLoading] = useState(false)

  // Tải thông báo hệ thống khi mở Popup
  useEffect(() => {
    if (isOpen && systemLogs.length === 0) {
      fetchSystemNotifications()
    }
  }, [isOpen])

  async function fetchSystemNotifications() {
    setSystemLoading(true)
    try {
      const data = await api<any[]>('/api/notifications')
      setSystemLogs(data ?? [])
    } catch {
      /* Fallback dữ liệu tĩnh nếu API chưa ready */
      setSystemLogs([])
    } finally {
      setSystemLoading(false)
    }
  }

  async function handleCheckAi() {
    setAiLoading(true)
    setAiError(null)
    try {
      const data = await api<AiAlertOut>('/api/ai/alerts', { method: 'POST' })
      setAiResult(data)
    } catch (err) {
      setAiError(
        err instanceof ApiError
          ? err.message
          : 'Không thể kết nối tới AI phân tích lúc này.'
      )
    } finally {
      setAiLoading(false)
    }
  }

  const hasUnread =
    (aiResult?.priority_batches?.length ?? 0) > 0 ||
    systemLogs.some((n) => n.unread)

  return (
    <div className="relative">
      {/* Nút Chuông Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Thông báo & Cảnh báo AI"
      >
        <Bell className="size-4" />
        {hasUnread && (
          <span className="absolute top-1 right-1 size-2.5 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
        )}
      </button>

      {/* Menu thả xuống */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-[410px] overflow-hidden rounded-3xl border border-border bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md">
            
            {/* Header & Tabs */}
            <div className="border-b border-border bg-muted/30 p-3.5 pb-0">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-bold text-foreground">
                  Thông báo & Cảnh báo
                </span>
                {activeTab === 'ai' && (
                  <button
                    type="button"
                    onClick={handleCheckAi}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.2 text-xs font-semibold text-white transition-all hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    <RefreshCw
                      className={cn('size-3.5', aiLoading && 'animate-spin')}
                    />
                    {aiResult ? 'Cập nhật' : 'Phân tích AI'}
                  </button>
                )}
              </div>

              {/* Nút chuyển Tab */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
                    activeTab === 'ai'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Cảnh báo AI
                  {aiResult?.priority_batches?.length ? (
                    <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                      {aiResult.priority_batches.length}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
                    activeTab === 'system'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Bell className="size-3.5" />
                  Hệ thống
                  {systemLogs.filter((n) => n.unread).length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {systemLogs.filter((n) => n.unread).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="max-h-[380px] min-h-[220px] overflow-y-auto p-3.5">
              
              {/* TAB 1: CẢNH BÁO AI */}
              {activeTab === 'ai' && (
                <>
                  {aiError && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {aiLoading && (
                    <div className="space-y-2.5 py-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-16 w-full animate-pulse rounded-2xl bg-muted/60"
                        />
                      ))}
                    </div>
                  )}

                  {!aiError && !aiResult && !aiLoading && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <Sparkles className="size-5" />
                      </div>
                      <p className="font-medium text-foreground">
                        Sẵn sàng phân tích trang trại
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Bấm <strong>"Phân tích AI"</strong> để phát hiện sớm các lô trồng cần ưu tiên xử lý.
                      </p>
                    </div>
                  )}

                  {aiResult && !aiLoading && (
                    <div className="space-y-3">
                      {aiResult.priority_batches.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500 opacity-80" />
                          <p className="font-medium text-foreground">
                            Tất cả các lô trồng đang ổn định
                          </p>
                          <p className="mt-1 text-[11px]">
                            {aiResult.total_growing_batches} lô đang trồng không có bất thường.
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {aiResult.priority_batches.map((item) => {
                            const plotDisplayName =
                              (item as any).plot_name ??
                              (item as any).plotName ??
                              `Lô ${item.batch_code}`

                            return (
                              <li
                                key={item.batch_code}
                                className="group relative flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3 text-xs transition-all hover:border-emerald-500/40 hover:bg-accent/40"
                              >
                                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-xl bg-destructive/10 font-mono text-xs font-bold text-destructive">
                                  #{item.priority_score}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="flex items-center gap-1 font-bold text-foreground">
                                      <LandPlot className="size-3 text-emerald-600" />
                                      {plotDisplayName}
                                    </span>
                                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                      {item.batch_code}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-muted-foreground leading-relaxed">
                                    {item.reason}
                                  </p>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}

                      {aiResult.disclaimer && (
                        <div className="mt-3 flex items-start gap-1.5 border-t border-border/60 pt-2.5 text-[11px] italic text-muted-foreground">
                          <Info className="size-3.5 shrink-0 text-muted-foreground" />
                          <span>{aiResult.disclaimer}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: THÔNG BÁO HỆ THỐNG */}
              {activeTab === 'system' && (
                <>
                  {systemLoading ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-12 w-full animate-pulse rounded-xl bg-muted/60"
                        />
                      ))}
                    </div>
                  ) : systemLogs.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      Không có thông báo hệ thống mới nào.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {systemLogs.map((noti) => (
                        <li
                          key={noti.id}
                          className={cn(
                            'flex items-start justify-between gap-2 rounded-2xl border border-border/50 p-3 text-xs transition-colors',
                            noti.unread ? 'bg-primary/5 border-primary/20' : 'bg-card'
                          )}
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground">
                              {noti.title}
                            </p>
                            <p className="text-muted-foreground">
                              {noti.message}
                            </p>
                            <span className="inline-block text-[10px] text-muted-foreground">
                              {noti.time}
                            </span>
                          </div>
                          {noti.unread && (
                            <span className="size-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  )
}