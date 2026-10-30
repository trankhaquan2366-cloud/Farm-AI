'use client'

import { SWRConfig } from 'swr'

/**
 * Cấu hình SWR dùng chung cho toàn bộ dashboard.
 * - keepPreviousData: khi đổi filter/tab, dữ liệu cũ vẫn hiển thị trong lúc chờ
 *   -> không còn khung hình trắng, chuyển tab gần như tức thì.
 * - dedupingInterval: gộp các request trùng key trong 15s (Sidebar + Page cùng gọi
 *   /api/batches chỉ phát sinh 1 request).
 * - revalidateOnFocus=false: tránh gọi lại toàn bộ API mỗi lần click quay lại tab
 *   trình duyệt; dữ liệu vẫn được làm mới qua mutate() sau mỗi thao tác ghi.
 */
const SWR_DEFAULTS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 15000,
  keepPreviousData: true,
  errorRetryCount: 2,
  focusThrottleInterval: 30000,
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={SWR_DEFAULTS}>{children}</SWRConfig>
}
