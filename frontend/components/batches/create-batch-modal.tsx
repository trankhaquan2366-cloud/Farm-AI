'use client'

import { useEffect, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { mutate } from 'swr'
import { motion, useReducedMotion } from 'motion/react'
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  Sprout,
  Sparkles,
  X,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Plot, PlantVariety } from '@/lib/types'

type ExtendedVariety = PlantVariety & {
  growth_days?: number | null
}

type CreatedBatch = {
  id?: number
  batch_code?: string | null
  batch_name?: string | null
}

type CreateBatchModalProps = {
  isOpen: boolean
  onClose: () => void
  plots: Plot[]
  varieties: ExtendedVariety[]
  onCreated?: (batch: CreatedBatch) => void
}

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white'
const LABEL_CLASS =
  'mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300'

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateString: string, days: number) {
  if (!dateString || !Number.isInteger(days) || days < 0) return ''
  const date = new Date(`${dateString}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function growthDuration(variety?: ExtendedVariety) {
  const duration = [variety?.growth_duration_days, variety?.growth_days]
    .map(Number)
    .find((days) => Number.isFinite(days) && days > 0)
  return duration ? Math.floor(duration) : null
}

function varietyUnit(variety?: ExtendedVariety) {
  const unit = variety?.unit?.trim()
  if (!unit) return 'Đơn vị'
  const normalized = unit.toLocaleLowerCase('vi-VN')
  if (normalized === 'cây' || normalized === 'plant') return 'Cây'
  if (normalized === 'hạt' || normalized === 'seed') return 'Hạt'
  if (normalized === 'g' || normalized === 'gram' || normalized === 'grams') return 'Gram'
  if (normalized === 'kg' || normalized === 'kilogram') return 'Kg'
  return unit
}

export function CreateBatchModal({
  isOpen,
  onClose,
  plots,
  varieties,
  onCreated,
}: CreateBatchModalProps) {
  const [batchName, setBatchName] = useState('')
  const [plotId, setPlotId] = useState('')
  const [varietyId, setVarietyId] = useState('')
  const [quantityUsed, setQuantityUsed] = useState('')
  const [seedingDate, setSeedingDate] = useState('')
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('')
  const [plantingMethod, setPlantingMethod] = useState('Gieo hạt trực tiếp')
  const [standard, setStandard] = useState('Thông thường')
  const [notes, setNotes] = useState('')
  const [activeTab, setActiveTab] = useState('planting')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const reduceMotion = useReducedMotion()
  const activeTabIndex = activeTab === 'planting' ? 0 : 1

  const selectedVariety = varieties.find((variety) => String(variety.id) === varietyId)
  const selectedPlot = plots.find((plot) => String(plot.id) === plotId)
  const selectedPlotArea = selectedPlot?.area_m2 ?? selectedPlot?.area
  const duration = growthDuration(selectedVariety)

  useEffect(() => {
    if (!isOpen) return
    setBatchName('')
    setPlotId('')
    setVarietyId('')
    setQuantityUsed('')
    setSeedingDate(localDateString())
    setExpectedHarvestDate('')
    setPlantingMethod('Gieo hạt trực tiếp')
    setStandard('Thông thường')
    setNotes('')
    setActiveTab('planting')
    setError('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, saving])

  if (!isOpen) return null

  const resetForm = () => {
    setBatchName('')
    setPlotId('')
    setVarietyId('')
    setQuantityUsed('')
    setSeedingDate(localDateString())
    setExpectedHarvestDate('')
    setPlantingMethod('Gieo hạt trực tiếp')
    setStandard('Thông thường')
    setNotes('')
    setActiveTab('planting')
    setError('')
  }

  const handleClose = () => {
    if (saving) return
    resetForm()
    onClose()
  }

  const handleVarietyChange = (nextVarietyId: string) => {
    setVarietyId(nextVarietyId)
    const variety = varieties.find((item) => String(item.id) === nextVarietyId)
    const days = growthDuration(variety)
    setExpectedHarvestDate(days ? addDays(seedingDate, days) : '')
  }

  const handleSeedingDateChange = (nextDate: string) => {
    setSeedingDate(nextDate)
    setExpectedHarvestDate(duration ? addDays(nextDate, duration) : '')
  }

  const handleAutoName = () => {
    if (!selectedVariety || !selectedPlot || !seedingDate) {
      setActiveTab('planting')
      setError('Chọn giống cây, lô đất và ngày gieo trước khi tự động đặt tên.')
      return
    }
    const [year, month] = seedingDate.split('-')
    setBatchName(`${selectedVariety.name} - ${selectedPlot.name} - ${month}/${year}`)
    setError('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!batchName.trim()) {
      setActiveTab('planting')
      setError('Vui lòng nhập tên lô trồng hoặc dùng chức năng tự động đặt tên.')
      return
    }
    if (!plotId) {
      setActiveTab('planting')
      setError('Vui lòng chọn lô đất.')
      return
    }
    if (!varietyId) {
      setActiveTab('planting')
      setError('Vui lòng chọn giống cây.')
      return
    }
    const quantity = Number(quantityUsed)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setActiveTab('planting')
      setError('Số lượng giống phải lớn hơn 0.')
      return
    }
    if (!seedingDate || !expectedHarvestDate) {
      setActiveTab('planting')
      setError('Vui lòng nhập ngày gieo và ngày dự kiến thu hoạch.')
      return
    }
    if (expectedHarvestDate <= seedingDate) {
      setActiveTab('planting')
      setError('Ngày thu hoạch phải sau ngày gieo trồng.')
      return
    }

    const currentStock = selectedVariety?.stock_quantity ?? 0
    if (selectedVariety && currentStock > 0 && quantity > currentStock) {
      setActiveTab('planting')
      setError(
        `Số lượng giống trong kho không đủ. Còn ${currentStock} ${varietyUnit(selectedVariety)}.`,
      )
      return
    }

    setSaving(true)
    try {
      const created = await api<CreatedBatch>('/api/batches', {
        method: 'POST',
        body: JSON.stringify({
          batch_name: batchName.trim(),
          plot_id: Number(plotId),
          variety_id: Number(varietyId),
          quantity_used: quantity,
          sow_date: seedingDate,
          seeding_date: seedingDate,
          expected_harvest_date: expectedHarvestDate,
          planting_method: plantingMethod,
          certification_standard: standard,
          notes: notes.trim() || null,
        }),
      })

      await Promise.all([mutate('/api/batches'), mutate('/api/varieties')])
      onCreated?.(created ?? {})
      resetForm()
      onClose()
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể tạo lô trồng mới. Vui lòng thử lại.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-batch-title"
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/95 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#1b3e2b] dark:bg-emerald-950/60 dark:text-emerald-400">
              <Sprout className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="create-batch-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Tạo lô trồng mới
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                Lập lịch gieo và thiết lập quy chuẩn canh tác.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Đóng biểu mẫu"
          >
            <X className="size-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
          {error && (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(String(value))}>
            <Tabs.List
              className="rubber-segment batch-create-tabs"
              style={{ ['--segment-count' as string]: 2 }}
            >
              <motion.span
                className="rubber-segment__thumb batch-create-tabs__thumb pointer-events-none"
                aria-hidden="true"
                animate={{ x: `${activeTabIndex * 100}%` }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 430, damping: 34 }
                }
              />
              <Tabs.Tab
                value="planting"
                className="rubber-segment__item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-800"
              >
                Lịch gieo & thông tin chính
              </Tabs.Tab>
              <Tabs.Tab
                value="method"
                className="rubber-segment__item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-800"
              >
                Phương thức & quy chuẩn
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="planting" className="space-y-4 py-5 outline-none">
              <div>
                <label htmlFor="batch-name" className={LABEL_CLASS}>Tên lô trồng *</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="batch-name"
                    type="text"
                    maxLength={100}
                    value={batchName}
                    onChange={(event) => setBatchName(event.target.value)}
                    placeholder="Ví dụ: Cà chua - Nhà kính A - 10/2026"
                    className={FIELD_CLASS}
                  />
                  <button
                    type="button"
                    onClick={handleAutoName}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-800/20 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950"
                  >
                    <Sparkles className="size-4" aria-hidden="true" />
                    Tự động đặt tên
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="batch-plot" className={LABEL_CLASS}>Lô đất *</label>
                  <select
                    id="batch-plot"
                    value={plotId}
                    onChange={(event) => setPlotId(event.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="">Chọn lô đất</option>
                    {plots.map((plot) => (
                      <option key={plot.id} value={plot.id}>{plot.name}</option>
                    ))}
                  </select>
                  {selectedPlot && (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                      Diện tích khả dụng:{' '}
                      <span className="font-medium text-slate-700 dark:text-zinc-300">
                        {selectedPlotArea != null
                          ? `${Number(selectedPlotArea).toLocaleString('vi-VN')} m²`
                          : 'chưa cập nhật'}
                      </span>
                    </p>
                  )}
                  {plots.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                      Chưa có lô đất. Hãy tạo lô đất trước khi lập kế hoạch gieo.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="batch-variety" className={LABEL_CLASS}>Giống cây *</label>
                  <select
                    id="batch-variety"
                    value={varietyId}
                    onChange={(event) => handleVarietyChange(event.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="">Chọn giống cây</option>
                    {varieties.map((variety) => {
                      const days = growthDuration(variety)
                      return (
                        <option key={variety.id} value={variety.id}>
                          {variety.name}
                          {days ? ` (${days} ngày)` : ''}
                          {' — tồn kho '}
                          {variety.stock_quantity ?? 0} {varietyUnit(variety)}
                        </option>
                      )
                    })}
                  </select>
                  {varieties.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                      Chưa có giống cây. Hãy thêm giống trước khi tạo lô trồng.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="batch-quantity" className={LABEL_CLASS}>Số lượng giống *</label>
                <div className="flex gap-2">
                  <input
                    id="batch-quantity"
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantityUsed}
                    onChange={(event) => setQuantityUsed(event.target.value)}
                    placeholder="Nhập số lượng"
                    className={FIELD_CLASS}
                  />
                  <span className="inline-flex min-w-20 items-center justify-center rounded-xl border border-emerald-800/15 bg-emerald-50 px-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                    {varietyUnit(selectedVariety)}
                  </span>
                </div>
                {selectedVariety && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    Tồn kho hiện có: {selectedVariety.stock_quantity ?? 0}{' '}
                    {varietyUnit(selectedVariety)}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="batch-seeding-date" className={LABEL_CLASS}>Ngày gieo trồng *</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="batch-seeding-date"
                      type="date"
                      value={seedingDate}
                      onChange={(event) => handleSeedingDateChange(event.target.value)}
                      className={`${FIELD_CLASS} pl-10`}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="batch-harvest-date" className={LABEL_CLASS}>Ngày dự kiến thu hoạch *</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="batch-harvest-date"
                      type="date"
                      min={seedingDate ? addDays(seedingDate, 1) : undefined}
                      value={expectedHarvestDate}
                      onChange={(event) => setExpectedHarvestDate(event.target.value)}
                      className={`${FIELD_CLASS} pl-10`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    {duration
                      ? `Tự tính theo chu kỳ ${duration} ngày của giống đã chọn; có thể điều chỉnh.`
                      : 'Chọn giống có chu kỳ sinh trưởng hoặc nhập ngày thu hoạch dự kiến.'}
                  </p>
                </div>
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="method" className="space-y-4 py-5 outline-none">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="batch-planting-method" className={LABEL_CLASS}>Phương thức trồng</label>
                  <select
                    id="batch-planting-method"
                    value={plantingMethod}
                    onChange={(event) => setPlantingMethod(event.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="Cấy cây con">Cấy cây con</option>
                    <option value="Gieo hạt trực tiếp">Gieo hạt trực tiếp</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="batch-standard" className={LABEL_CLASS}>Định hướng tiêu chuẩn</label>
                  <select
                    id="batch-standard"
                    value={standard}
                    onChange={(event) => setStandard(event.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="Thông thường">Thông thường</option>
                    <option value="VietGAP">VietGAP</option>
                    <option value="GlobalGAP">GlobalGAP</option>
                    <option value="Organic">Organic</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="batch-notes" className={LABEL_CLASS}>Ghi chú mẻ gieo / phân bón lót</label>
                <textarea
                  id="batch-notes"
                  rows={5}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ghi chú về xử lý hạt, cây con hoặc phân bón lót..."
                  className={`${FIELD_CLASS} min-h-32 resize-y`}
                />
                <p className="mt-1 text-right text-xs text-slate-400">{notes.length}/2000</p>
              </div>
            </Tabs.Panel>
          </Tabs.Root>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || plots.length === 0 || varieties.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b3e2b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143021] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {saving ? 'Đang tạo lô trồng…' : 'Tạo lô trồng'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
