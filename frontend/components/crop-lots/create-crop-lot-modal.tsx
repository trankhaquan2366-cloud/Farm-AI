'use client'

import { useState } from 'react'
import { mutate } from 'swr'
import { X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

interface CreatePlotModalProps {
  isOpen: boolean
  onClose: () => void
}

const INITIAL_FORM_STATE = {
  code: '',
  name: '',
  area: '',
  soil_type: 'Đất thịt',
  status: 'Đang canh tác',
  location: '',
  description: '',
}

export function CreatePlotModal({ isOpen, onClose }: CreatePlotModalProps) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setError('')
    setFormData(INITIAL_FORM_STATE)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await api('/api/plots', {
        method: 'POST',
        body: {
          code: formData.code.trim() || `LO-${Math.floor(100 + Math.random() * 900)}`,
          name: formData.name.trim(),
          area: formData.area ? Number(formData.area) : 0,
          soil_type: formData.soil_type || null,
          status: formData.status,
          location: formData.location.trim() || null,
          description: formData.description.trim() || null,
        } as any,
      })

      // Cập nhật lại danh sách lô đất ngay lập tức
      await mutate('/api/plots')
      handleClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        {/* Nút đóng */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tiêu đề */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">Thêm Lô đất mới</h2>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}

        {/* Form nhập dữ liệu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hàng 1: Mã lô đất & Tên lô đất */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mã lô đất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: LO-405"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tên lô đất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: Lô Đất Phía Bắc"
              />
            </div>
          </div>

          {/* Hàng 2: Diện tích & Loại đất */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Diện tích (m²)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: 1200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Loại đất
              </label>
              <select
                value={formData.soil_type}
                onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Đất thịt">Đất thịt (Loam)</option>
                <option value="Đất cát">Đất cát</option>
                <option value="Đất phù sa">Đất phù sa</option>
                <option value="Đất đỏ bazan">Đất đỏ bazan</option>
                <option value="Đất sét">Đất sét</option>
              </select>
            </div>
          </div>

          {/* Hàng 3: Trạng thái & Vị trí */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Đang canh tác">Đang canh tác</option>
                <option value="Đang nghỉ">Đang nghỉ</option>
                <option value="Đang cải tạo">Đang cải tạo</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Vị trí / Tọa độ
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: Khu A – Hàng 1..5"
              />
            </div>
          </div>

          {/* Hàng 4: Ghi chú */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ghi chú
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ghi chú về chất đất, hệ thống tưới..."
            />
          </div>

          {/* Nút thao tác */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#1e3a2b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#152a1f] transition-colors disabled:opacity-60 flex items-center justify-center min-w-[110px]"
            >
              {saving ? 'Đang lưu…' : 'Lưu lô đất'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePlotModal