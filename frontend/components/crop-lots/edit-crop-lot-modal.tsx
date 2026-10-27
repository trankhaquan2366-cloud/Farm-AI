'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Plot } from '@/lib/types'

type EditPlotModalProps = {
  isOpen: boolean
  plot: Plot | null
  onClose: () => void
  onSuccess: () => void
}

export function EditPlotModal({ isOpen, plot, onClose, onSuccess }: EditPlotModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    area_m2: '',
    location: '',
    soil_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (plot) {
      setFormData({
        name: plot.name || '',
        area_m2: plot.area_m2 != null ? String(plot.area_m2) : '',
        location: plot.location || '',
        soil_type: plot.soil_type || '',
      })
    }
  }, [plot])

  if (!isOpen || !plot) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      await api(`/api/plots/${plot.id}`, {
        method: 'PUT',
        body: {
          name: formData.name,
          area_m2: formData.area_m2 ? Number(formData.area_m2) : null,
          location: formData.location || null,
          soil_type: formData.soil_type || null,
        },
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-1">Sửa Lô Đất</h2>
        <p className="text-sm text-gray-500 mb-4">Cập nhật thông tin mảnh đất</p>

        {errorMsg && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên Lô Đất</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Diện tích (m²)</label>
              <input
                type="number"
                value={formData.area_m2}
                onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vị trí</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Loại Đất</label>
            <input
              type="text"
              value={formData.soil_type}
              onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
