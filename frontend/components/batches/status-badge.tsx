import { cn } from '@/lib/utils'

export type BatchStatus = 'Đang trồng' | 'Đã thu hoạch' | 'Đã hủy' | 'Kế hoạch' | string

// Khai báo ánh xạ toàn bộ mã tiếng Anh -> Nhãn tiếng Việt
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  'Đang trồng': { label: 'Đang trồng', className: 'bg-emerald-100 text-emerald-800' },
  'Đã thu hoạch': { label: 'Đã thu hoạch', className: 'bg-blue-100 text-blue-800' },
  'Đã hủy': { label: 'Đã hủy', className: 'bg-rose-100 text-rose-800' },
  'Kế hoạch': { label: 'Kế hoạch', className: 'bg-amber-100 text-amber-800' },

  // Ánh xạ các từ tiếng Anh
  'growing': { label: 'Đang trồng', className: 'bg-emerald-100 text-emerald-800' },
  'harvested': { label: 'Đã thu hoạch', className: 'bg-blue-100 text-blue-800' },
  'cancelled': { label: 'Đã hủy', className: 'bg-rose-100 text-rose-800' },
  'planned': { label: 'Kế hoạch', className: 'bg-amber-100 text-amber-800' },

  'PLANTING': { label: 'Đang trồng', className: 'bg-emerald-100 text-emerald-800' },
  'HARVESTED': { label: 'Đã thu hoạch', className: 'bg-blue-100 text-blue-800' },
  'CANCELLED': { label: 'Đã hủy', className: 'bg-rose-100 text-rose-800' },
  'PLANNED': { label: 'Kế hoạch', className: 'bg-amber-100 text-amber-800' },
}

const DEFAULT_STATUS = {
  label: 'Đang trồng',
  className: 'bg-emerald-100 text-emerald-800',
}

export function StatusBadge({ status }: { status?: BatchStatus | null }) {
  const currentStatus = (status && STATUS_MAP[status]) 
    ? STATUS_MAP[status] 
    : { label: status ? (STATUS_MAP[status]?.label || status) : DEFAULT_STATUS.label, className: DEFAULT_STATUS.className }

  const { label, className } = currentStatus

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      {label}
    </span>
  )
}