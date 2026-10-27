import { ClipboardList, Sprout, Droplets, ShieldAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fallback mặc định khi type không khớp với key nào
const DEFAULT_CONFIG = {
  label: 'Khác',
  icon: ClipboardList,
  className: 'bg-muted text-muted-foreground',
}

export const CARE_LOG_TYPE_MAP: Record<
  string,
  { label: string; icon: any; className: string }
> = {
  FERTILIZER: {
    label: 'Bón phân',
    icon: Sparkles,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  PESTICIDE: {
    label: 'Phun thuốc',
    icon: ShieldAlert,
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  WATERING: {
    label: 'Tưới nước',
    icon: Droplets,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  PLANTING: {
    label: 'Trồng / Gieo',
    icon: Sprout,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
}

export function CareLogTypeIcon({ type }: { type: string }) {
  // Bổ sung Optional Chaining & Fallback
  const config = CARE_LOG_TYPE_MAP[type] ?? DEFAULT_CONFIG
  const Icon = config.icon

  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', config.className)}>
      <Icon className="size-4" />
    </span>
  )
}

export function CareLogTypeBadge({ type }: { type: string }) {
  // Bổ sung Optional Chaining & Fallback
  const config = CARE_LOG_TYPE_MAP[type] ?? DEFAULT_CONFIG

  return (
    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label || type}
    </span>
  )
}