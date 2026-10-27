'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav'
import { cn, getUserRole } from '@/lib/utils'
import { RiceStalkArtwork } from '@/components/decor/rice-stalk'

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [role, setRole] = useState<string | null>(null)

  // Lấy role của user khi component được mount ở Client
  useEffect(() => {
    setRole(getUserRole())
  }, [])

  // Lọc các item menu hiển thị theo quyền (role)
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // Nếu item không yêu cầu roles cụ thể -> Ai cũng xem được
    if (!('roles' in item) || !item.roles || (item.roles as string[]).length === 0) {
      return true
    }
    // Nếu có danh sách roles -> Chỉ hiển thị khi role của user nằm trong danh sách này
    return role ? (item.roles as string[]).includes(role) : false
  })

  return (
    <>
      {/* Mobile scrim */}
      <div
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 ease-in-out',
          'lg:static lg:translate-x-0',
          collapsed ? 'w-72 lg:w-20' : 'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="relative z-10 flex h-16 items-center gap-3 px-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-5" />
          </span>
          <div
            className={cn(
              'min-w-0 transition-opacity duration-200',
              collapsed && 'lg:pointer-events-none lg:opacity-0',
            )}
          >
            <p className="truncate text-sm font-bold leading-tight text-sidebar-accent-foreground">
              GreenFarm AI
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              Nông trại thông minh
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav list - Đã lọc theo phân quyền */}
        <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>

        {/* Hoạ tiết bông lúa */}
        <RiceStalkArtwork
          className={cn(
            'absolute inset-x-2 bottom-16 z-0 h-44 text-sidebar-foreground/20 transition-opacity duration-200',
            collapsed && 'lg:opacity-0',
          )}
        />

        {/* Collapse toggle (desktop) */}
        <div className="relative z-10 hidden border-t border-sidebar-border p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" />
            ) : (
              <PanelLeftClose className="size-5 shrink-0" />
            )}
            <span className={cn(collapsed && 'lg:hidden')}>Thu gọn menu</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number]
  collapsed: boolean
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const active =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span
        className={cn(
          'min-w-0 flex-1 transition-opacity duration-200',
          collapsed && 'lg:pointer-events-none lg:opacity-0',
        )}
      >
        <span className="block truncate text-sm font-semibold leading-tight">
          {item.label}
        </span>
        <span
          className={cn(
            'block truncate text-xs',
            active
              ? 'text-sidebar-primary-foreground/80'
              : 'text-sidebar-foreground/50',
          )}
        >
          {item.description}
        </span>
      </span>
    </Link>
  )
}