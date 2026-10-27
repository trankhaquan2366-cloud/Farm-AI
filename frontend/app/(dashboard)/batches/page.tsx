'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Plus, Search, Sprout, Trash2, ChevronDown, Sparkles, Calendar, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { api, fetcher, ApiError } from '@/lib/api'
import type { CropBatch, Plot, PlantVariety } from '@/lib/types'
import { StatusBadge } from '@/components/batches/status-badge'
import { CreateBatchModal } from '@/components/batches/create-batch-modal'

// 1. Định dạng ngày hiển thị theo chuẩn Việt Nam
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('vi-VN')
  } catch {
    return String(dateStr)
  }
}

// 2. Trích xuất ngày gieo trồng linh hoạt
function getSowingDate(b: Record<string, any>): string | null {
  return (
    b.sowing_date ||
    b.sowingDate ||
    b.sow_date ||
    b.sowDate ||
    b.seeding_date ||
    b.plant_date ||
    b.plantDate ||
    b.created_at ||
    b.createdAt ||
    null
  )
}

// 3. Trích xuất ngày thu hoạch dự kiến
function getHarvestDate(b: Record<string, any>): string | null {
  return (
    b.expected_harvest_date ||
    b.expectedHarvestDate ||
    b.estimated_harvest_date ||
    b.estimatedHarvestDate ||
    b.harvest_date ||
    b.harvestDate ||
    null
  )
}

// 4. Khớp trạng thái linh hoạt
function matchStatus(batchStatus?: string, filterStatus?: string): boolean {
  if (!filterStatus || filterStatus === 'all') return true
  if (!batchStatus) return false

  const s = batchStatus.toLowerCase()
  const f = filterStatus.toLowerCase()

  if (f === 'growing' || f === 'đang trồng') {
    return s === 'growing' || s === 'đang trồng' || s === 'planting'
  }
  if (f === 'harvested' || f === 'đã thu hoạch') {
    return s === 'harvested' || s === 'đã thu hoạch'
  }
  if (f === 'planned' || f === 'kế hoạch') {
    return s === 'planned' || s === 'kế hoạch' || s === 'draft'
  }

  return s === f
}

