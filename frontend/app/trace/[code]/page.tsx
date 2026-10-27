'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Search, QrCode, Loader2 } from 'lucide-react'
import { fetcher, ApiError, API_BASE_URL } from '@/lib/api'
import type { TraceabilityOut } from '@/lib/types'
import { inputClass } from '@/components/ui/field'
import { TraceReport } from '@/components/traceability/trace-report'

export default function TraceabilityPage() {
  const [input, setInput] = useState('')
  const [queryCode, setQueryCode] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR<TraceabilityOut>(
    queryCode ? `/api/batches/code/${encodeURIComponent(queryCode)}/trace` : null,
    fetcher,
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const code = input.trim().toUpperCase()
    if (!code) return
    setQueryCode(code)
  }

  // Nguồn gốc dùng để build mã QR + link chia sẻ cho khách hàng cuối.
  const publicUrl =
    typeof window !== 'undefined' && queryCode
      ? `${window.location.origin}/trace/${encodeURIComponent(queryCode)}`
      : undefined

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
          <QrCode className="size-7 text-primary" />
          Truy xuất nguồn gốc
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhập mã lô trồng (vd. <span className="font-mono">A01</span>) để xem toàn bộ lịch sử: giống cây, lô đất,
          nhật ký chăm sóc, vật tư đã dùng, thu hoạch và bán hàng. Backend hiện lộ endpoint công khai tại{' '}
          <span className="font-mono">GET {API_BASE_URL}/api/batches/code/&#123;batch_code&#125;/trace</span> —
          đây chính là dữ liệu có thể gắn vào mã QR trên bao bì.
        </p>
      </div>

      <form onSubmit={handleSearch} className="surface-glass flex flex-col gap-3 rounded-3xl p-5 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập mã lô trồng, vd: A01"
          className={inputClass + ' font-mono uppercase sm:flex-1'}
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <Search className="size-4" />
          Tra cứu
        </button>
      </form>

      {isLoading && (
        <div className="surface-glass flex items-center justify-center gap-2 rounded-3xl p-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải dữ liệu truy xuất...
        </div>
      )}

      {error && (
        <div className="surface-glass rounded-3xl p-8 text-center text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : `Không tìm thấy lô trồng có mã "${queryCode}".`}
        </div>
      )}

      {!isLoading && !error && data && <TraceReport data={data} publicUrl={publicUrl} />}

      {!queryCode && !isLoading && (
        <div className="surface-glass rounded-3xl p-12 text-center text-sm text-muted-foreground">
          Nhập mã lô trồng ở trên để bắt đầu tra cứu.
        </div>
      )}
    </div>
  )
}
