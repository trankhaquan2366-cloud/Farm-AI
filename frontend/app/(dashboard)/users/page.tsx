'use client'

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  KeyRound,
  Loader2,
  LockKeyhole,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  UserPlus,
  Users,
} from 'lucide-react'

import { ActionMenu } from '@/components/ui/action-menu'
import { Field, inputClass } from '@/components/ui/field'
import { ApiError, api, fetcher } from '@/lib/api'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'manager', label: 'Quản lý' },
  { value: 'technician', label: 'Kỹ thuật viên' },
  { value: 'staff', label: 'Nhân viên' },
] as const

type AccountRole = (typeof ROLE_OPTIONS)[number]['value']
type AccountStatusFilter = 'all' | 'active' | 'locked'

type Account = {
  id: number
  employee_code: string | null
  username: string
  full_name: string | null
  email: string
  role: string
  plot_id: number | null
  plot_name: string | null
  is_active: boolean
}

type Plot = {
  id: number
  name: string
  code?: string | null
}

type AccountForm = {
  full_name: string
  email: string
  password: string
  role: AccountRole
  plot_id: string
}

const initialForm: AccountForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'staff',
  plot_id: '',
}

function getRoleLabel(role: string) {
  return ROLE_OPTIONS.find((option) => option.value === role.toLowerCase())?.label ?? role
}

function getRoleClass(role: string) {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-violet-100 text-violet-800'
    case 'manager':
      return 'bg-indigo-100 text-indigo-800'
    case 'technician':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'GF'
  return parts.length === 1
    ? Array.from(parts[0]).slice(0, 2).join('').toLocaleUpperCase('vi-VN')
    : `${Array.from(parts[0])[0]}${Array.from(parts[parts.length - 1])[0]}`.toLocaleUpperCase('vi-VN')
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function NativeDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={(node) => {
        dialogRef.current = node
      }}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      className="m-auto max-h-[min(90dvh,760px)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[#183a32]/10 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/40"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#183a32]/10 bg-white px-5 py-4 sm:px-6">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-[#183a32]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Thông tin được lưu vào hồ sơ nhân sự.</p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5d8b58]"
          aria-label="Đóng hộp thoại"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {children}
    </dialog>
  )
}

