'use client'

import useSWR from 'swr'
import { Sprout, Layers, Leaf, PackageCheck } from 'lucide-react'
import { fetcher } from '@/lib/api'
import type { Plot, PlantVariety, CropBatch } from '@/lib/types'
import { StatCard } from '@/components/dashboard/stat-card'
import { WeatherWidget } from '@/components/dashboard/weather-widget'
import { HarvestYieldChart } from '@/components/dashboard/harvest-yield-chart'

export default function DashboardPage() {
  const { data: plots, isLoading: loadingPlots } = useSWR<Plot[]>('/api/plots', fetcher)
  const { data: varieties, isLoading: loadingVarieties } = useSWR<PlantVariety[]>(
    '/api/varieties',
    fetcher,
  )
  const { data: batches, isLoading: loadingBatches } = useSWR<CropBatch[]>(
    '/api/batches',
    fetcher,
  )

  const growingCount = batches?.filter((b) => b.status === 'growing').length ?? 0
  const harvestedCount = batches?.filter((b) => b.status === 'harvested').length ?? 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Hàng thống kê */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Lô đất"
          value={plots?.length ?? 0}
          icon={Layers}
          loading={loadingPlots}
        />
        <StatCard
          label="Giống cây"
          value={varieties?.length ?? 0}
          icon={Leaf}
          loading={loadingVarieties}
        />
        <StatCard
          label="Đang trồng"
          value={growingCount}
          icon={Sprout}
          loading={loadingBatches}
          tone="accent"
        />
        <StatCard
          label="Đã thu hoạch"
          value={harvestedCount}
          icon={PackageCheck}
          loading={loadingBatches}
        />
      </div>

      {/* Biểu đồ thu hoạch tràn rộng */}
      <div>
        <HarvestYieldChart />
      </div>
    </div>
  )
}