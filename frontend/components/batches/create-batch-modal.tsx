'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { X, Loader2, AlertCircle, Sprout } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Plot, PlantVariety } from '@/lib/types'

type ExtendedVariety = PlantVariety & {
  growth_days?: number
}

type CreateBatchModalProps = {
  isOpen: boolean
  onClose: () => void
  plots: Plot[]
  varieties: ExtendedVariety[]
}

export function CreateBatchModal({ isOpen, onClose, plots, varieties }: CreateBatchModalProps) {
  const [batchName, setBatchName] = useState('')
  const [plotId, setPlotId] = useState('')
  const [varietyId, setVarietyId] = useState('')
  const [quantityUsed, setQuantityUsed] = useState('')
  const [seedingDate, setSeedingDate] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Khởi tạo ngày gieo mặc định là ngày hôm nay khi mở modal
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0]
      setSeedingDate(today)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Tìm giống cây đang chọn
  const selectedVariety = varieties.find((v) => String(v.id) === varietyId)

  // Reset form dữ liệu
  const handleResetForm = () => {
    setBatchName('')
    setPlotId('')
    setVarietyId('')
    setQuantityUsed('')
    setSeedingDate(new Date().toISOString().split('T')[0])
    setError('')
  }

  const handleClose = () => {
    handleResetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const quantity = Number(quantityUsed)
    if (!plotId) {
      setError('Vui lòng chọn lô đất.')
      return
    }
    if (!varietyId) {
      setError('Vui lòng chọn giống cây.')
      return
    }
    if (isNaN(quantity) || quantity <= 0) {
      setError('Vui lòng nhập số lượng giống hợp lệ.')
      return
    }

    // Kiểm tra số lượng tồn kho
    const currentStock = selectedVariety?.stock_quantity ?? 0
    if (selectedVariety && currentStock > 0 && quantity > currentStock) {
      setError(
        `Số lượng giống trong kho không đủ! (Còn lại: ${currentStock} ${selectedVariety.unit ?? 'kg'})`
      )
      return
    }

    setSaving(true)

    try {
      await api('/api/batches', {
        method: 'POST',
        body: JSON.stringify({
          batch_name: batchName.trim() || null,
          plot_id: Number(plotId),
          variety_id: Number(varietyId),
          quantity_used: quantity,
          seeding_date: seedingDate,
        }),
      })

      // Làm mới dữ liệu cache SWR
      await Promise.all([
        mutate('/api/batches'),
        mutate('/api/varieties'),
      ])

      handleClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo lô trồng mới. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Đóng"
        >
          <X className="size-5" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="mb-5 border-b border-slate-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-[#1b3e2b] dark:bg-emerald-950/60 dark:text-emerald-400">
              <Sprout className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tạo Lô Trồng Mới</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Mã lô sẽ được hệ thống sinh tự động. Bạn chỉ cần điền tên lô gợi nhớ.
              </p>
            </div>
          </div>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên lô trồng */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Tên lô trồng
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Ví dụ: Lô rau xà lách Vụ Xuân"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500"
            />
          </div>

          {/* Chọn Lô đất */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Lô đất *
            </label>
            <select
              required
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500"
            >
              <option value="">-- Chọn lô đất --</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {plots.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Chưa có lô đất nào - Tạo lô đất trước ở danh mục "Lô đất".
              </p>
            )}
          </div>

          {/* Chọn Giống cây */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Giống cây *
            </label>
            <select
              required
              value={varietyId}
              onChange={(e) => setVarietyId(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500"
            >
              <option value="">-- Chọn giống cây --</option>
              {varieties.map((v) => {
                const duration = v.growth_duration_days ?? v.growth_days ?? 0
                return (
                  <option key={v.id} value={v.id}>
                    {v.name} ({duration} ngày) - Kho: {v.stock_quantity ?? 0} {v.unit ?? 'kg'}
                  </option>
                )
              })}
            </select>
            {varieties.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Chưa có giống cây nào - Tạo giống cây trước ở danh mục "Giống cây".
              </p>
            )}
          </div>

          {/* Số lượng sử dụng */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Số lượng giống sử dụng *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(e.target.value)}
                placeholder="Ví dụ: 5"
                className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <div className="flex min-w-[80px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {selectedVariety?.unit || 'Đơn vị'}
              </div>
            </div>
            {selectedVariety && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                Tồn kho hiện có:{' '}
                <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {selectedVariety.stock_quantity ?? 0} {selectedVariety.unit ?? 'kg'}
                </strong>
              </p>
            )}
          </div>

          {/* Ngày gieo */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Ngày gieo trồng *
            </label>
            <input
              type="date"
              required
              value={seedingDate}
              onChange={(e) => setSeedingDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl bg-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !plotId || !varietyId || plots.length === 0 || varieties.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b3e2b] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#143021] disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? 'Đang tạo…' : 'Tạo lô trồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}