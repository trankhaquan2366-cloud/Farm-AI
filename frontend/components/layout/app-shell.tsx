'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { RiceStalkArtwork } from '@/components/decor/rice-stalk'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    // Sửa min-h-screen thành h-screen để cố định chiều cao bằng màn hình
    <div className="flex h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen} 
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header sẽ tự động cố định ở trên cùng */}
        <Header onOpenMobile={() => setMobileOpen(true)} />

        {/* Hoạ tiết nền khu nội dung - nằm dưới mọi thứ (z-0) */}
        <RiceStalkArtwork className="absolute bottom-0 right-0 z-0 h-[75%] w-1/2 text-foreground/10 pointer-events-none" />

        {/* THÊM overflow-y-auto và tăng padding để chống lẹm tiêu đề */}
        <main className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}