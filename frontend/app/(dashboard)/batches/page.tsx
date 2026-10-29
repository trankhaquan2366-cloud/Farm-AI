'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Plus, Search, Sprout, Trash2, Sparkles, Calendar, Loader2, X, Eye, Pencil } from 'lucide-react'
import Link from 'next/link'
import { api, fetcher, ApiError } from '@/lib/api'
import type { CropBatch, Plot, PlantVariety } from '@/lib/types'
import { StatusBadge } from '@/components/batches/status-badge'
import { CreateBatchModal } from '@/components/batches/create-batch-modal'
import { GlideSelect } from '@/components/effects/greenfarm-motion'
import { ActionMenu } from '@/components/ui/action-menu'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export default function BatchesPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterVariety, setFilterVariety] = useState<string>('all')
  const [filterPlot, setFilterPlot] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | string | null>(null)
  const [editingBatchId, setEditingBatchId] = useState<number | string | null>(null)
  const [viewingBatch, setViewingBatch] = useState<Record<string, any> | null>(null)

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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') === '1') {
      setCreateOpen(true)
      window.history.replaceState({}, '', '/batches')
    }
  }, [])

  // Phân quyền hệ thống
  const canManage = hasPermission(userRole, PERMISSIONS.BATCH_UPDATE)
  const canDelete = hasPermission(userRole, PERMISSIONS.BATCH_DELETE)

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
      if (filterVariety !== 'all' && String(b.variety_id ?? b.plant_variety_id) !== filterVariety) {
        return false
      }
      if (filterPlot !== 'all' && String(b.plot_id) !== filterPlot) return false

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
  }, [
    batches,
    filterStatus,
    filterVariety,
    filterPlot,
    searchQuery,
    getVarietyName,
    getPlotName,
  ])

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
      <div className="surface-glass flex flex-col gap-3 rounded-2xl border border-border/50 p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {/* Ô tìm kiếm */}
          <div className="relative w-full min-w-0 lg:w-72">
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
          <GlideSelect
            label="Lọc theo trạng thái"
            className="w-full lg:w-44"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'Đang trồng', label: 'Đang trồng' },
              { value: 'Kế hoạch', label: 'Kế hoạch' },
              { value: 'Đã thu hoạch', label: 'Đã thu hoạch' },
            ]}
          />
          <GlideSelect
            label="Lọc theo giống cây"
            className="w-full lg:w-44"
            value={filterVariety}
            onChange={setFilterVariety}
            options={[
              { value: 'all', label: 'Tất cả giống cây' },
              ...(varieties ?? []).map((variety) => ({
                value: String(variety.id),
                label: variety.name,
              })),
            ]}
          />
          <GlideSelect
            label="Lọc theo lô đất"
            className="w-full lg:w-44"
            value={filterPlot}
            onChange={setFilterPlot}
            options={[
              { value: 'all', label: 'Tất cả lô đất' },
              ...(plots ?? []).map((plot) => ({
                value: String(plot.id),
                label: plot.name,
              })),
            ]}
          />
        </div>

        {/* Nút Tạo lô trồng */}
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 xl:w-auto"
          >
            <Plus className="size-4" />
            Tạo Lô Trồng Mới
          </button>
        )}
      </div>

      {/* Danh sách Lô Trồng */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" />
            Đang tải dữ liệu lô trồng...
          </div>
        ) : filteredBatches && filteredBatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="w-[45%] py-3.5 pl-3 pr-3 font-semibold sm:pl-4">Tên mẻ / mã lô</th>
                  <th className="hidden py-3.5 pr-3 font-semibold md:table-cell">Lô đất</th>
                  <th className="hidden py-3.5 pr-3 font-semibold lg:table-cell">Giống cây</th>
                  <th className="hidden py-3.5 pr-3 font-semibold xl:table-cell">Ngày gieo</th>
                  <th className="hidden py-3.5 pr-3 font-semibold xl:table-cell">Dự kiến thu hoạch</th>
                  <th className="py-3.5 pr-3 font-semibold">Trạng thái</th>
                  <th className="py-3.5 pl-2 pr-3 text-right font-semibold sm:pr-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredBatches.map((b: Record<string, any>) => {
                  const sowDate = getSowingDate(b)
                  const harvestDate = getHarvestDate(b)
                  const currentStatus = b.status || 'Đang trồng'
                  const isUpdating = updatingId === b.id
                  const isEditing = editingBatchId === b.id
                  const initialName = b.batch_name || b.name || ''
                  const initialCode = b.batch_code || b.code || ''

                  return (
                    <tr key={b.id} className="transition-colors hover:bg-emerald-950/[0.025]">
                      <td className="min-w-0 py-3 pl-3 pr-3 sm:pl-4">
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          {canManage && isEditing ? (
                          <input
                            defaultValue={initialName}
                            onBlur={(e) =>
                              handleBatchFieldEdit(b as CropBatch, 'batch_name', e.target.value, initialName)
                            }
                            placeholder="Tên lô..."
                            aria-label="Tên mẻ"
                            className="w-full max-w-56 rounded-md border border-border/60 bg-background px-2 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="max-w-full truncate font-semibold text-slate-800 dark:text-foreground">
                            {initialName || '—'}
                          </span>
                        )}
                          {canManage && isEditing ? (
                          <input
                            defaultValue={initialCode}
                            onBlur={(e) =>
                              handleBatchFieldEdit(b as CropBatch, 'batch_code', e.target.value, initialCode)
                            }
                            aria-label="Mã lô trồng"
                            className="w-full max-w-40 rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="max-w-full truncate text-xs text-slate-400 dark:text-muted-foreground">
                            {initialCode || '—'}
                          </span>
                        )}
                        </div>
                      </td>
                      <td className="hidden py-3 pr-3 font-medium text-muted-foreground md:table-cell">{getPlotName(b)}</td>
                      <td className="hidden py-3 pr-3 font-medium text-muted-foreground lg:table-cell">{getVarietyName(b)}</td>
                      <td className="hidden py-3 pr-3 text-xs text-muted-foreground xl:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          {formatDate(sowDate)}
                        </span>
                      </td>
                      <td className="hidden py-3 pr-3 text-xs text-muted-foreground xl:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          {formatDate(harvestDate)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        {canManage && isEditing ? (
                          <select
                            disabled={isUpdating}
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(b as CropBatch, e.target.value)}
                            className="max-w-32 rounded-full border border-border/60 bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                            aria-label={`Trạng thái ${initialName || initialCode}`}
                          >
                            <option value="Đang trồng">Đang trồng</option>
                            <option value="Kế hoạch">Kế hoạch</option>
                            <option value="Đã thu hoạch">Đã thu hoạch</option>
                          </select>
                        ) : (
                          <StatusBadge status={currentStatus} />
                        )}
                      </td>
                      <td className="relative py-3 pl-2 pr-3 text-right sm:pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/care-logs?plot=${encodeURIComponent(getPlotName(b))}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                            title="Tư vấn AI cho lô này"
                            aria-label={`Mở gợi ý AI cho lô ${initialName || initialCode}`}
                          >
                            <Sparkles className="size-4" aria-hidden="true" />
                          </Link>
                          <ActionMenu
                            label={`Thao tác với lô trồng ${initialName || initialCode}`}
                            items={[
                              {
                                label: 'Xem lô trồng',
                                icon: Eye,
                                onSelect: () => setViewingBatch(b),
                              },
                              ...(canManage
                                ? [{
                                    label: isEditing ? 'Hoàn tất sửa' : 'Sửa lô trồng',
                                    icon: Pencil,
                                    onSelect: () => setEditingBatchId(isEditing ? null : b.id),
                                  }]
                                : []),
                              ...(canDelete
                                ? [{
                                    label: 'Xóa lô trồng',
                                    icon: Trash2,
                                    onSelect: () => handleDeleteBatch(b as CropBatch),
                                    destructive: true,
                                  }]
                                : []),
                            ]}
                          />
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

      {viewingBatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingBatch(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-details-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="batch-details-title" className="truncate text-lg font-semibold text-foreground">
                  {viewingBatch.batch_name || viewingBatch.name || 'Thông tin lô trồng'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {viewingBatch.batch_code || viewingBatch.code || 'Chưa có mã lô'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Đóng chi tiết lô trồng"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <Detail label="Lô đất" value={getPlotName(viewingBatch)} />
              <Detail label="Giống cây" value={getVarietyName(viewingBatch)} />
              <Detail label="Ngày gieo" value={formatDate(getSowingDate(viewingBatch))} />
              <Detail label="Dự kiến thu hoạch" value={formatDate(getHarvestDate(viewingBatch))} />
              <div>
                <p className="text-xs text-muted-foreground">Trạng thái</p>
                <div className="mt-1">
                  <StatusBadge status={viewingBatch.status || 'Đang trồng'} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

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