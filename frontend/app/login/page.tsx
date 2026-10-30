'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Bot,
  Leaf,
  Loader2,
  Lock,
  Mail,
  QrCode,
  Sparkles,
} from 'lucide-react'
import SideRays from '@/components/effects/SideRays'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Đóng gói dữ liệu chuẩn OAuth2
      const formData = new URLSearchParams()
      formData.append('username', email.trim())
      formData.append('password', password.trim())

      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.detail || data.message || 'Tài khoản hoặc mật khẩu không chính xác'
        )
      }

      // 2. Trích xuất Token
      const token = data.access_token || data.token || (data.data && data.data.access_token)

      if (!token) {
        throw new Error('Máy chủ không trả về Token xác thực')
      }

      // 3. Giải mã Token & Lấy dữ liệu từ Backend
      const rawUser = data.user || data.data?.user || {}
      let tokenRole = ''
      let tokenUsername = ''

      try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(window.atob(base64))
        
        if (payload.role) tokenRole = String(payload.role).toUpperCase()
        if (payload.sub) tokenUsername = String(payload.sub)
      } catch (e) {
        console.warn("Không thể đọc Payload từ Token.")
      }

      // 4. Xác định Role cuối cùng
      let finalRole = tokenRole || (rawUser.role ? String(rawUser.role).toUpperCase() : '')
      if (!finalRole) {
        const emailLower = email.toLowerCase()
        if (emailLower.includes('admin')) finalRole = 'ADMIN'
        else if (emailLower.includes('manager')) finalRole = 'MANAGER'
        else if (emailLower.includes('technician')) finalRole = 'TECHNICIAN'
        else finalRole = 'USER'
      }

      // 5. Chuẩn hóa dữ liệu User
      const userData = {
        ...rawUser,
        id: rawUser.id || 1,
        email: rawUser.email || email.trim(),
        username: rawUser.username || tokenUsername || email.trim().split('@')[0],
        role: finalRole,
        full_name: rawUser.full_name || rawUser.name || (
          finalRole === 'ADMIN' ? 'Quản trị viên Hệ thống' :
          finalRole === 'MANAGER' ? 'Quản lý Trang trại' :
          finalRole === 'TECHNICIAN' ? 'Kỹ thuật viên' :
          'Nhân viên Nông trại'
        )
      }

      // =========================================================================
      // 6. ĐIỂM SỬA CHÍNH: LƯU TOKEN VÀO TẤT CẢ BỘ NHỚ ĐỂ TRÁNH LỖI 401
      // =========================================================================
      
      // A. Lưu vào localStorage (Cho Axios / Fetch Interceptors)
      localStorage.setItem('token', token)
      localStorage.setItem('access_token', token)
      localStorage.setItem('user', JSON.stringify(userData))

      // B. Lưu vào sessionStorage (Cho tab hiện tại)
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('access_token', token)
      sessionStorage.setItem('user', JSON.stringify(userData))

      // C. Lưu vào Cookie (Cho Next.js Middleware / Server Components)
      document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`

      console.log('✅ Đăng nhập thành công với vai trò:', userData.role)

      // 7. Điều hướng sang trang chính (Reload cứng để cập nhật trạng thái mới nhất)
      window.location.href = '/'

    } catch (err: unknown) {
      console.error('Lỗi đăng nhập:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Đăng nhập thất bại, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen min-h-[100svh] bg-white dark:bg-slate-900 md:grid md:grid-cols-[38%_62%]">
      <section className="flex min-h-[100svh] items-center justify-center bg-slate-50 px-5 py-10 dark:bg-slate-950 md:bg-white md:px-10 md:dark:bg-slate-900 lg:px-14">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-8 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:dark:bg-transparent">
          <div className="mb-10 flex items-center gap-3">
            <div className="inline-flex rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-[2px] shadow-md shadow-emerald-900/15">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900 text-white">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">GreenFarm AI</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Nông trại thông minh</p>
            </div>
          </div>

          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Đăng nhập vào tài khoản
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Chào mừng trở lại! Nhập thông tin để tiếp tục.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Tên đăng nhập / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@farm.com"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {errorMsg && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Chưa có tài khoản? Liên hệ quản trị viên
          </p>
        </div>
      </section>

      <aside className="relative hidden min-h-[100svh] flex-col justify-between overflow-hidden bg-slate-950 p-10 md:flex lg:p-12">
        <SideRays
          className="pointer-events-none absolute inset-0 z-0 opacity-80"
          dust={0.35}
          followMouse={false}
          glow={1.1}
          intensity={2.2}
          mouseInfluence={0}
          origin="top-right"
          rayColor1="#F59E0B"
          rayColor2="#10B981"
          spread={2.8}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_82%_15%,rgba(16,185,129,0.12),transparent_38%),linear-gradient(155deg,transparent_45%,rgba(15,118,110,0.12))]" />

        <div className="relative z-10 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur-md">
            <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
            Quản lý Canh tác
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur-md">
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            Cố vấn AI 24/7
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur-md">
            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            Truy xuất QR
          </span>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl py-10">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-900/40 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9 lg:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative flex items-start justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
                  Chào mừng đến với GreenFarm AI
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-emerald-50/80">
                  Theo dõi diện tích canh tác, từng lô trồng và sản lượng nông nghiệp minh bạch trong một nơi.
                </p>
              </div>
              <div aria-hidden="true" className="hidden h-16 w-16 shrink-0 animate-pulse rounded-full bg-amber-400/90 shadow-[0_0_50px_rgba(251,191,36,0.6)] motion-reduce:animate-none sm:block" />
            </div>
          </div>
        </div>

        <dl className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
          <div>
            <dt className="text-xs leading-5 text-slate-400">Quản lý lô trồng</dt>
            <dd className="mt-1 text-sm font-semibold leading-6 text-white">
              Diện tích, mùa vụ và trạng thái
            </dd>
          </div>
          <div>
            <dt className="text-xs leading-5 text-slate-400">Gợi ý AI tham khảo</dt>
            <dd className="mt-1 text-sm font-semibold leading-6 text-white">
              Tóm tắt nhật ký, lịch chăm sóc
            </dd>
          </div>
          <div>
            <dt className="text-xs leading-5 text-slate-400">Truy xuất QR</dt>
            <dd className="mt-1 text-sm font-semibold leading-6 text-white">
              Hồ sơ canh tác công khai
            </dd>
          </div>
        </dl>
      </aside>
    </main>
  )
}