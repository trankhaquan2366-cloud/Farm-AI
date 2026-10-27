'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Calendar, BarChart3 } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { fetcher } from '@/lib/api'
import type { CropBatch, PlantVariety } from '@/lib/types'

type ViewMode = 'day' | 'month' | 'year'

const COLOR_PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

// Chuẩn hóa mọi định dạng ngày (24/8/2026, ISO string...) về YYYY-MM-DD
function normalizeDateStr(dateVal: any): string {
  if (!dateVal) return ''
  const str = String(dateVal).trim()
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2].split(' ')[0]
      return `${year}-${month}-${day}`
    }
  }
  try {
    const d = new Date(dateVal)
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  } catch {}
  return str.split('T')[0]
}

// Bóc tách số kg từ nhật ký
function parseQuantityToKg(log: any): number {
  if (!log) return 0
  if (typeof log.quantity === 'number') return log.quantity
  const searchStr = `${log.quantity || ''} ${log.notes || ''} ${log.description || ''} ${log.title || ''} ${log.details || ''}`
  const match = searchStr.match(/(\d+(?:[\.,]\d+)?)/)
  if (!match) return 0
  return parseFloat(match[1].replace(',', '.'))
}

export function HarvestChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const { data: logs } = useSWR<any[]>('/api/logs', fetcher)
  const { data: batches } = useSWR<CropBatch[]>('/api/batches', fetcher)
  const { data: varieties } = useSWR<PlantVariety[]>('/api/varieties', fetcher)

  const getVarietyName = (log: any) => {
    if (log.variety_name) return log.variety_name
    if (log.variety_id) return varieties?.find((v) => v.id === log.variety_id)?.name
    if (log.batch_id) {
      const batch = batches?.find((b) => b.id === log.batch_id)
      if (batch) return varieties?.find((v) => v.id === batch.variety_id)?.name
    }
    const text = `${log.notes || ''} ${log.title || ''} ${log.description || ''}`
    const found = varieties?.find((v) => text.toLowerCase().includes(v.name.toLowerCase()))
    if (found) return found.name

    return varieties?.[0]?.name ?? 'Cây trồng'
  }

  const varietyNames = useMemo(() => {
    if (!varieties || varieties.length === 0) return ['Bắp cải', 'Cà rốt', 'Cải thìa']
    return Array.from(new Set(varieties.map((v) => v.name)))
  }, [varieties])

  // Lọc nhật ký thu hoạch
  const harvestLogs = useMemo(() => {
    if (!logs) return []
    return logs.filter((log) => {
      const actionText = `${log.type || ''} ${log.activity_type || ''} ${log.title || ''} ${log.notes || ''}`.toLowerCase()
      return actionText.includes('thu hoạch') || actionText.includes('harvest')
    })
  }, [logs])

  const chartData = useMemo(() => {
    if (viewMode === 'day') {
      const hours = ['06:00', '09:00', '12:00', '15:00', '18:00']
      
      const dayLogs = harvestLogs.filter(
        (log) => normalizeDateStr(log.date || log.created_at) === selectedDate
      )

      return hours.map((hour) => {
        const item: Record<string, any> = { label: hour }
        let total = 0

        varietyNames.forEach((vName) => {
          const matchingLogs = dayLogs.filter((log) => getVarietyName(log) === vName)
          const dayTotalKg = matchingLogs.reduce((sum, l) => sum + parseQuantityToKg(l), 0)
          
          let qty = 0
          if (dayTotalKg > 0) {
            const hasExactHour = matchingLogs.some((l) => {
              const d = new Date(l.date || l.created_at)
              return !isNaN(d.getTime()) && d.getHours() > 0
            })

            if (hasExactHour) {
              const hourNum = parseInt(hour.split(':')[0])
              qty = matchingLogs.reduce((sum, l) => {
                const d = new Date(l.date || l.created_at)
                return d.getHours() >= hourNum && d.getHours() < hourNum + 3
                  ? sum + parseQuantityToKg(l)
                  : sum
              }, 0)
            } else {
              // Gom sản lượng trong ngày hiển thị tại mốc 09:00
              qty = hour === '09:00' ? dayTotalKg : 0
            }
          }

          item[vName] = qty
          total += qty
        })

        item['Tổng sản lượng'] = total
        return item
      })
    }

    if (viewMode === 'month') {
      const currentYear = new Date(selectedDate).getFullYear() || 2026
      return Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1
        const item: Record<string, any> = { label: `T${monthNum}` }
        let total = 0

        varietyNames.forEach((vName) => {
          const matchingLogs = harvestLogs.filter((log) => {
            const dateStr = normalizeDateStr(log.date || log.created_at)
            const [y, m] = dateStr.split('-').map(Number)
            return y === currentYear && m === monthNum && getVarietyName(log) === vName
          })

          const qty = matchingLogs.reduce((sum, l) => sum + parseQuantityToKg(l), 0)
          item[vName] = qty
          total += qty
        })

        item['Tổng sản lượng'] = total
        return item
      })
    }

    // Xem theo Năm
    const currentYear = new Date().getFullYear()
    const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear]

    return years.map((yr) => {
      const item: Record<string, any> = { label: `${yr}` }
      let total = 0

      varietyNames.forEach((vName) => {
        const matchingLogs = harvestLogs.filter((log) => {
          const dateStr = normalizeDateStr(log.date || log.created_at)
          const y = parseInt(dateStr.split('-')[0])
          return y === yr && getVarietyName(log) === vName
        })

        const qty = matchingLogs.reduce((sum, l) => sum + parseQuantityToKg(l), 0)
        item[vName] = qty
        total += qty
      })

      item['Tổng sản lượng'] = total
      return item
    })
  }, [harvestLogs, viewMode, selectedDate, varietyNames, batches, varieties])

  return (
    <div className="w-full rounded-3xl border border-border/60 bg-white p-5 shadow-sm dark:bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Sản lượng thu hoạch</h3>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'day' && `Chi tiết thu hoạch ngày ${selectedDate.split('-').reverse().join('/')}`}
              {viewMode === 'month' && 'Thống kê tổng sản lượng từ nhật ký theo tháng'}
              {viewMode === 'year' && 'Tổng sản lượng tích lũy qua các năm'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'day' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1 text-xs">
              <Calendar className="size-3.5 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-foreground outline-none cursor-pointer"
              />
            </div>
          )}

          <div className="flex rounded-xl bg-muted p-1 text-xs font-medium">
            <button
              onClick={() => setViewMode('day')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'day'
                  ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'month'
                  ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'year'
                  ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Năm
            </button>
          </div>
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} unit=" kg" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any) => [`${Number(value || 0).toLocaleString()} kg`]}
            />
            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />

            {varietyNames.map((vName, idx) => (
              <Bar
                key={vName}
                dataKey={vName}
                fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            ))}

            <Line
              type="monotone"
              dataKey="Tổng sản lượng"
              stroke="#EF4444"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#EF4444' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default HarvestChart