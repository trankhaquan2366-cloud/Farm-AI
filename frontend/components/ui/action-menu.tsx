'use client'

import { Menu } from '@base-ui/react/menu'
import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ActionMenuItem = {
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
}

export function ActionMenu({
  label,
  items,
}: {
  label: string
  items: ActionMenuItem[]
}) {
  if (items.length === 0) return null

  return (
    <Menu.Root>
      <Menu.Trigger
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label={label}
        title={label}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={5}
          className="z-50"
        >
          <Menu.Popup className="z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 outline-none dark:border-zinc-700 dark:bg-zinc-900">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Menu.Item
                  key={item.label}
                  onClick={item.onSelect}
                  className={cn(
                    'flex w-full cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-zinc-800',
                    item.destructive
                      ? 'text-red-600 data-[highlighted]:text-red-700 dark:text-red-400'
                      : 'text-slate-700 dark:text-zinc-200',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Menu.Item>
              )
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
