'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { QRCodeSVG } from 'qrcode.react'
import { AlertCircle, CalendarDays, CheckCircle2, Leaf, MapPin, Printer, Sprout } from 'lucide-react'

import { ApiError, fetcher } from '@/lib/api'

type TracePayload = {
  batch_info: {
    id: number
    batch_code: string
    batch_name: string | null
    status: string | null
    sow_date: string | null
    expected_harvest_date: string | null
    quantity_used: number | null
  }
  plot_info: {
    id: number | null
    name: string | null
    area: number | null
    location: string | null
  }
  variety_info: {
    id: number | null
    name: string | null
    growth_duration_days: number | null
  }
  safety_certifications: string[]
  care_history: {
    id: number
    action_type: string
    notes: string | null
    logged_at: string | null
    image_url: string | null
  }[]
  harvest_history: {
    id: number
    quantity: number | null
    unit: string | null
    harvest_date: string | null
    qr_trace_code: string | null
  }[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Chưa ghi nhận'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('vi-VN')
}

export default function PublicTracePage() {
  const params = useParams<{ batch_code: string }>()
  const batchCode = params.batch_code
  const { data, error, isLoading } = useSWR<TracePayload>(
    batchCode
      ? `/api/crop-batches/trace/${encodeURIComponent(batchCode)}`
      : null,
    fetcher,
  )

  const publicUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/trace/${encodeURIComponent(batchCode)}`

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-muted-foreground" role="status">Đang tải hành trình sản phẩm…</p>
      </main>
    )
  }

  if (error || !data) {
    const message = error instanceof ApiError ? error.message : 'Không tìm thấy mã truy xuất này.'
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <h1 className="font-semibold">Chưa thể xác minh lô trồng</h1>
            <p className="mt-1">{message}</p>
            <p className="mt-2 font-mono text-xs">Mã đã tra: {batchCode}</p>
          </div>
        </div>
      </main>
    )
  }

  const { batch_info: batch, plot_info: plot, variety_info: variety } = data
  const latestHarvest = data.harvest_history.find((harvest) => harvest.harvest_date)
  const timeline = [
    ...data.care_history.map((log) => ({
      key: `care-${log.id}`,
      date: log.logged_at,
      title: log.action_type,
      detail: log.notes,
      type: 'care' as const,
    })),
    ...data.harvest_history.map((harvest) => ({
      key: `harvest-${harvest.id}`,
      date: harvest.harvest_date,
      title: 'Thu hoạch',
      detail: harvest.quantity == null ? null : `${harvest.quantity} ${harvest.unit || 'kg'}`,
      type: 'harvest' as const,
    })),
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col justify-between gap-5 border-b border-[#183a32]/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-[#52675a]">
            <Leaf className="size-4 text-[#5d8b58]" />
            GreenFarm · Hồ sơ minh bạch
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#183a32] sm:text-4xl">
            Hành trình sản phẩm
          </h1>
          <p className="mt-2 font-mono text-sm text-[#52675a]">{batch.batch_code}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#183a32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#315d43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d8b58] sm:self-auto"
        >
          <Printer className="size-4" />
          In tem sản phẩm
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_290px]">
        <div className="rounded-2xl border border-[#183a32]/10 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-[#dde9df] px-3 py-1 text-xs font-semibold text-[#315d43]">
                {batch.status || 'Chưa cập nhật trạng thái'}
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-[#183a32]">
                {batch.batch_name || `Lô trồng ${batch.batch_code}`}
              </h2>
            </div>
            <div className="font-mono text-xs text-[#52675a]">TRACE · {batch.batch_code}</div>
          </div>
          <dl className="mt-6 grid gap-5 border-t border-[#183a32]/10 pt-5 sm:grid-cols-2">
            <InfoRow icon={<Sprout />} label="Giống cây" value={variety.name || 'Chưa ghi nhận'} />
            <InfoRow icon={<MapPin />} label="Thửa đất" value={plot.name || 'Chưa ghi nhận'} />
            <InfoRow
              icon={<CalendarDays />}
              label="Ngày gieo"
              value={formatDate(batch.sow_date)}
            />
            <InfoRow
              icon={<CalendarDays />}
              label={latestHarvest ? 'Thu hoạch gần nhất' : 'Dự kiến thu hoạch'}
              value={formatDate(latestHarvest?.harvest_date || batch.expected_harvest_date)}
            />
          </dl>
        </div>

        <section className="trace-printable rounded-2xl border border-[#183a32]/10 bg-white p-5 text-center">
          <p className="text-xs font-semibold tracking-wide text-[#52675a]">GREENFARM · TRUY XUẤT</p>
          <div className="mt-4 flex justify-center">
            <QRCodeSVG value={publicUrl} size={176} level="M" includeMargin />
          </div>
          <p className="mt-3 break-all font-mono text-sm font-bold text-[#183a32]">
            {batch.batch_code}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#183a32]">
            {batch.batch_name || 'Lô trồng'}
          </p>
          <p className="mt-1 text-xs text-[#52675a]">{variety.name || 'Chưa ghi nhận giống cây'}</p>
          <p className="mt-3 text-xs text-[#52675a]">
            Thu hoạch: {formatDate(latestHarvest?.harvest_date || batch.expected_harvest_date)}
          </p>
          <p className="mt-4 border-t border-dashed border-[#183a32]/20 pt-3 text-[10px] text-[#52675a]">
            Quét mã để xem hồ sơ canh tác và chăm sóc
          </p>
        </section>
      </section>

      <section aria-label="Các chặng canh tác">
        <h2 className="mb-4 text-xl font-semibold text-[#183a32]">Từ giống đến nông sản</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          <JourneyStep title="Giống cây" value={variety.name || 'Chưa ghi nhận'} detail={variety.growth_duration_days ? `${variety.growth_duration_days} ngày sinh trưởng` : 'Thời gian sinh trưởng chưa ghi nhận'} />
          <JourneyStep title="Lô đất" value={plot.name || 'Chưa ghi nhận'} detail={[plot.area ? `${plot.area.toLocaleString('vi-VN')} m²` : null, plot.location].filter(Boolean).join(' · ') || 'Vị trí chưa ghi nhận'} />
          <JourneyStep title="Nhật ký chăm sóc" value={`${data.care_history.length} lần ghi nhận`} detail="Lịch sử được lưu theo lô trồng" />
          <JourneyStep title="An toàn" value={data.safety_certifications.join(' · ') || 'Chưa ghi nhận'} detail="Thời gian cách ly: Chưa đủ dữ liệu ghi nhận" />
        </ol>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-[#183a32]/10 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#183a32]">Nhật ký canh tác</h2>
          {timeline.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Chưa có hoạt động nào được ghi nhận cho lô này.</p>
          ) : (
            <ol className="mt-5 space-y-0">
              {timeline.map((item, index) => (
                <li key={item.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`grid size-8 place-items-center rounded-full ${item.type === 'harvest' ? 'bg-[#e5b94c]/20 text-[#745a16]' : 'bg-[#dde9df] text-[#315d43]'}`}>
                      {item.type === 'harvest' ? <CheckCircle2 className="size-4" /> : <Leaf className="size-4" />}
                    </span>
                    {index < timeline.length - 1 && <span className="my-1 w-px flex-1 bg-[#183a32]/15" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-5">
                    <p className="text-sm font-semibold text-[#183a32]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[#52675a]">{formatDate(item.date)}</p>
                    {item.detail && <p className="mt-2 text-sm leading-5 text-foreground">{item.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border border-[#183a32]/10 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#183a32]">Chứng nhận và thu hoạch</h2>
          <ul className="mt-4 space-y-2">
            {data.safety_certifications.map((certification) => (
              <li key={certification} className="flex items-center gap-2 text-sm text-[#315d43]">
                <CheckCircle2 className="size-4 shrink-0" />
                {certification}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-[#f3f7f1] p-3 text-xs leading-5 text-[#52675a]">
            Thời gian cách ly không được suy diễn nếu chưa có ghi nhận thực tế trong hồ sơ.
          </p>
          <h3 className="mt-6 border-t border-border pt-5 text-sm font-semibold text-[#183a32]">
            Lịch sử thu hoạch
          </h3>
          {data.harvest_history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Chưa có đợt thu hoạch.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.harvest_history.map((harvest) => (
                <li key={harvest.id} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{formatDate(harvest.harvest_date)}</span>
                  <span className="font-semibold text-[#183a32]">
                    {harvest.quantity ?? '—'} {harvest.unit || ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#5d8b58]" aria-hidden="true">{icon}</span>
      <div>
        <dt className="text-xs text-[#52675a]">{label}</dt>
        <dd className="mt-1 text-sm font-medium text-[#183a32]">{value}</dd>
      </div>
    </div>
  )
}

function JourneyStep({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <li className="min-w-0 rounded-xl border border-[#183a32]/10 bg-white p-4">
      <p className="text-xs font-medium text-[#52675a]">{title}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#183a32]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#52675a]">{detail}</p>
    </li>
  )
}
