'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

type RiceStalkArtworkProps = {
  className?: string
}

/*
  Hoạ tiết trang trí bông lúa - tự vẽ bằng path/ellipse (line-art gốc,
  không lấy từ ảnh/artwork có sẵn nào) để tránh vấn đề bản quyền.
  Dùng currentColor cho stroke/fill để component cha điều khiển màu qua
  className (vd: text-sidebar-foreground/20).
*/
export function RiceStalkArtwork({ className }: RiceStalkArtworkProps) {
  const grains = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    const x = 235 - t * 55 + (i % 2 === 0 ? 12 : -12)
    const y = 20 + t * 190
    const angle = i % 2 === 0 ? 24 : -24
    return { x, y, angle, key: i }
  })

  return (
    <motion.div
      aria-hidden="true"
      className={cn('pointer-events-none select-none', className)}
      animate={{ rotate: [-1, 1, -1], y: [0, -3, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        viewBox="0 0 400 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        {/* Thân chính uốn cong */}
        <path d="M40 500 C 60 380, 140 300, 120 180 C 105 90, 160 40, 235 20" />
        {/* Nhánh lá phụ */}
        <path d="M95 415 C 60 398, 15 405, -20 375" />
        <path d="M128 300 C 172 292, 202 262, 212 222" />
        <path d="M150 195 C 192 186, 222 156, 232 118" />
        <path d="M60 460 C 30 452, -5 460, -30 440" />
        {/* Bông lúa - chuỗi hạt dọc phần ngọn */}
        {grains.map(({ x, y, angle, key }) => (
          <ellipse
            key={key}
            cx={x}
            cy={y}
            rx="7"
            ry="12"
            transform={`rotate(${angle} ${x} ${y})`}
            fill="currentColor"
            fillOpacity="0.5"
            stroke="none"
          />
        ))}
      </svg>
    </motion.div>
  )
}
