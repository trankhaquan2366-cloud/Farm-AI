'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { BarChart3, Calendar, Loader2, AlertTriangle } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetcher } from '@/lib/api'

type ViewMode = 'day' | 'month' | 'year'
type ChartValue = string | number
type ChartPoint = {
  label: string
  total: number
  [variety: string]: ChartValue
}
type HarvestChartResponse = {
  view: ViewMode
  varieties: string[]
  data: ChartPoint[]
}
type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  value?: ChartValue
  color?: string
}
type HarvestTooltipProps = {
  active?: boolean
  label?: ChartValue
  payload?: readonly TooltipEntry[]
  varieties: string[]
}
type HarvestLegendProps = {
  varieties: string[]
  colors: Record<string, string>
}

const PALETTE = ['#059669', '#2563EB', '#D97706', '#DB2777', '#7C3AED', '#0891B2', '#65A30D']
const TOTAL_COLOR = '#DC2626'

function createMockData(view: ViewMode): HarvestChartResponse {
  const labels = view === 'month'
    ? Array.from({ length: 12 }, (_, index) => `T${index + 1}`)
    : view === 'year'
      ? ['2023', '2024', '2025', '2026']
      : Array.from({ length: 30 }, (_, index) => `${String(index + 1).padStart(2, '0')}/09`)
  const varieties = ['Cà chua', 'Su su']
  const data = labels.map((label, index) => {
    const tomato = view === 'month' && [2, 5, 8].includes(index) ? 180 + index * 5 : 0
    const chayote = view === 'month' && [5, 8].includes(index) ? 120 + index * 4 : 0
    const yearlyFactor = view === 'year' ? index * 45 : 0
    const dailyValue = view === 'day' && index === 16 ? 320 : 0
    const first = tomato + yearlyFactor + dailyValue
    const second = chayote + (view === 'year' ? index * 25 : 0)
    return { label, 'Cà chua': first, 'Su su': second, total: first + second }
  })
  return { view, varieties, data }
}

function formatKg(value: ChartValue | undefined): string {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
  return `${numericValue.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg`
}

function HarvestTooltip({ active, label, payload, varieties }: HarvestTooltipProps) {
  if (!active || !payload?.length) return null
  const total = payload.find((entry) => entry.dataKey === 'total')?.value
  return (
    <div className="min-w-48 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="mb-2 font-bold text-slate-900 dark:text-white">{label}</p>
      <p className="mb-2 border-b border-slate-200 pb-2 font-bold text-red-700 dark:border-zinc-700 dark:text-red-300">
        Tổng sản lượng: {formatKg(total)}
      </p>
      <div className="space-y-1.5">
        {varieties.map((variety) => {
          const entry = payload.find((item) => item.dataKey === variety)
          return (
            <div key={variety} className="flex items-center justify-between gap-4 text-slate-600 dark:text-zinc-300">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry?.color }} />
                <span className="truncate">{variety}</span>
              </span>
              <span className="font-semibold">{formatKg(entry?.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HarvestLegend({ varieties, colors }: HarvestLegendProps) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-3 text-xs text-slate-600 dark:text-zinc-300">
      {varieties.map((variety) => (
        <span key={variety} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors[variety] }} />
          {variety}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: TOTAL_COLOR }} />
        Tổng sản lượng
      </span>
    </div>
  )
}

export function HarvestYieldChart() {
  const [view, setView] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const endpoint = `/api/dashboard/harvest-chart?view=${view}`
  const { data, error, isLoading } = useSWR<HarvestChartResponse>(endpoint, fetcher)
  const usingMock = Boolean(error)
  const chart = data ?? (usingMock ? createMockData(view) : null)
  const colors = useMemo(
    () => Object.fromEntries((chart?.varieties ?? []).map((name, index) => [name, PALETTE[index % PALETTE.length]])),
    [chart?.varieties],
  )
  const hasHarvest = Boolean(chart?.data.some((point) => point.total > 0))

  const subtitle = view === 'day'
    ? `Thống kê từng ngày trong tháng ${selectedDate.slice(5, 7)}`
    : view === 'month'
      ? 'Thống kê tổng sản lượng theo 12 tháng trong năm'
      : 'Thống kê tổng sản lượng theo từng năm'

  return (
    <section className="surface-glass w-full rounded-3xl p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Sản lượng thu hoạch</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === 'day' && (
            <label className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
              <Calendar className="size-3.5 text-muted-foreground" />
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent text-foreground outline-none" />
            </label>
          )}
          <div className="flex rounded-xl bg-muted p-1 text-xs font-medium">
            {(['day', 'month', 'year'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setView(mode)} className={`rounded-lg px-3 py-1.5 transition ${view === mode ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`}>
                {mode === 'day' ? 'Ngày' : mode === 'month' ? 'Tháng' : 'Năm'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && !chart ? (
        <div className="h-[320px] animate-pulse rounded-2xl bg-muted/60" aria-label="Đang tải biểu đồ" />
      ) : !chart || !hasHarvest ? (
        <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
          <BarChart3 className="mb-3 size-9 opacity-40" />
          <p>Chưa có dữ liệu thu hoạch để vẽ biểu đồ.</p>
          <p className="mt-1 text-xs">Hãy ghi nhật ký “Thu hoạch” kèm sản lượng.</p>
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart.data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} unit=" kg" />
              <Tooltip content={<HarvestTooltip varieties={chart.varieties} />} />
              <Legend content={<HarvestLegend varieties={chart.varieties} colors={colors} />} />
              {chart.varieties.map((variety) => (
                <Bar key={variety} dataKey={variety} stackId="harvest" fill={colors[variety]} maxBarSize={34} />
              ))}
              <Line type="monotone" dataKey="total" name="Tổng sản lượng" stroke={TOTAL_COLOR} strokeWidth={2.5} dot={{ r: 3, fill: TOTAL_COLOR }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {usingMock && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3.5" /> Đang hiển thị dữ liệu minh họa vì API chưa kết nối.
        </p>
      )}
      {isLoading && chart && <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />}
    </section>
  )
}

export default HarvestYieldChart
