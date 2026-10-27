'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Menu,
  Bell,
  Search,
  X,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react'

import { api, ApiError, checkHealth } from '@/lib/api'
import { NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/utils'

type HeaderProps = {
  onOpenMobile: () => void
}

type Status = 'checking' | 'online' | 'offline'

interface UserProfile {
  id?: number
  full_name?: string
  username?: string
  email?: string
  role?: string
}

interface Notification {
  id: number | string;
  type: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  const current =
    NAV_ITEMS.find((i) =>
      i.href === '/' ? pathname === '/' : pathname.startsWith(i.href),
    ) ?? NAV_ITEMS[0]

  const [status, setStatus] = useState<Status>('online')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

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
    localStorage.removeItem('user')
    router.push('/login')
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

    const fetchSmartNotifications = async () => {
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
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
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
    async function poll() {
      try {
        const isOk = await checkHealth()
        if (isMounted) setStatus(isOk ? 'online' : 'offline')
      } catch {
        if (isMounted) setStatus('offline')
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
      case 'MANAGER': return 'Quản lý trang trại'
      case 'FARMER': return 'Kỹ thuật / Nông dân'
      case 'USER': return 'Nhân viên'
      default: return role || 'Người dùng'
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'NT'
    const words = name.trim().split(' ')
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="rounded-lg p-2 text-foreground/70 hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" />
      </button>

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
                           <Link href={item.url} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
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
                           <Link href={item.url} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
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
                           <Link href={item.url} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
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

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/80 py-1 pl-1 pr-2.5 backdrop-blur-sm transition-all hover:bg-emerald-50/50 focus:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-sm">
              {getInitials(user?.full_name || user?.username)}
            </span>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-xs font-semibold text-foreground max-w-[100px] truncate">
                {user?.full_name || user?.username || 'Nông trại'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatRole(user?.role)}
              </p>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-background p-2 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-foreground truncate">
                  {user?.full_name || user?.username || 'Nông trại'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email || 'Chưa cập nhật email'}
                </p>
                <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  {formatRole(user?.role)}
                </span>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

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