export default function BatchesPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | string | null>(null)

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
  }, [])

  // Phân quyền hệ thống
  const canManage = ['admin', 'manager', 'technician'].includes(userRole)
  const canDelete = ['admin', 'manager'].includes(userRole)

  // Fetch dữ liệu từ API
  const { data: batches, error: batchesErr } = useSWR<CropBatch[]>('/api/batches', fetcher)
  const { data: plots } = useSWR<Plot[]>('/api/plots', fetcher)
  const { data: varieties } = useSWR<PlantVariety[]>('/api/varieties', fetcher)
  const isLoading = !batches && !batchesErr

  // Ghép nối thông tin tên Lô đất
  const getPlotName = useCallback((b: Record<string, any>) => {
    if (b.plot_name) return b.plot_name
    if (b.plotName) return b.plotName
    if (b.plot?.name) return b.plot.name
    const found = plots?.find((p) => String(p.id) === String(b.plot_id))
    return found?.name ?? `Lô đất #${b.plot_id ?? '—'}`
  }, [plots])

  // Ghép nối thông tin tên Giống cây
  const getVarietyName = useCallback((b: Record<string, any>) => {
    if (b.variety_name) return b.variety_name
    if (b.varietyName) return b.varietyName
    if (b.variety?.name) return b.variety.name
    const found = varieties?.find(
      (v) => String(v.id) === String(b.variety_id || b.plant_variety_id)
    )
    return found?.name ?? `Giống #${b.variety_id ?? '—'}`
  }, [varieties])

  // Lọc và tìm kiếm dữ liệu (Tối ưu performance với useMemo)
  const filteredBatches = useMemo(() => {
    if (!batches) return []
    const query = searchQuery.trim().toLowerCase()

    return batches.filter((b: Record<string, any>) => {
      const matchesSt = matchStatus(b.status, filterStatus)
      if (!matchesSt) return false

      if (!query) return true

      const batchCode = (b.batch_code || b.code || '').toLowerCase()
      const batchName = (b.batch_name || b.name || '').toLowerCase()
      const vName = getVarietyName(b).toLowerCase()
      const pName = getPlotName(b).toLowerCase()

      return (
        batchCode.includes(query) ||
        batchName.includes(query) ||
        vName.includes(query) ||
        pName.includes(query)
      )
    })
  }, [batches, filterStatus, searchQuery, getVarietyName, getPlotName])

  // Đổi trạng thái lô trồng (Optimistic Update)
  async function handleStatusChange(batch: CropBatch, newStatus: string) {
    if (!canManage) return
    setUpdatingId(batch.id)

    // Cập nhật giao diện lập tức (Optimistic)
    const previousBatches = batches
    mutate(
      '/api/batches',
      batches?.map((b) => (b.id === batch.id ? { ...b, status: newStatus } : b)),
      false
    )

    try {
      await api(`/api/batches/${batch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      await mutate('/api/batches')
    } catch (err) {
      // Revert lại nếu có lỗi
      mutate('/api/batches', previousBatches, false)
      alert(err instanceof ApiError ? err.message : 'Không thể thay đổi trạng thái lô trồng.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Cập nhật trường dữ liệu nhanh
  async function handleBatchFieldEdit(
    batch: CropBatch,
    field: 'batch_name' | 'batch_code',
    newValue: string,
    currentValue: string
  ) {
    const trimmedVal = newValue.trim()
    if (!canManage || trimmedVal === currentValue) return

    try {
      await api(`/api/batches/${batch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: trimmedVal }),
      })
      await mutate('/api/batches')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể cập nhật thông tin.')
    }
  }

  // Xóa lô trồng
  async function handleDeleteBatch(batch: CropBatch) {
    if (!canDelete) {
      alert('Bạn không có quyền xóa dữ liệu lô trồng.')
      return
    }
    const displayName =
      batch.batch_name || (batch as any).name || batch.batch_code || (batch as any).code
    
    if (!confirm(`Xác nhận xóa lô trồng "${displayName}"? Tất cả nhật ký liên quan sẽ bị loại bỏ.`)) {
      return
    }

    try {
      await api(`/api/batches/${batch.id}`, { method: 'DELETE' })
      await mutate('/api/batches')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể xóa lô trồng.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Thanh công cụ */}
      <div className="surface-glass flex flex-col gap-3 rounded-2xl p-4 shadow-sm border border-border/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Ô tìm kiếm */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên lô, giống..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background/60 py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc trạng thái */}
          <div className="relative w-full sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-border/60 bg-background/60 py-2 pl-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đang trồng">Đang trồng</option>
              <option value="Kế hoạch">Kế hoạch</option>
              <option value="Đã thu hoạch">Đã thu hoạch</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Nút Tạo lô trồng */}
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 sm:w-auto"
          >
            <Plus className="size-4" />
            Tạo Lô Trồng Mới
          </button>
        )}
      </div>

      {/* Danh sách Lô Trồng */}
      <div className="surface-glass overflow-hidden rounded-3xl border border-border/50 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" />
            Đang tải dữ liệu lô trồng...
          </div>
        ) : filteredBatches && filteredBatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th className="py-3.5 pl-5 pr-3 font-semibold">Tên mẻ / lô</th>
                  <th className="py-3.5 pr-3 font-semibold">Mã lô</th>
                  <th className="py-3.5 pr-3 font-semibold">Lô đất</th>
                  <th className="py-3.5 pr-3 font-semibold">Giống cây</th>
                  <th className="py-3.5 pr-3 font-semibold">Ngày gieo</th>
                  <th className="py-3.5 pr-3 font-semibold">Dự kiến thu hoạch</th>
                  <th className="py-3.5 pr-3 font-semibold">Trạng thái</th>
                  <th className="py-3.5 pl-3 pr-5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredBatches.map((b: Record<string, any>) => {
                  const sowDate = getSowingDate(b)
                  const harvestDate = getHarvestDate(b)
                  const currentStatus = b.status || 'Đang trồng'
                  const isUpdating = updatingId === b.id
                  const initialName = b.batch_name || b.name || ''
                  const initialCode = b.batch_code || b.code || ''

                  return (
                    <tr key={b.id} className="transition-colors hover:bg-muted/20">
                      <td className="py-3 pl-5 pr-3">
                        {canManage ? (
                          <input
                            defaultValue={initialName}
                            onBlur={(e) =>
                              handleBatchFieldEdit(b as CropBatch, 'batch_name', e.target.value, initialName)
                            }
                            placeholder="Tên lô..."
                            className="w-36 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="font-semibold text-foreground">
                            {initialName || '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs font-semibold text-foreground">
                        {canManage ? (
                          <input
                            defaultValue={initialCode}
                            onBlur={(e) =>
                              handleBatchFieldEdit(b as CropBatch, 'batch_code', e.target.value, initialCode)
                            }
                            className="w-28 rounded-lg border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span>{initialCode || '—'}</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 font-medium text-muted-foreground">{getPlotName(b)}</td>
                      <td className="py-3 pr-3 font-medium text-muted-foreground">{getVarietyName(b)}</td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          {formatDate(sowDate)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          {formatDate(harvestDate)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={currentStatus} />
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* AI Assistant */}
                          <Link
                            href={`/care-logs?plot=${encodeURIComponent(getPlotName(b))}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                            title="Tư vấn AI cho lô này"
                          >
                            <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="hidden sm:inline">AI gợi ý</span>
                          </Link>

                          {/* Đổi trạng thái */}
                          {canManage && (
                            <select
                              disabled={isUpdating}
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(b as CropBatch, e.target.value)}
                              className="cursor-pointer rounded-lg border border-border/60 bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                            >
                              <option value="Đang trồng">Đang trồng</option>
                              <option value="Kế hoạch">Kế hoạch</option>
                              <option value="Đã thu hoạch">Đã thu hoạch</option>
                            </select>
                          )}

                          {/* Xóa */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(b as CropBatch)}
                              className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                              title="Xóa lô trồng"
                              aria-label="Xóa lô trồng"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sprout className="size-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-foreground">Không tìm thấy lô trồng nào</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManage
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc tạo thêm lô trồng mới.'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Tạo Lô Mới */}
      {canManage && (
        <CreateBatchModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          plots={plots ?? []}
          varieties={varieties ?? []}
        />
      )}
    </div>
  )
}