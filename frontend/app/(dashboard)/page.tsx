'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sprout, Layers, PackageCheck, Ruler, QrCode } from 'lucide-react'
import { fetcher } from '@/lib/api'
import type { Plot, CropBatch, Harvest } from '@/lib/types'
import { HarvestYieldChart } from '@/components/dashboard/harvest-yield-chart'
import { CountUp, SplitText, StarBorder } from '@/components/effects/greenfarm-motion'

export default function DashboardPage() {
  const router = useRouter()
  const { data: plots, isLoading: loadingPlots } = useSWR<Plot[]>('/api/plots', fetcher)
  const { data: batches, isLoading: loadingBatches } = useSWR<CropBatch[]>(
    '/api/batches',
    fetcher,
  )
  const { data: harvests, isLoading: loadingHarvests } = useSWR<Harvest[]>(
    '/api/harvests',
    fetcher,
    { shouldRetryOnError: false },
  )

  const totalArea = plots?.reduce(
    (total, plot) => total + Number(plot.area_m2 ?? ('area' in plot ? plot.area : 0) ?? 0),
    0,
  )
  const totalProduction = harvests?.reduce(
    (total, harvest) => total + Number(harvest.quantity_kg ?? ('quantity' in harvest ? harvest.quantity : 0) ?? 0),
    0,
  )
  const growingCount =
    batches?.filter((batch) =>
      ['growing', 'planting', 'đang trồng'].includes(String(batch.status).toLowerCase()),
    ).length ?? 0

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <section className="dashboard-hero">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium text-white/70">
            GreenFarm · Nhật ký hôm nay
          </p>
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            <SplitText
              text="Chào mừng đến với GreenFarm AI"
              effect="rise"
              hoverEffect="wave"
            />
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Theo dõi diện tích canh tác, từng lô trồng và sản lượng đã ghi nhận
            trong một nơi.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <StarBorder
              type="button"
              className="dashboard-hero__action"
              onClick={() => router.push('/batches?create=1')}
            >
              <Sprout className="size-4" />
              Tạo Lô trồng mới
            </StarBorder>
            <Link
              href="/traceability"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <QrCode className="size-4" />
              Tra cứu nguồn gốc
            </Link>
          </div>
        </div>
        <div className="dashboard-hero__mark" aria-hidden="true">
          <div className="dashboard-hero__sun" />
          <div className="dashboard-hero__field dashboard-hero__field--one" />
          <div className="dashboard-hero__field dashboard-hero__field--two" />
          <div className="dashboard-hero__field dashboard-hero__field--three" />
        </div>
      </section>

      <section aria-label="Thống kê trang trại">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Ruler className="size-4 text-primary" />
          Toàn cảnh canh tác
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStat
            label="Tổng diện tích"
            value={totalArea}
            suffix="m²"
            icon={<Ruler className="size-5" />}
            loading={loadingPlots}
          />
          <DashboardStat
            label="Số lô trồng"
            value={batches?.length}
            icon={<Layers className="size-5" />}
            loading={loadingBatches}
          />
          <DashboardStat
            label="Đang sinh trưởng"
            value={growingCount}
            icon={<Sprout className="size-5" />}
            loading={loadingBatches}
            accent
          />
          <DashboardStat
            label="Sản lượng đã ghi nhận"
            value={totalProduction}
            suffix="kg"
            icon={<PackageCheck className="size-5" />}
            loading={loadingHarvests}
            unavailable={!loadingHarvests && !harvests}
          />
        </div>
      </section>

      <section aria-label="Tổng hợp thu hoạch">
        <HarvestYieldChart />
      </section>
    </div>
  )
}

function DashboardStat({
  label,
  value,
  suffix,
  icon,
  loading,
  accent = false,
  unavailable = false,
}: {
  label: string
  value?: number
  suffix?: string
  icon: React.ReactNode
  loading: boolean
  accent?: boolean
  unavailable?: boolean
}) {
  return (
    <div className={`dashboard-stat ${accent ? 'dashboard-stat--accent' : ''}`}>
      <span className="dashboard-stat__icon" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {loading ? (
            <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted" />
          ) : unavailable || value === undefined ? (
            <span className="text-muted-foreground">Chưa có dữ liệu</span>
          ) : (
            <CountUp to={value} suffix={suffix} mode="roll" />
          )}
        </p>
      </div>
    </div>
  )
}