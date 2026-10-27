'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
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
      window.location.href = '/crop-lots'

    } catch (err: unknown) {
      console.error('Lỗi đăng nhập:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Đăng nhập thất bại, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        
        {/* LOGO & TITLE */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-700 text-white shadow-lg mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">GreenFarm AI</h1>
          <p className="text-emerald-600 font-medium text-sm mt-1">Nông trại thông minh</p>
        </div>

        {/* FORM ĐĂNG NHẬP */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* EMAIL / USERNAME */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tên đăng nhập / Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@farm.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-slate-800"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-slate-800"
              />
            </div>
          </div>

          {/* THÔNG BÁO LỖI */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* NÚT SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}