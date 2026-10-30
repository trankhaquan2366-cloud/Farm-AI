'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import dynamic from 'next/dynamic'
// Tách qrcode.react khỏi bundle đầu trang: chỉ tải khi khu vực tem truy xuất được render.
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => ({ default: mod.QRCodeSVG })),
  { ssr: false },
)
const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => ({ default: mod.QRCodeCanvas })),
  { ssr: false },
)
import {
  AlertCircle,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  FlaskConical,
  Leaf,
  Loader2,
  PackageCheck,
  Printer,
  Sprout,
  Truck,
  Droplets,
} from 'lucide-react'

import { StatusBadge } from '@/components/batches/status-badge'
import { inputClass } from '@/components/ui/field'
import { ApiError, fetcher } from '@/lib/api'

type BatchOption = {
  id: number
  batch_code?: string | null
  code?: string | null
  batch_name?: string | null
  name?: string | null
  status?: string | null
  seeding_date?: string | null
  sow_date?: string | null
  planted_date?: string | null
  expected_harvest_date?: string | null
  updated_at?: string | null
}

type HarvestOption = {
  id: number
  batch_id: number
  quantity?: number | null
  quantity_kg?: number | null
  harvest_time?: string | null
  harvest_date?: string | null
}

type TraceCareLog = {
  id: number
  date?: string | null
  action?: string | null
  notes?: string | null
}

type TraceHarvest = {
  id: number
  quantity?: number | null
  unit?: string | null
  harvest_date?: string | null
}

type BatchTrace = {
  code: string
  batch_id: number
  batch_name?: string | null
  plant_name?: string | null
  plot_name?: string | null
  planted_date?: string | null
  expected_harvest_date?: string | null
  status?: string | null
  care_logs?: TraceCareLog[]
  harvest_logs?: TraceHarvest[]
}

type BatchTraceResponse = {
  data: BatchTrace
}

type TimelineEntry = {
  id: string
  date: string | null
  title: string
  detail: string
  kind: 'seed' | 'care' | 'harvest'
}

function getBatchCode(batch: BatchOption) {
  return batch.batch_code || batch.code || String(batch.id)
}

function getBatchName(batch: BatchOption) {
  return batch.batch_name || batch.name || `Lô trồng ${getBatchCode(batch)}`
}

function getHarvestDate(harvest: HarvestOption) {
  return harvest.harvest_date || harvest.harvest_time || null
}

function getLocalDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa ghi nhận'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}

function isHarvested(status?: string | null) {
  const normalized = status?.toLowerCase()
  return normalized === 'harvested' || normalized === 'đã thu hoạch'
}

function getCareIcon(action: string) {
  const normalized = action.toLowerCase()
  if (normalized.includes('tưới') || normalized.includes('irrigat')) return Droplets
  if (
    normalized.includes('phân') ||
    normalized.includes('thuốc') ||
    normalized.includes('bón') ||
    normalized.includes('spray')
  ) {
    return FlaskConical
  }
  if (normalized.includes('thu hoạch') || normalized.includes('harvest')) return PackageCheck
  return Leaf
}

