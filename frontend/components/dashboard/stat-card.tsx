import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  loading?: boolean
  tone?: 'default' | 'accent'
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  tone = 'default',
}: StatCardProps) {
  return (
    <div className="surface-glass rounded-3xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          )}
          {hint && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            tone === 'accent'
              ? 'bg-accent/15 text-accent-foreground'
              : 'bg-secondary text-secondary-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  )
}
