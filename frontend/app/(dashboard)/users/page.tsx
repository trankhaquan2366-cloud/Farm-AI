'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { Loader2, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { api, ApiError, fetcher } from '@/lib/api'

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Nhân viên' },
  { value: 'technician', label: 'Kỹ thuật viên' },
  { value: 'admin', label: 'Quản trị viên' },
] as const

type Account = {
  id: number
  employee_code: string | null
  username: string
  full_name: string | null
  email: string
  role: string
}

type AccountForm = {
  employee_code: string
  username: string
  full_name: string
  email: string
  password: string
  role: string
}

const initialForm: AccountForm = {
  employee_code: '',
  username: '',
  full_name: '',
  email: '',
  password: '',
  role: 'staff',
}

export default function UsersPage() {
  const { data: accounts, mutate } = useSWR<Account[]>('/api/auth/users', fetcher)
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rolePrefix = form.role === 'technician' ? 'KT' : form.role === 'admin' ? 'QT' : 'NV'
  const generatedUsername = form.full_name.trim() || 'Chưa nhập tên'

  function updateField(field: keyof AccountForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
        },
      })
      setForm(initialForm)
      setMessage('Đã tạo tài khoản thành công.')
      await mutate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo tài khoản.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Users className="size-7 text-primary" /> Quản lý tài khoản
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Tạo tài khoản, mã nhân viên và vai trò truy cập hệ thống.</p>
      </div>

      <section className="surface-glass rounded-3xl p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary"><UserPlus className="size-5" /></div>
          <div>
            <h2 className="font-bold text-foreground">Tạo tài khoản mới</h2>
            <p className="text-xs text-muted-foreground">Chỉ Quản lý và Quản trị viên được sử dụng chức năng này.</p>
          </div>
        </div>
        {message && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {([
            ['full_name', 'Họ và tên', 'Nguyễn Văn A'],
            ['email', 'Email', 'nhanvien@farm.com'],
            ['password', 'Mật khẩu', 'Tối thiểu 6 ký tự'],
          ] as const).map(([field, label, placeholder]) => (
            <label key={field} className="text-sm font-medium text-foreground">
              {label}
              <input
                required
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={placeholder}
                minLength={field === 'password' ? 6 : undefined}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
          ))}
          <label className="text-sm font-medium text-foreground">
            Vai trò
            <select value={form.role} onChange={(event) => updateField('role', event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
              {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">Thông tin tự động</p>
            <p className="mt-1 text-xs text-muted-foreground">Mã nhân viên: <strong>{rolePrefix}-TỰ-ĐỘNG</strong></p>
            <p className="mt-1 text-xs text-muted-foreground">Tên đăng nhập: <strong>{generatedUsername}</strong></p>
          </div>
          <div className="flex items-end lg:col-span-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </section>

      <section className="surface-glass overflow-hidden rounded-3xl p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-foreground"><ShieldCheck className="size-5 text-primary" /> Danh sách tài khoản</h2>
        {!accounts ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Đang tải...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-3">Mã nhân viên</th><th className="px-3 py-3">Họ tên</th><th className="px-3 py-3">Tên đăng nhập</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Vai trò</th></tr></thead>
              <tbody className="divide-y divide-border/60">{accounts.map((account) => <tr key={account.id}><td className="px-3 py-3 font-mono text-xs">{account.employee_code || 'Chưa có'}</td><td className="px-3 py-3 font-medium">{account.full_name || 'Chưa cập nhật'}</td><td className="px-3 py-3">{account.username}</td><td className="px-3 py-3">{account.email}</td><td className="px-3 py-3 capitalize">{ROLE_OPTIONS.find((role) => role.value === account.role)?.label || account.role}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
