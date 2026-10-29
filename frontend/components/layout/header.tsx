'use client'

import { memo, useEffect, useState, useRef } from 'react'
import { useId, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from '@base-ui/react/menu'
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Bell,
  Search,
  X,
  LogOut,
  User as UserIcon,
  ChevronDown,
  KeyRound,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react'

import { api, ApiError, checkHealth } from '@/lib/api'
import { isNavItemActive, NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { StaggeredMenu } from '@/components/effects/greenfarm-motion'
import { inputClass } from '@/components/ui/field'

type Status = 'checking' | 'online' | 'offline'

interface UserProfile {
  id?: number
  employee_code?: string
  full_name?: string
  username?: string
  email?: string
  role?: string
  plot_name?: string
}

interface Notification {
  id: number | string;
  type: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export const Header = memo(function Header() {
  const pathname = usePathname()
  const router = useRouter()

  const current =
    NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href)) ?? NAV_ITEMS[0]

  const [status, setStatus] = useState<Status>('online')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profileDialog, setProfileDialog] = useState<'profile' | 'password' | null>(null)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (err) {}
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    router.replace('/login')
    router.refresh()
  }

  useEffect(() => {
    const storedTheme = localStorage.getItem('greenfarm-theme')
    const dark = storedTheme === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('light', !dark)
    setIsDarkTheme(dark)
  }, [])

  const toggleTheme = () => {
    const nextIsDark = !isDarkTheme
    document.documentElement.classList.toggle('dark', nextIsDark)
    document.documentElement.classList.toggle('light', !nextIsDark)
    localStorage.setItem('greenfarm-theme', nextIsDark ? 'dark' : 'light')
    setIsDarkTheme(nextIsDark)
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)

  // --- STATE THÔNG BÁO ---
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isClientLoaded, setIsClientLoaded] = useState(false) // FLAG quan trọng để chặn ghi đè mảng rỗng
  const notificationRef = useRef<HTMLDivElement>(null)
  
  // 1. Phục hồi thông báo từ localStorage ngay lần render đầu tiên
  useEffect(() => {
    const savedNotifications = localStorage.getItem('app_notifications')
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications))
      } catch (error) {
        console.error('Lỗi đọc cache thông báo:', error)
      }
    }
    // Đánh dấu đã đọc cache xong
    setIsClientLoaded(true)
  }, [])

  // 2. Chỉ lưu cập nhật vào localStorage NẾU quá trình đọc cache ban đầu (bước 1) đã xong
  useEffect(() => {
    if (isClientLoaded) {
      localStorage.setItem('app_notifications', JSON.stringify(notifications))
    }
  }, [notifications, isClientLoaded])

  // 3. Xử lý API và nhận cảnh báo nội bộ
  useEffect(() => {
    let isMounted = true
    let isFetchingNotifications = false

    const fetchSmartNotifications = async () => {
      if (isFetchingNotifications) return
      isFetchingNotifications = true

      try {
        const response = await fetch('http://localhost:8000/api/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok && isMounted) {
          const data: Notification[] = await response.json()
          
          setNotifications(prev => {
            const merged = [...prev]
            data.forEach(apiItem => {
              if (!merged.some(localItem => localItem.id === apiItem.id)) {
                merged.push(apiItem)
              }
            })
            return merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          })
        }
      } catch (error) {
        // Bỏ qua lỗi nếu mất mạng, vẫn giữ thông báo local
      } finally {
        isFetchingNotifications = false
      }
    }

    fetchSmartNotifications()
    const intervalId = setInterval(fetchSmartNotifications, 300000)

    const handleLocalAlert = (event: Event) => {
      const customEvent = event as CustomEvent
      if (isMounted) {
        setNotifications((prev) => {
          // Tránh trùng lặp nếu event bắn ra nhiều lần
          const newId = customEvent.detail.id || Date.now()
          const exists = prev.some(n => n.id === newId)
          if (exists) return prev
          
          return [{...customEvent.detail, id: newId, unread: true}, ...prev]
        })
      }
    }
    window.addEventListener('newPestAlert', handleLocalAlert)

    return () => {
      isMounted = false
      clearInterval(intervalId)
      window.removeEventListener('newPestAlert', handleLocalAlert)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, unread: false })))
    try {
      await fetch('http://localhost:8000/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
    } catch (error) {}
  }

  const handleToggleNotifications = () => {
    const willShow = !showNotifications
    setShowNotifications(willShow)
    
    // Tự động tắt chấm đỏ khi mở menu
    if (willShow && notifications.some(n => n.unread)) {
      markAllAsRead()
    }
  }

  useEffect(() => {
    let isMounted = true
    let isCheckingHealth = false
    async function poll() {
      if (isCheckingHealth) return
      isCheckingHealth = true

      try {
        const isOk = await checkHealth()
        if (isMounted) setStatus(isOk ? 'online' : 'offline')
      } catch {
        if (isMounted) setStatus('offline')
      } finally {
        isCheckingHealth = false
      }
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      setIsSearching(true)
      try {
        const response = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(searchTerm)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data)
        }
      } catch (error) {} 
      finally { setIsSearching(false) }
    }
  }

  const totalResults = results
    ? (results.crop_batches?.length || 0) +
      (results.crop_varieties?.length || 0) +
      (results.plots?.length || 0) +
      (results.logs?.length || 0) +
      (results.harvests?.length || 0)
    : 0

  const formatRole = (role?: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'Quản trị viên'
      case 'MANAGER': return 'Quản lý'
      case 'TECHNICIAN': return 'Kỹ thuật viên'
      case 'STAFF': return 'Nhân viên'
      case 'FARMER': return 'Kỹ thuật viên'
      case 'USER': return 'Nhân viên'
      default: return role || 'Người dùng'
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'NT'
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return 'NT'
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <StaggeredMenu
        items={NAV_ITEMS.filter((item) => {
          if (!item.roles) return true
          const role = user?.role?.toLowerCase()
          return role ? item.roles.includes(role) : false
        })}
      />

      <div className="min-w-0">
        <h1 className="truncate text-base font-bold text-foreground md:text-lg">
          {current.label}
        </h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {current.description}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
            {isSearching ? (
              <div className="size-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            ) : (
              <Search className="size-4" />
            )}
            <input
              type="search"
              placeholder="Tìm lô, giống cây (Enter)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              className="w-48 bg-transparent outline-none placeholder:text-muted-foreground/70 text-foreground"
            />
          </div>

          {results && (
             <div className="absolute right-0 top-full mt-2 w-80 max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl z-50">
             <div className="flex items-center justify-between mb-3 border-b pb-2">
               <span className="text-sm font-semibold text-foreground">Kết quả tìm kiếm</span>
               <button onClick={() => setResults(null)} className="text-muted-foreground hover:text-destructive">
                 <X className="size-4" />
               </button>
             </div>

             {totalResults === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-4">Không tìm thấy kết quả nào.</p>
             ) : (
               <div className="space-y-4">
                 {results.crop_varieties?.length > 0 && (
                   <div>
                     <h4 className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Giống cây</h4>
                     <ul className="space-y-1">
                       {results.crop_varieties.map((item: any) => (
                         <li key={`variety-${item.id}`}>
                           <Link href={item.url} prefetch={false} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
                             {item.name}
                           </Link>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
                 {results.plots?.length > 0 && (
                   <div>
                     <h4 className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Lô đất</h4>
                     <ul className="space-y-1">
                       {results.plots.map((item: any) => (
                         <li key={`plot-${item.id}`}>
                           <Link href={item.url} prefetch={false} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
                             {item.name}
                           </Link>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
                 {results.crop_batches?.length > 0 && (
                   <div>
                     <h4 className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Lô trồng</h4>
                     <ul className="space-y-1">
                       {results.crop_batches.map((item: any) => (
                         <li key={`batch-${item.id}`}>
                           <Link href={item.url} prefetch={false} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
                             {item.name}
                           </Link>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             )}
           </div>
          )}
        </div>

        <StatusPill status={status} />

        {/* --- CHUÔNG THÔNG BÁO --- */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            className="relative rounded-full border border-white/60 bg-white/80 p-2 text-foreground/70 backdrop-blur-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none"
            aria-label="Thông báo"
          >
            <Bell className="size-5" />
            {notifications.some((n) => n.unread) && (
              <span className="absolute top-0 right-0 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500 border-2 border-white"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-3 border-b bg-gray-50 flex justify-between items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800 shrink-0">Thông báo</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-1.5 rounded-md font-medium shrink-0 transition-colors"
                  >
                    Đánh dấu đã đọc
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    Bạn chưa có thông báo nào.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                        n.unread ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {n.type === 'ai_warning' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">!</span>}
                          {n.type === 'ai_suggestion' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">💡</span>}
                          {n.type === 'harvest' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">✓</span>}
                          {n.type === 'warning' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs font-bold">!</span>}
                        </div>

                        <div className="flex-1">
                          <p className={`text-sm font-medium ${n.type === 'ai_warning' || n.type === 'warning' ? 'text-red-600' : 'text-gray-800'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.time).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Menu.Root>
          <Menu.Trigger
            aria-label="Mở menu tài khoản"
            className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/80 py-1 pl-1 pr-2.5 backdrop-blur-sm transition-colors hover:bg-emerald-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">
              {getInitials(user?.full_name || user?.username)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[120px] truncate text-xs font-semibold text-foreground">
                {user?.full_name || user?.username || 'Nông trại'}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {formatRole(user?.role)}
              </span>
            </span>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
              <Menu.Popup className="w-72 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-lg shadow-slate-900/10 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-start gap-3 border-b border-slate-200 px-2.5 pb-3 pt-1 dark:border-slate-700">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-sm font-bold text-white">
                    {getInitials(user?.full_name || user?.username)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {user?.full_name || user?.username || 'Nông trại'}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {user?.email || 'Chưa cập nhật email'}
                    </span>
                    <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {formatRole(user?.role)}
                    </span>
                  </span>
                </div>

                <div className="space-y-0.5 py-1.5">
                  <Menu.Item
                    onClick={() => setProfileDialog('profile')}
                    className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-900 dark:text-slate-200 dark:data-[highlighted]:bg-emerald-950/50 dark:data-[highlighted]:text-emerald-200"
                  >
                    <UserIcon className="size-4 text-slate-500" aria-hidden="true" />
                    Hồ sơ cá nhân
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => setProfileDialog('password')}
                    className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-900 dark:text-slate-200 dark:data-[highlighted]:bg-emerald-950/50 dark:data-[highlighted]:text-emerald-200"
                  >
                    <KeyRound className="size-4 text-slate-500" aria-hidden="true" />
                    Đổi mật khẩu
                  </Menu.Item>
                  <Menu.Item
                    onClick={toggleTheme}
                    className="flex min-h-10 cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-900 dark:text-slate-200 dark:data-[highlighted]:bg-emerald-950/50 dark:data-[highlighted]:text-emerald-200"
                  >
                    <span className="flex items-center gap-2.5">
                      {isDarkTheme
                        ? <Sun className="size-4 text-slate-500" aria-hidden="true" />
                        : <Moon className="size-4 text-slate-500" aria-hidden="true" />}
                      Chế độ giao diện
                    </span>
                    <span
                      className={cn(
                        'relative h-5 w-9 rounded-full transition-colors',
                        isDarkTheme ? 'bg-emerald-700' : 'bg-slate-300',
                      )}
                      aria-label={isDarkTheme ? 'Đang bật chế độ tối' : 'Đang bật chế độ sáng'}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform',
                          isDarkTheme ? 'translate-x-4' : 'translate-x-0.5',
                        )}
                      />
                    </span>
                  </Menu.Item>
                </div>

                <Menu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                <Menu.Item
                  onClick={handleLogout}
                  className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-red-600 outline-none data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 dark:text-red-400 dark:data-[highlighted]:bg-red-950/30 dark:data-[highlighted]:text-red-300"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Đăng xuất
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <AccountActionDialog
        mode={profileDialog}
        user={user}
        onClose={() => setProfileDialog(null)}
      />
    </header>
  )
})

function StatusPill({ status }: { status: Status }) {
  const map = {
    checking: { label: 'Đang kết nối…', dot: 'bg-muted-foreground', pulse: true },
    online: { label: 'API Trực tuyến', dot: 'bg-emerald-500', pulse: true },
    offline: { label: 'Mất kết nối API', dot: 'bg-destructive', pulse: false },
  }[status]

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-2 text-xs font-medium backdrop-blur-sm',
        status === 'offline' ? 'text-destructive' : 'text-foreground',
      )}
    >
      <span className="relative flex size-2">
        {map.pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-75',
              map.dot,
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', map.dot)} />
      </span>
      <span className="hidden sm:inline">{map.label}</span>
    </div>
  )
}

function AccountActionDialog({
  mode,
  user,
  onClose,
}: {
  mode: 'profile' | 'password' | null
  user: UserProfile | null
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (mode && dialog && !dialog.open) dialog.showModal()
    if (!mode && dialog?.open) dialog.close()
    if (!mode) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setSaved(false)
    }
  }, [mode])

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }
    setSaving(true)
    try {
      await api('/api/auth/me/password', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể đổi mật khẩu. Vui lòng thử lại.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!mode) return null

  const fullName = user?.full_name || user?.username || 'Người dùng'
  const roleLabel = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'Quản trị viên'
      case 'manager': return 'Quản lý'
      case 'technician': return 'Kỹ thuật viên'
      case 'staff': return 'Nhân viên'
      default: return role || 'Người dùng'
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      className="m-auto max-h-[min(90dvh,680px)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === 'profile' ? 'Hồ sơ cá nhân' : 'Đổi mật khẩu'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {mode === 'profile' ? 'Thông tin tài khoản đang đăng nhập.' : 'Chọn mật khẩu mới để bảo vệ tài khoản.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:hover:bg-slate-800"
          aria-label="Đóng hộp thoại"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {mode === 'profile' ? (
        <div className="p-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-700 text-sm font-bold text-white">
              {fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toLocaleUpperCase('vi-VN')}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900 dark:text-white">{fullName}</span>
              <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{user?.email || 'Chưa cập nhật email'}</span>
            </span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Mã nhân viên</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{user?.employee_code || 'Chưa có'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Vai trò</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{roleLabel(user?.role)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Lô đất phụ trách</dt>
              <dd className="text-right font-medium text-slate-800 dark:text-slate-100">{user?.plot_name || 'Chưa phân công'}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <form onSubmit={handlePasswordChange} className="space-y-4 p-5">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" role="status">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Đã đổi mật khẩu thành công.
            </p>
          )}
          <label className="block text-sm font-medium">
            Mật khẩu hiện tại
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={`${inputClass} mt-1.5 dark:border-slate-700 dark:bg-slate-800`}
            />
          </label>
          <label className="block text-sm font-medium">
            Mật khẩu mới
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={`${inputClass} mt-1.5 dark:border-slate-700 dark:bg-slate-800`}
            />
          </label>
          <label className="block text-sm font-medium">
            Xác nhận mật khẩu mới
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`${inputClass} mt-1.5 dark:border-slate-700 dark:bg-slate-800`}
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-10 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
            >
              {saving && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {saving ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}