'use client'

import { useState } from 'react'
import { Bell, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { AiAlertOut } from '@/lib/types'
import { cn } from '@/lib/utils'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<AiAlertOut | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    setLoading(true)
    setError(null)
    try {
      // Ép kiểu trực tiếp bằng 'as AiAlertOut'
      const data = (await api('/api/ai-alert/alerts', { method: 'POST' })) as AiAlertOut
      setResult(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể kết nối tới AI')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Thông báo & Cảnh báo AI"
      >
        <Bell className="size-4" />
        {/* Chấm đỏ báo hiệu */}
        <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive ring-2 ring-background" />
      </button>

      {/* Popover Менu thả xuống */}
      {isOpen && (
        <>
          {/* Overlay bấm ra ngoài để đóng */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl transition-all">
            {/* Header Popup */}
            <div className="flex items-center justify-between border-b border-border p-3.5">
              <span className="text-sm font-semibold text-foreground">
                Thông báo & Cảnh báo AI
              </span>

              <button
                type="button"
                onClick={handleCheck}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-emerald-700"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                {result ? 'Làm mới' : 'Xem gợi ý AI'}
              </button>
            </div>

            {/* Nội dung danh sách cảnh báo */}
            <div className="max-h-[380px] overflow-y-auto p-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!error && !result && !loading && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Sparkles className="mx-auto mb-2 size-6 text-emerald-600 opacity-80" />
                  <p>
                    Bấm <strong>"Xem gợi ý AI"</strong> để phân tích các lô đang trồng và xếp hạng lô cần kiểm tra ưu tiên.
                  </p>
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  {result.priority_batches.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Không có lô nào cần chú ý đặc biệt lúc này ({result.total_growing_batches} lô đang trồng).
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {result.priority_batches.map((item) => (
                        <li
                          key={item.batch_code}
                          className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs"
                        >
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-[11px] font-bold text-destructive">
                            {item.priority_score}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{item.batch_code}</p>
                            <p className="mt-0.5 text-muted-foreground">{item.reason}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {result.disclaimer && (
                    <p className="border-t border-border pt-2.5 text-[11px] italic text-muted-foreground">
                      {result.disclaimer}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}