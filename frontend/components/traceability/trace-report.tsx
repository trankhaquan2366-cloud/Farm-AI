'use client'

import { useState } from 'react'
import {
  Sprout,
  LandPlot,
  CalendarDays,
  Package,
  ShoppingCart,
  Beaker,
  QrCode,
  Copy,
  Check,
  ClipboardList,
} from 'lucide-react'
import { StatusBadge } from '@/components/batches/status-badge'
import { CareLogTypeIcon, CareLogTypeBadge } from '@/components/traceability/care-log-type-badge'

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN')
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime())
    ? value
    : d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) return '0 ₫'
  return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
}

type TraceReportProps = {
  data?: any
  publicUrl?: string
}

export function TraceReport({ data, publicUrl }: TraceReportProps) {
  if (!data) {
    return (
      <div className="surface-glass rounded-3xl p-8 text-center text-muted-foreground">
        Đang tải thông tin truy xuất nguồn gốc hoặc không có dữ liệu...
      </div>
    )
  }

  // Tự động mở bọc dữ liệu từ backend
  const raw = data?.data ?? data?.batch ?? data

  // Khai báo biến khớp 100% với JSON Backend trả về
  const batchCode = raw?.code ?? raw?.batch_code ?? raw?.batchCode ?? '—'
  const status = raw?.status ?? 'active'

  // 1. Tên giống cây (khớp plant_name: "Cà chua")
  const varietyName =
    raw?.plant_name ??
    raw?.variety_name ??
    raw?.varietyName ??
    raw?.batch_name ??
    '—'

  // 2. Tên lô đất (khớp plot_name: "Nội thành")
  const plotName = raw?.plot_name ?? raw?.plotName ?? '—'

  // 3. Ngày gieo trồng (khớp planted_date: "2026-09-17")
  const seedingDate =
    raw?.planted_date ??
    raw?.seeding_date ??
    raw?.sow_date ??
    raw?.created_at

  const careLogs: any[] = raw?.care_logs ?? raw?.careLogs ?? []
  const harvests: any[] = raw?.harvest_logs ?? raw?.harvests ?? []

  // 4. Ưu tiên lấy Ngày thu hoạch từ Nhật ký "Thu hoạch" nếu đã thu hoạch
  const harvestFromLog = careLogs.find((log: any) => {
    const act = (log.action ?? log.log_type ?? '').toLowerCase()
    return act.includes('thu hoạch') || act.includes('harvest')
  })?.date

  const harvestDate =
    harvestFromLog ??
    raw?.harvest_date ??
    raw?.harvests?.[0]?.harvest_date ??
    raw?.expected_harvest_date

  const totalHarvested = harvests.reduce(
    (sum, h) => sum + (h.quantity_kg ?? h.quantityKg ?? h.quantity ?? 0),
    0
  )
  const totalSold = harvests.reduce((sum, h) => {
    const sales = h.sales ?? h.sale_logs ?? []
    return sum + sales.reduce((s: number, sale: any) => s + (sale.quantity_kg ?? sale.quantityKg ?? sale.quantity ?? 0), 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Khối tổng quan lô trồng */}
      <div className="surface-glass rounded-3xl p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl bg-primary/10 px-3 py-1 font-mono text-lg font-bold tracking-wide text-primary">
                {batchCode}
              </span>
              {status && <StatusBadge status={status} />}
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-foreground">
                <Sprout className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Giống: <span className="font-medium">{varietyName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <LandPlot className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Lô đất: <span className="font-medium">{plotName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Ngày gieo trồng: <span className="font-medium">{formatDate(seedingDate)}</span>
                </span>
              </div>
              {harvestDate && (
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    Ngày thu hoạch:{' '}
                    <span className="font-medium">{formatDate(harvestDate)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {publicUrl && <QrShareBlock publicUrl={publicUrl} />}
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4 text-xs">
          <span className="rounded-xl bg-secondary px-3 py-1.5 font-medium text-secondary-foreground">
            {careLogs.length} nhật ký chăm sóc
          </span>
          <span className="rounded-xl bg-secondary px-3 py-1.5 font-medium text-secondary-foreground">
            {harvests.length} đợt thu hoạch · {totalHarvested.toLocaleString('vi-VN')} kg
          </span>
          <span className="rounded-xl bg-secondary px-3 py-1.5 font-medium text-secondary-foreground">
            Đã bán {totalSold.toLocaleString('vi-VN')} kg
          </span>
        </div>
      </div>

      {/* Nhật ký chăm sóc */}
      <div className="surface-glass rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <ClipboardList className="size-5 text-primary" />
          Lịch sử chăm sóc
        </h2>
        {careLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có nhật ký chăm sóc nào được ghi nhận.</p>
        ) : (
          <ol className="space-y-4">
            {careLogs.map((log, i) => {
              const logType = log.action ?? log.log_type ?? log.logType ?? 'Chăm sóc'
              const performedAt = log.date ?? log.performed_at ?? log.created_at
              const description = log.notes ?? log.description ?? ''
              const supplies = log.supplies_used ?? []

              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CareLogTypeIcon type={logType} />
                    {i < careLogs.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CareLogTypeBadge type={logType} />
                      <span className="text-xs text-muted-foreground">{formatDateTime(performedAt)}</span>
                    </div>
                    {description && <p className="mt-1.5 text-sm text-foreground">{description}</p>}
                    {log.conditions && (
                      <p className="mt-0.5 text-xs text-muted-foreground">Điều kiện: {log.conditions}</p>
                    )}
                    {supplies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {supplies.map((s: any, si: number) => (
                          <span
                            key={si}
                            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground"
                          >
                            <Beaker className="size-3" />
                            {s.supply_name ?? s.name}: {s.quantity_used ?? s.quantity} {s.unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Thu hoạch & Phân phối */}
      <div className="surface-glass rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <Package className="size-5 text-primary" />
          Thu hoạch &amp; phân phối
        </h2>
        {harvests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có đợt thu hoạch nào.</p>
        ) : (
          <div className="space-y-4">
            {harvests.map((h, i) => {
              const sales = h.sales ?? h.sale_logs ?? []
              const quantityKg = h.quantity_kg ?? h.quantityKg ?? h.quantity ?? 0
              const hDate = h.harvest_date ?? h.date ?? h.created_at
              const grade = h.quality_grade ?? h.grade

              return (
                <div key={i} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      Thu hoạch ngày {formatDate(hDate)}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary">
                        {quantityKg.toLocaleString('vi-VN')} kg
                      </span>
                      {grade && (
                        <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600">
                          Loại {grade}
                        </span>
                      )}
                    </div>
                  </div>

                  {sales.length > 0 && (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">
                              <span className="flex items-center gap-1">
                                <ShoppingCart className="size-3" /> Khách hàng
                              </span>
                            </th>
                            <th className="px-3 py-2 font-medium">Ngày bán</th>
                            <th className="px-3 py-2 text-right font-medium">Khối lượng</th>
                            <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
                            <th className="px-3 py-2 text-right font-medium">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {sales.map((s: any, si: number) => {
                            const saleQty = s.quantity_kg ?? s.quantity ?? 0
                            const unitPrice = s.unit_price ?? s.price ?? 0

                            return (
                              <tr key={si}>
                                <td className="px-3 py-2 text-foreground">{s.customer_name ?? '—'}</td>
                                <td className="px-3 py-2 text-muted-foreground">{formatDate(s.sale_date)}</td>
                                <td className="px-3 py-2 text-right text-foreground">
                                  {saleQty.toLocaleString('vi-VN')} kg
                                </td>
                                <td className="px-3 py-2 text-right text-foreground">
                                  {formatCurrency(unitPrice)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-foreground">
                                  {formatCurrency(unitPrice * saleQty)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function QrShareBlock({ publicUrl }: { publicUrl: string }) {
  const [copied, setCopied] = useState(false)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(publicUrl)}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-background p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt="Mã QR truy xuất nguồn gốc" width={112} height={112} className="rounded-lg" />
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
      </button>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <QrCode className="size-3" /> Dán lên bao bì sản phẩm
      </span>
    </div>
  )
}