export default function UsersPage() {
  const {
    data: accounts,
    error: accountsError,
    isLoading: accountsLoading,
    mutate,
  } = useSWR<Account[]>('/api/auth/users', fetcher)
  const { data: plots, error: plotsError } = useSWR<Plot[]>('/api/plots', fetcher)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>('all')
  const [dialog, setDialog] = useState<'create' | 'edit' | 'password' | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN')
    return (accounts ?? []).filter((account) => {
      const matchesSearch =
        !query ||
        [
          account.full_name,
          account.username,
          account.email,
          account.employee_code,
        ].some((value) => value?.toLocaleLowerCase('vi-VN').includes(query))
      const matchesRole = roleFilter === 'all' || account.role.toLowerCase() === roleFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? account.is_active : !account.is_active)
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [accounts, roleFilter, search, statusFilter])

  function closeDialog() {
    setDialog(null)
    setSelectedAccount(null)
    setForm(initialForm)
    setNewPassword('')
    setFormError(null)
    setSaving(false)
  }

  function openCreateDialog() {
    setSelectedAccount(null)
    setForm(initialForm)
    setFormError(null)
    setPageError(null)
    setDialog('create')
  }

  function openEditDialog(account: Account) {
    setSelectedAccount(account)
    setForm({
      full_name: account.full_name ?? '',
      email: account.email,
      password: '',
      role: (ROLE_OPTIONS.some((role) => role.value === account.role.toLowerCase())
        ? account.role.toLowerCase()
        : 'staff') as AccountRole,
      plot_id: account.plot_id == null ? '' : String(account.plot_id),
    })
    setFormError(null)
    setPageError(null)
    setDialog('edit')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    setPageMessage(null)
    setPageError(null)

    try {
      if (dialog === 'create') {
        await api('/api/auth/register', {
          method: 'POST',
          body: {
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            plot_id: form.plot_id ? Number(form.plot_id) : null,
          },
        })
        setPageMessage('Đã tạo tài khoản và hồ sơ nhân sự.')
      } else if (dialog === 'edit' && selectedAccount) {
        await api(`/api/auth/users/${selectedAccount.id}`, {
          method: 'PUT',
          body: {
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            role: form.role,
            plot_id: form.plot_id ? Number(form.plot_id) : null,
          },
        })
        setPageMessage('Đã lưu thay đổi tài khoản.')
      }
      await mutate()
      closeDialog()
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          dialog === 'create' ? 'Không thể tạo tài khoản.' : 'Không thể cập nhật tài khoản.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(account: Account) {
    setBusyAccountId(account.id)
    setPageError(null)
    setPageMessage(null)
    try {
      await api(
        `/api/auth/users/${account.id}/status?is_active=${String(!account.is_active)}`,
        { method: 'PATCH' },
      )
      setPageMessage(
        account.is_active
          ? `Đã khóa tài khoản ${account.full_name || account.username}.`
          : `Đã mở khóa tài khoản ${account.full_name || account.username}.`,
      )
      await mutate()
    } catch (error) {
      setPageError(getErrorMessage(error, 'Không thể cập nhật trạng thái tài khoản.'))
    } finally {
      setBusyAccountId(null)
    }
  }

  function openPasswordDialog(account: Account) {
    setSelectedAccount(account)
    setNewPassword('')
    setFormError(null)
    setPageError(null)
    setDialog('password')
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAccount) return

    setSaving(true)
    setFormError(null)
    try {
      await api(`/api/auth/users/${selectedAccount.id}/reset-password`, {
        method: 'POST',
        body: { password: newPassword },
      })
      setPageMessage(`Đã đặt lại mật khẩu cho ${selectedAccount.full_name || selectedAccount.username}.`)
      closeDialog()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Không thể đặt lại mật khẩu.'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount(account: Account) {
    const confirmed = window.confirm(
      `Xóa tài khoản ${account.full_name || account.username}? Thao tác này không thể hoàn tác.`,
    )
    if (!confirmed) return

    setBusyAccountId(account.id)
    setPageError(null)
    setPageMessage(null)
    try {
      await api(`/api/auth/users/${account.id}`, { method: 'DELETE' })
      setPageMessage(`Đã xóa tài khoản ${account.full_name || account.username}.`)
      await mutate()
    } catch (error) {
      setPageError(getErrorMessage(error, 'Không thể xóa tài khoản.'))
    } finally {
      setBusyAccountId(null)
    }
  }

  const canCreate = dialog === 'create'
  const isEditing = dialog === 'edit'

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 border-b border-[#183a32]/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-medium text-[#52675a]">
            <Users className="size-4 text-[#5d8b58]" aria-hidden="true" />
            Nhân sự trang trại
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#183a32] sm:text-3xl">
            Quản lý tài khoản
          </h1>
          <p className="mt-1.5 text-sm text-[#52675a]">
            Quản lý vai trò, trạng thái và lô đất phụ trách.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:self-auto"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Thêm tài khoản
        </button>
      </header>

      {pageMessage && (
        <p className="border-l-2 border-emerald-600 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900" role="status">
          {pageMessage}
        </p>
      )}
      {pageError && (
        <p className="border-l-2 border-red-500 bg-red-50/70 px-4 py-3 text-sm text-red-900" role="alert">
          {pageError}
        </p>
      )}

      <section aria-label="Tìm kiếm và lọc tài khoản" className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm theo tên, email hoặc mã nhân viên</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên, email hoặc mã nhân viên…"
            className={`${inputClass} pl-9`}
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <label>
            <span className="sr-only">Lọc theo vai trò</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className={`${inputClass} min-w-36`}
              aria-label="Lọc theo vai trò"
            >
              <option value="all">Tất cả vai trò</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AccountStatusFilter)}
              className={`${inputClass} min-w-36`}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Bị khóa</option>
            </select>
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <h2 className="flex items-center gap-2 font-semibold text-[#183a32]">
          <ShieldCheck className="size-4 text-[#5d8b58]" aria-hidden="true" />
          Danh sách nhân sự
        </h2>
        <span>{filteredAccounts.length} tài khoản</span>
      </div>

      {accountsLoading ? (
        <div className="flex items-center gap-2 border-y border-[#183a32]/10 py-10 text-sm text-slate-500" role="status">
          <Loader2 className="size-4 animate-spin" />
          Đang tải danh sách tài khoản…
        </div>
      ) : accountsError ? (
        <div className="border-y border-red-200 py-6 text-sm text-red-900" role="alert">
          <p className="font-semibold">Không tải được danh sách nhân sự</p>
          <p className="mt-1">
            {getErrorMessage(accountsError, 'Kiểm tra quyền truy cập hoặc kết nối rồi thử tải lại trang.')}
          </p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="border-y border-dashed border-[#183a32]/20 py-12 text-center">
          <p className="font-medium text-[#183a32]">
            {accounts?.length ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản nhân sự'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {accounts?.length
              ? 'Thử đổi từ khóa hoặc bộ lọc.'
              : 'Tạo tài khoản để cấp quyền sử dụng hệ thống.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#183a32]/10">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="border-b border-[#183a32]/10 text-xs font-medium text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">Nhân sự</th>
                <th scope="col" className="px-3 py-3 font-medium">Liên hệ</th>
                <th scope="col" className="px-3 py-3 font-medium">Vai trò</th>
                <th scope="col" className="px-3 py-3 font-medium">Trạng thái</th>
                <th scope="col" className="px-3 py-3 font-medium">Lô đất phụ trách</th>
                <th scope="col" className="w-12 px-3 py-3 text-right font-medium">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#183a32]/[0.07]">
              {filteredAccounts.map((account) => {
                const fullName = account.full_name || account.username
                const actionItems = [
                  {
                    label: 'Chỉnh sửa',
                    icon: Pencil,
                    onSelect: () => openEditDialog(account),
                  },
                  {
                    label: 'Đặt lại mật khẩu',
                    icon: KeyRound,
                    onSelect: () => openPasswordDialog(account),
                  },
                  {
                    label: account.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
                    icon: account.is_active ? LockKeyhole : UnlockKeyhole,
                    onSelect: () => void changeStatus(account),
                  },
                  {
                    label: 'Xóa tài khoản',
                    icon: Trash2,
                    onSelect: () => void deleteAccount(account),
                    destructive: true,
                  },
                ]

                return (
                  <tr key={account.id} className="group transition-colors hover:bg-[#f2f7f2]/70">
                    <td className="px-3 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6efe6] text-xs font-semibold text-[#315d43]"
                          aria-hidden="true"
                        >
                          {getInitials(fullName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[#183a32]">
                            {fullName}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {account.employee_code || `ID ${account.id}`}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="block max-w-56 truncate font-medium text-slate-700">
                        {account.email}
                      </span>
                      <span className="mt-0.5 block max-w-56 truncate text-xs text-slate-400">
                        {account.username}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleClass(account.role)}`}>
                        {getRoleLabel(account.role)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          account.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${account.is_active ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        {account.is_active ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">
                      {account.plot_name || 'Chưa phân công'}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      {busyAccountId === account.id ? (
                        <Loader2 className="ml-auto size-4 animate-spin text-slate-400" aria-label="Đang xử lý" />
                      ) : (
                        <ActionMenu label={`Thao tác với ${fullName}`} items={actionItems} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <NativeDialog
        open={dialog === 'create' || dialog === 'edit'}
        title={canCreate ? 'Tạo tài khoản mới' : 'Chỉnh sửa tài khoản'}
        onClose={() => {
          if (dialog === 'create' || dialog === 'edit') closeDialog()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6">
          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {formError}
            </p>
          )}
          <Field label="Họ và tên">
            <input
              required
              autoComplete="name"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              placeholder="Nguyễn Văn An"
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="an@greenfarm.vn"
              className={inputClass}
            />
          </Field>
          {canCreate && (
            <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự.">
              <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Nhập mật khẩu ban đầu"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Vai trò">
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AccountRole }))}
              className={inputClass}
            >
              {ROLE_OPTIONS.filter((role) => !canCreate || role.value !== 'manager').map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Lô đất phụ trách" hint={plotsError ? 'Không tải được danh sách lô đất.' : undefined}>
            <select
              value={form.plot_id}
              onChange={(event) => setForm((current) => ({ ...current, plot_id: event.target.value }))}
              className={inputClass}
              disabled={!plots}
            >
              <option value="">Chưa phân công</option>
              {(plots ?? []).map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}{plot.code ? ` · ${plot.code}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col-reverse gap-2 border-t border-[#183a32]/10 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5d8b58]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || Boolean(plotsError)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? 'Đang lưu…' : canCreate ? 'Tạo tài khoản' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </NativeDialog>

      <NativeDialog
        open={dialog === 'password'}
        title="Đặt lại mật khẩu"
        onClose={() => {
          if (dialog === 'password') closeDialog()
        }}
      >
        <form onSubmit={handlePasswordReset} className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-sm text-slate-600">
            Tạo mật khẩu mới cho{' '}
            <span className="font-semibold text-[#183a32]">
              {selectedAccount?.full_name || selectedAccount?.username}
            </span>
            .
          </p>
          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {formError}
            </p>
          )}
          <Field label="Mật khẩu mới" hint="Tối thiểu 6 ký tự.">
            <input
              required
              type="password"
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 border-t border-[#183a32]/10 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5d8b58]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
            </button>
          </div>
        </form>
      </NativeDialog>
    </main>
  )
}
