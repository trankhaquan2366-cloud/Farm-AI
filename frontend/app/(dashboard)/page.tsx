'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Sprout, Layers, PackageCheck, Ruler, QrCode, ShieldAlert } from 'lucide-react'
import { fetcher } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import type { Plot, CropBatch, Harvest } from '@/lib/types'
import { HarvestYieldChart } from '@/components/dashboard/harvest-yield-chart'
import { CountUp, SplitText, StarBorder } from '@/components/effects/greenfarm-motion'

// Icon tĩnh dùng lại -> giữ nguyên tham chiếu React element, giúp DashboardStat memo hiệu quả.
const AREA_ICON = <Ruler className="size-5" />
const LAYERS_ICON = <Layers className="size-5" />
const SPROUT_ICON = <Sprout className="size-5" />
const PACKAGE_ICON = <PackageCheck className="size-5" />

export default function DashboardPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const { data: plots, error: plotsError, isLoading: loadingPlots } = useSWR<Plot[]>(
    '/api/plots',
    fetcher,
  )
  const { data: batches, error: batchesError, isLoading: loadingBatches } = useSWR<CropBatch[]>(
    '/api/batches',
    fetcher,
  )
  const { data: harvests, error: harvestsError, isLoading: loadingHarvests } = useSWR<Harvest[]>(
    '/api/harvests',
    fetcher,
    { shouldRetryOnError: false },
  )

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUserRole(parsedUser.role?.toLowerCase() || '')
      } catch (error) {
        console.error('Lỗi đọc dữ liệu người dùng:', error)
      }
    }
    setForbidden(new URLSearchParams(window.location.search).get('forbidden') === '1')
  }, [])

  const canCreateBatch = hasPermission(userRole, PERMISSIONS.BATCH_CREATE)
  const loadError = plotsError || batchesError || harvestsError

  const totalArea = useMemo(
    () =>
      plots?.reduce(
        (total, plot) => total + Number(plot.area_m2 ?? ('area' in plot ? plot.area : 0) ?? 0),
        0,
      ),
    [plots],
  )
  const totalProduction = useMemo(
    () =>
      harvests?.reduce(
        (total, harvest) =>
          total + Number(harvest.quantity_kg ?? ('quantity' in harvest ? harvest.quantity : 0) ?? 0),
        0,
      ),
    [harvests],
  )
  const growingCount = useMemo(
    () =>
      batches?.filter((batch) =>
        ['growing', 'planting', 'đang trồng', 'đang sinh trưởng'].includes(String(batch.status).toLowerCase()),
      ).length ?? 0,
    [batches],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      {forbidden && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>Bạn không có quyền truy cập trang này.</p>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Không tải được dữ liệu trang tổng quan.</p>
            <p className="mt-1">
              Một số chỉ số có thể chưa chính xác. Vui lòng kiểm tra kết nối tới máy chủ
              và tải lại trang.
            </p>
          </div>
        </div>
      )}

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
            {canCreateBatch && (
              <StarBorder
                type="button"
                className="dashboard-hero__action"
                onClick={() => router.push('/batches?create=1')}
              >
                <Sprout className="size-4" />
                Tạo Lô trồng mới
              </StarBorder>
            )}
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
            icon={AREA_ICON}
            loading={loadingPlots}
          />
          <DashboardStat
            label="Số lô trồng"
            value={batches?.length}
            icon={LAYERS_ICON}
            loading={loadingBatches}
          />
          <DashboardStat
            label="Đang sinh trưởng"
            value={growingCount}
            icon={SPROUT_ICON}
            loading={loadingBatches}
            accent
          />
          <DashboardStat
            label="Sản lượng đã ghi nhận"
            value={totalProduction}
            suffix="kg"
            icon={PACKAGE_ICON}
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

const DashboardStat = memo(function DashboardStat({
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
})