export default function TraceabilityPage() {
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [siteOrigin, setSiteOrigin] = useState('')
  const [showLogo, setShowLogo] = useState(true)
  const [showProductName, setShowProductName] = useState(true)
  const [showPackDate, setShowPackDate] = useState(true)
  const [showStandard, setShowStandard] = useState(true)
  const [standard, setStandard] = useState('VietGAP')
  const [packDate, setPackDate] = useState('')
  const [downloadMessage, setDownloadMessage] = useState('')
  const qrCanvasRef = useRef<HTMLDivElement>(null)

  const {
    data: batches,
    error: batchesError,
    isLoading: batchesLoading,
  } = useSWR<BatchOption[]>('/api/batches', fetcher)
  const { data: harvests, error: harvestsError } = useSWR<HarvestOption[]>(
    '/api/harvests',
    fetcher,
  )

  useEffect(() => {
    setSiteOrigin(window.location.origin)
    setPackDate(getLocalDateInputValue(new Date()))
  }, [])

  useEffect(() => {
    if (!selectedBatchId && batches?.length) {
      setSelectedBatchId(String(batches[0].id))
    }
  }, [batches, selectedBatchId])

  const selectedBatch = batches?.find((batch) => String(batch.id) === selectedBatchId)
  const batchCode = selectedBatch ? getBatchCode(selectedBatch) : ''
  const publicUrl =
    siteOrigin && batchCode
      ? `${siteOrigin}/trace/${encodeURIComponent(batchCode)}`
      : ''

  const {
    data: traceResponse,
    error: traceError,
    isLoading: traceLoading,
  } = useSWR<BatchTraceResponse>(
    batchCode ? `/api/batches/code/${encodeURIComponent(batchCode)}/trace` : null,
    fetcher,
  )
  const trace = traceResponse?.data

  const latestHarvestByBatch = useMemo(() => {
    const latest = new Map<number, HarvestOption>()
    for (const harvest of harvests ?? []) {
      const current = latest.get(harvest.batch_id)
      const date = getHarvestDate(harvest)
      const currentDate = current ? getHarvestDate(current) : null
      if (!current || (date && (!currentDate || date > currentDate))) {
        latest.set(harvest.batch_id, harvest)
      }
    }
    return latest
  }, [harvests])

  const recentlyHarvested = useMemo(() => {
    if (!batches) return []
    const withHarvestRecords = batches
      .filter((batch) => latestHarvestByBatch.has(batch.id))
      .sort((a, b) => {
        const aDate = getHarvestDate(latestHarvestByBatch.get(a.id)!) ?? ''
        const bDate = getHarvestDate(latestHarvestByBatch.get(b.id)!) ?? ''
        return bDate.localeCompare(aDate)
      })

    if (withHarvestRecords.length) return withHarvestRecords

    return batches
      .filter((batch) => isHarvested(batch.status))
      .sort((a, b) =>
        (b.expected_harvest_date || b.updated_at || '').localeCompare(
          a.expected_harvest_date || a.updated_at || '',
        ),
      )
  }, [batches, latestHarvestByBatch])

  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!trace) return []

    const entries: TimelineEntry[] = [
      {
        id: 'seeding',
        date: trace.planted_date ?? null,
        title: 'Gieo trồng',
        detail: trace.plot_name ? `Thực hiện tại ${trace.plot_name}` : 'Bắt đầu vụ trồng',
        kind: 'seed',
      },
      ...(trace.care_logs ?? []).map((log) => ({
        id: `care-${log.id}`,
        date: log.date ?? null,
        title: log.action || 'Chăm sóc',
        detail: log.notes || 'Hoạt động được ghi nhận trong nhật ký.',
        kind: 'care' as const,
      })),
      ...(trace.harvest_logs ?? []).map((harvest) => ({
        id: `harvest-${harvest.id}`,
        date: harvest.harvest_date ?? null,
        title: 'Thu hoạch',
        detail:
          harvest.quantity == null
            ? 'Đã ghi nhận đợt thu hoạch.'
            : `${harvest.quantity.toLocaleString('vi-VN')} ${harvest.unit || 'kg'}`,
        kind: 'harvest' as const,
      })),
    ]

    return entries.sort((a, b) => {
      if (!a.date) return -1
      if (!b.date) return 1
      return a.date.localeCompare(b.date)
    })
  }, [trace])

  const productName = trace?.plant_name || selectedBatch?.batch_name || 'Nông sản'
  const batchName = trace?.batch_name || (selectedBatch ? getBatchName(selectedBatch) : '')
  const status = trace?.status || selectedBatch?.status
  const sowingDate = trace?.planted_date || selectedBatch?.planted_date || selectedBatch?.sow_date || selectedBatch?.seeding_date

  function downloadQrPng() {
    setDownloadMessage('')
    const canvas = qrCanvasRef.current?.querySelector('canvas')
    if (!canvas || !batchCode) {
      setDownloadMessage('Mã QR chưa sẵn sàng. Vui lòng thử lại sau giây lát.')
      return
    }

    try {
      const downloadLink = document.createElement('a')
      downloadLink.download = `greenfarm-${batchCode}-qr.png`
      downloadLink.href = canvas.toDataURL('image/png')
      downloadLink.click()
      setDownloadMessage('Đã tải mã QR PNG.')
    } catch (error) {
      console.error('Không thể xuất mã QR thành PNG:', error)
      setDownloadMessage('Không thể tải mã QR. Vui lòng thử lại.')
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-3 border-b border-[#183a32]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-[#52675a]">
            <Leaf className="size-4 text-[#5d8b58]" aria-hidden="true" />
            GreenFarm AI · Nguồn gốc rõ ràng
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#183a32] sm:text-4xl">
            Tạo nhãn truy xuất
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52675a]">
            Chọn mẻ trồng, xem lại hành trình canh tác và chuẩn bị tem QR cho nông sản.
          </p>
        </div>
        {selectedBatch && (
          <div className="flex items-center gap-2 self-start rounded-full bg-[#e6efe6] px-3 py-1.5 text-sm font-medium text-[#315d43] sm:self-auto">
            <Check className="size-4" aria-hidden="true" />
            Dữ liệu theo lô trồng
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(290px,360px)_minmax(0,1fr)] lg:gap-10">
        <aside className="space-y-7 lg:border-r lg:border-[#183a32]/10 lg:pr-8">
          <section aria-labelledby="batch-selection-title">
            <h2 id="batch-selection-title" className="text-lg font-semibold text-[#183a32]">
              Chọn mẻ trồng
            </h2>
            <p className="mt-1 text-sm leading-5 text-[#52675a]">
              Chọn mẻ để tạo nhãn và xem dữ liệu nguồn gốc.
            </p>

            {batchesLoading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-[#52675a]" role="status">
                <Loader2 className="size-4 animate-spin" />
                Đang tải danh sách lô trồng…
              </p>
            ) : batchesError ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  {batchesError instanceof ApiError
                    ? batchesError.message
                    : 'Không thể tải danh sách lô trồng. Vui lòng tải lại trang.'}
                </span>
              </div>
            ) : (
              <label className="mt-4 block">
                <span className="sr-only">Lô trồng</span>
                <select
                  value={selectedBatchId}
                  onChange={(event) => {
                    setSelectedBatchId(event.target.value)
                    setDownloadMessage('')
                  }}
                  className={inputClass}
                  aria-label="Chọn lô trồng"
                  disabled={!batches?.length}
                >
                  <option value="">Chọn lô trồng</option>
                  {(batches ?? []).map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {getBatchName(batch)} · {getBatchCode(batch)} · {batch.status || 'Chưa rõ trạng thái'}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <section aria-labelledby="harvested-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="harvested-title" className="text-sm font-semibold text-[#183a32]">
                Mẻ đã thu hoạch gần đây
              </h2>
              <span className="text-xs text-[#718078]">{recentlyHarvested.length} mẻ</span>
            </div>
            {harvestsError && (
              <p className="mt-2 text-xs leading-5 text-amber-800" role="status">
                Không tải được ngày thu hoạch chi tiết; danh sách dựa trên trạng thái lô.
              </p>
            )}
            {recentlyHarvested.length ? (
              <ul className="mt-3 divide-y divide-[#183a32]/10">
                {recentlyHarvested.slice(0, 5).map((batch) => {
                  const harvest = latestHarvestByBatch.get(batch.id)
                  const date = harvest ? getHarvestDate(harvest) : null
                  const isSelected = String(batch.id) === selectedBatchId
                  return (
                    <li key={batch.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBatchId(String(batch.id))
                          setDownloadMessage('')
                        }}
                        aria-pressed={isSelected}
                        className={`flex w-full items-start justify-between gap-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58] ${
                          isSelected ? 'text-[#183a32]' : 'text-[#34483b] hover:text-[#183a32]'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {getBatchName(batch)}
                          </span>
                          <span className="mt-1 block font-mono text-xs text-[#718078]">
                            {getBatchCode(batch)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-xs font-medium text-[#315d43]">
                            {date ? formatDate(date) : 'Đã thu hoạch'}
                          </span>
                          {isSelected && <span className="mt-1 block text-[11px]">Đang chọn</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 border-l-2 border-[#d6e4d7] py-1 pl-3 text-sm leading-5 text-[#718078]">
                Chưa có mẻ thu hoạch. Bạn vẫn có thể chọn bất kỳ lô trồng nào ở trên.
              </p>
            )}
          </section>

          <section aria-labelledby="label-options-title" className="border-t border-[#183a32]/10 pt-6">
            <h2 id="label-options-title" className="text-lg font-semibold text-[#183a32]">
              Nội dung trên tem
            </h2>
            <div className="mt-4 space-y-3">
              <label className="flex min-h-6 items-center gap-3 text-sm text-[#34483b]">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(event) => setShowLogo(event.target.checked)}
                  className="size-4 accent-[#315d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58]"
                />
                Logo GreenFarm AI
              </label>
              <label className="flex min-h-6 items-center gap-3 text-sm text-[#34483b]">
                <input
                  type="checkbox"
                  checked={showProductName}
                  onChange={(event) => setShowProductName(event.target.checked)}
                  className="size-4 accent-[#315d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58]"
                />
                Tên sản phẩm
              </label>
              <label className="flex min-h-6 items-center gap-3 text-sm text-[#34483b]">
                <input
                  type="checkbox"
                  checked={showPackDate}
                  onChange={(event) => setShowPackDate(event.target.checked)}
                  className="size-4 accent-[#315d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58]"
                />
                Ngày đóng gói
              </label>
              {showPackDate && (
                <label className="block pl-7">
                  <span className="mb-1.5 block text-xs font-medium text-[#52675a]">
                    Ngày đóng gói
                  </span>
                  <input
                    type="date"
                    value={packDate}
                    onChange={(event) => setPackDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <label className="flex min-h-6 items-center gap-3 text-sm text-[#34483b]">
                <input
                  type="checkbox"
                  checked={showStandard}
                  onChange={(event) => setShowStandard(event.target.checked)}
                  className="size-4 accent-[#315d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58]"
                />
                Tiêu chuẩn sản xuất
              </label>
              {showStandard && (
                <label className="block pl-7">
                  <span className="mb-1.5 block text-xs font-medium text-[#52675a]">
                    Chọn tiêu chuẩn
                  </span>
                  <select
                    value={standard}
                    onChange={(event) => setStandard(event.target.value)}
                    className={inputClass}
                  >
                    <option value="VietGAP">VietGAP</option>
                    <option value="Organic">Organic</option>
                    <option value="GlobalGAP">GlobalGAP</option>
                  </select>
                </label>
              )}
            </div>
          </section>

          <section aria-label="Thao tác nhãn" className="border-t border-[#183a32]/10 pt-6">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!publicUrl || traceLoading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#183a32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#315d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="size-4" aria-hidden="true" />
                In nhãn tem
              </button>
              <button
                type="button"
                onClick={downloadQrPng}
                disabled={!publicUrl || traceLoading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#183a32]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#183a32] transition-colors hover:bg-[#f2f7f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-4" aria-hidden="true" />
                Tải mã QR PNG
              </button>
            </div>
            {publicUrl && (
              <Link
                href={`/trace/${encodeURIComponent(batchCode)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-[#315d43] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58]"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Xem trang công khai
              </Link>
            )}
            {downloadMessage && (
              <p className="mt-2 text-xs text-[#52675a]" role="status">
                {downloadMessage}
              </p>
            )}
          </section>
        </aside>

        <section className="min-w-0 space-y-8" aria-labelledby="preview-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="preview-title" className="text-xl font-semibold text-[#183a32]">
                Nhãn và hành trình nông sản
              </h2>
              {selectedBatch && (
                <p className="mt-1 text-sm text-[#52675a]">
                  {batchName} · {batchCode}
                </p>
              )}
            </div>
            {status && <StatusBadge status={status} />}
          </div>

          {!selectedBatch ? (
            <div className="grid min-h-72 place-items-center border-y border-dashed border-[#183a32]/20 px-6 text-center">
              <div>
                <Sprout className="mx-auto size-9 text-[#5d8b58]" aria-hidden="true" />
                <p className="mt-3 font-medium text-[#183a32]">Chọn lô trồng để tạo nhãn</p>
                <p className="mt-1 text-sm text-[#718078]">Tem QR sẽ liên kết đến hồ sơ công khai của lô.</p>
              </div>
            </div>
          ) : traceLoading ? (
            <p className="flex items-center gap-2 border-y border-[#183a32]/10 py-8 text-sm text-[#52675a]" role="status">
              <Loader2 className="size-4 animate-spin" />
              Đang tổng hợp hành trình canh tác…
            </p>
          ) : traceError || !trace ? (
            <div className="flex items-start gap-3 border-y border-red-200 py-5 text-sm text-red-900" role="alert">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Không tải được dữ liệu truy xuất</p>
                <p className="mt-1">
                  {traceError instanceof ApiError
                    ? traceError.message
                    : 'Kiểm tra lại mã lô trồng hoặc thử tải lại trang.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <article
                className="trace-printable mx-auto w-full max-w-[620px] border border-[#183a32]/20 bg-white p-5 shadow-[0_12px_36px_rgba(24,58,50,0.08)] sm:p-7"
                aria-label="Bản xem trước nhãn truy xuất"
              >
                <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#183a32]/20 pb-4">
                  {showLogo ? (
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#183a32] text-xs font-bold tracking-tight text-white">
                        GF
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#183a32]">GreenFarm AI</span>
                        <span className="block text-[11px] text-[#718078]">Nông sản minh bạch</span>
                      </span>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="text-right">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-[#52675a]">
                      TRUY XUẤT NGUỒN GỐC
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-[#183a32]">{batchCode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5 sm:gap-7">
                  <div className="min-w-0">
                    {showProductName && (
                      <>
                        <p className="text-xs text-[#718078]">Sản phẩm</p>
                        <h3 className="mt-1 break-words text-xl font-semibold leading-tight text-[#183a32] sm:text-2xl">
                          {productName}
                        </h3>
                        {batchName && batchName !== productName && (
                          <p className="mt-1 break-words text-xs text-[#52675a]">{batchName}</p>
                        )}
                      </>
                    )}
                    <dl className="mt-4 space-y-2 text-xs">
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-[#718078]">Mã mẻ</dt>
                        <dd className="break-all font-mono font-medium text-[#34483b]">{batchCode}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-[#718078]">Ngày gieo</dt>
                        <dd className="font-medium text-[#34483b]">{formatDate(sowingDate)}</dd>
                      </div>
                      {showPackDate && (
                        <div className="flex gap-2">
                          <dt className="shrink-0 text-[#718078]">Đóng gói</dt>
                          <dd className="font-medium text-[#34483b]">{formatDate(packDate)}</dd>
                        </div>
                      )}
                      {showStandard && (
                        <div className="flex gap-2">
                          <dt className="shrink-0 text-[#718078]">Tiêu chuẩn</dt>
                          <dd className="font-semibold text-[#315d43]">{standard}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div className="shrink-0 rounded-lg border border-[#183a32]/10 bg-white p-1.5">
                    {publicUrl && (
                      <QRCodeSVG
                        value={publicUrl}
                        size={150}
                        level="H"
                        includeMargin
                        aria-label={`Mã QR truy xuất ${batchCode}`}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-dashed border-[#183a32]/20 pt-3">
                  <p className="text-[10px] leading-4 text-[#718078]">
                    Quét mã để xem thông tin canh tác và thu hoạch
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#52675a]">
                    <Truck className="size-3" aria-hidden="true" />
                    {trace.plot_name || 'GreenFarm'}
                  </span>
                </div>
                {publicUrl && (
                  <div
                    ref={qrCanvasRef}
                    className="no-print pointer-events-none absolute -left-[10000px] top-0"
                    aria-hidden="true"
                  >
                    <QRCodeCanvas value={publicUrl} size={512} level="H" includeMargin />
                  </div>
                )}
              </article>

              <section aria-labelledby="journey-title">
                <div className="flex items-end justify-between gap-3 border-b border-[#183a32]/10 pb-3">
                  <div>
                    <h3 id="journey-title" className="text-lg font-semibold text-[#183a32]">
                      Hành trình nông sản
                    </h3>
                    <p className="mt-1 text-sm text-[#52675a]">
                      Các mốc được ghi nhận trong hồ sơ lô trồng.
                    </p>
                  </div>
                  <CalendarDays className="mb-1 size-5 text-[#5d8b58]" aria-hidden="true" />
                </div>
                {timeline.length ? (
                  <ol className="mt-4">
                    {timeline.map((entry, index) => {
                      const Icon =
                        entry.kind === 'seed'
                          ? Sprout
                          : entry.kind === 'harvest'
                            ? PackageCheck
                            : getCareIcon(entry.title)
                      return (
                        <li key={entry.id} className="flex gap-3">
                          <span className="flex w-8 shrink-0 flex-col items-center">
                            <span className="grid size-8 place-items-center rounded-full bg-[#e6efe6] text-[#315d43]">
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                            {index < timeline.length - 1 && (
                              <span className="my-1 w-px flex-1 bg-[#183a32]/15" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 pb-5">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                              <span className="text-sm font-semibold text-[#183a32]">{entry.title}</span>
                              <time className="text-xs text-[#718078]">
                                {formatDate(entry.date)}
                              </time>
                            </span>
                            <span className="mt-1 block text-sm leading-5 text-[#52675a]">
                              {entry.detail}
                            </span>
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="mt-4 border-l-2 border-[#d6e4d7] py-1 pl-3 text-sm text-[#718078]">
                    Chưa có nhật ký chăm sóc hoặc thu hoạch cho mẻ này.
                  </p>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
