'use client'

import { useEffect, useState } from 'react'
import { CloudSun, CloudRain, Cloud, Sun, CloudFog, CloudLightning, Loader2, MapPin } from 'lucide-react'

// Tọa độ TP. Thái Nguyên
const FARM_LAT = 21.5928
const FARM_LON = 105.8442
const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${FARM_LAT}&longitude=${FARM_LON}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FBangkok`

type WeatherData = {
  temperature: number
  humidity: number
  code: number
}

function describeWeatherCode(code: number): { label: string; Icon: typeof Sun; color: string } {
  if (code === 0) return { label: 'Trời quang', Icon: Sun, color: 'text-orange-500' }
  if (code <= 3) return { label: 'Có mây', Icon: CloudSun, color: 'text-blue-400' }
  if (code === 45 || code === 48) return { label: 'Sương mù', Icon: CloudFog, color: 'text-gray-400' }
  if (code >= 51 && code <= 67) return { label: 'Mưa nhỏ', Icon: CloudRain, color: 'text-blue-500' }
  if (code >= 80 && code <= 82) return { label: 'Mưa rào', Icon: CloudRain, color: 'text-blue-600' }
  if (code >= 95) return { label: 'Dông', Icon: CloudLightning, color: 'text-purple-600' }
  return { label: 'Nhiều mây', Icon: Cloud, color: 'text-gray-500' }
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetch(WEATHER_URL)
      .then((res) => {
        if (!res.ok) throw new Error('weather fetch failed')
        return res.json()
      })
      .then((json) => {
        if (!isMounted) return
        setData({
          temperature: json.current.temperature_2m,
          humidity: json.current.relative_humidity_2m,
          code: json.current.weather_code,
        })
      })
      .catch(() => {
        if (isMounted) setError(true)
      })
    return () => {
      isMounted = false
    }
  }, [])

  if (error) {
    return (
      <div className="flex h-10 items-center rounded-full bg-red-50 px-4 text-sm text-red-500 shadow-sm">
        Lỗi thời tiết
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin" />
        Đang tải...
      </div>
    )
  }

  const { label, Icon, color } = describeWeatherCode(data.code)

  // Giao diện thu gọn (Minimalist)
  return (
    <div className="flex w-fit items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm border border-gray-100">
      <div className="flex flex-col text-right">
        <div className="flex items-center justify-end gap-1">
          <MapPin className="size-3 text-green-600" />
          <span className="text-sm font-semibold text-gray-800">TP. Thái Nguyên</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {label} · 💧 {Math.round(data.humidity)}%
        </span>
      </div>
      
      <div className="flex items-center gap-2 border-l pl-3 border-gray-100">
        <Icon className={`size-6 ${color}`} />
        <span className="text-xl font-bold text-gray-900">
          {Math.round(data.temperature)}°C
        </span>
      </div>
    </div>
  )
}