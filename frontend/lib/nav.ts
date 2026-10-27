import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Leaf, LandPlot, Sprout, NotebookPen, QrCode, Users, Package } from 'lucide-react'

export type NavItem = {
  label: string
  description: string
  href: string
  icon: LucideIcon
  roles?: string[]
}

// LƯU Ý: bản gốc chỉ có 1 mục "Lô đất & Giống cây" trỏ về /crop-lots,
// nhưng hệ thống thực tế đã tách thành 3 trang riêng (Giống cây / Lô đất /
// Lô trồng) - nên tách nav thành 3 mục tương ứng, nếu không 2 trang kia
// sẽ không có lối vào từ Sidebar.
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tổng quan',
    description: 'Dashboard & cảnh báo AI',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Giống cây',
    description: 'Danh mục giống cây trồng',
    href: '/varieties',
    icon: Leaf,
  },
  {
    label: 'Lô đất',
    description: 'Quản lý đất canh tác',
    href: '/crop-lots',
    icon: LandPlot,
  },
  {
    label: 'Lô trồng',
    description: 'Trạng thái sinh trưởng',
    href: '/batches',
    icon: Sprout,
  },
  {
    label: 'Nhật ký & Trợ lý AI',
    description: 'Chăm sóc & cố vấn Gemini',
    href: '/care-logs',
    icon: NotebookPen,
  },
  {
    label: 'Vật tư nông nghiệp',
    description: 'Tồn kho, nhập kho và cảnh báo',
    href: '/supplies',
    icon: Package,
    roles: ['admin', 'manager', 'technician', 'staff'],
  },
  {
    label: 'Truy xuất nguồn gốc',
    description: 'Thu hoạch & mã QR',
    href: '/traceability',
    icon: QrCode,
  },
  {
    label: 'Quản lý tài khoản',
    description: 'Nhân sự, vai trò và quyền truy cập',
    href: '/users',
    icon: Users,
    roles: ['admin', 'manager'],
  },
]
