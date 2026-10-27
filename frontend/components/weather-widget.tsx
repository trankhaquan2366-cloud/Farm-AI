"use client";

import { useEffect, useState } from "react";
import { CloudRain, Sun, Cloud, Loader2 } from "lucide-react"; // Dùng icon từ lucide-react

export function WeatherWidget() {
  const [weather, setWeather] = useState({
    temp: 0,
    description: "",
    loading: true,
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Lấy thời tiết chính xác tại TP Thái Nguyên (lat: 21.5942, lon: 105.8482)
        // Lưu ý: Bạn cần thay YOUR_API_KEY bằng key lấy từ openweathermap.org (miễn phí)
        const API_KEY = "YOUR_API_KEY"; 
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=21.5942&lon=105.8482&units=metric&lang=vi&appid=${API_KEY}`
        );
        const data = await res.json();

        if (data && data.main) {
          setWeather({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Lỗi tải thời tiết:", error);
        setWeather({ ...weather, loading: false });
      }
    };

    fetchWeather();
    // Cập nhật lại mỗi 30 phút
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (weather.loading) {
    return (
      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
        <Loader2 className="w-4 h-4 animate-spin text-green-600" />
        <span className="text-sm text-gray-500">Đang cập nhật...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
      <div className="flex flex-col text-right">
        <span className="text-sm font-semibold text-gray-800">TP. Thái Nguyên</span>
        <span className="text-xs text-gray-500 capitalize">{weather.description}</span>
      </div>
      <div className="flex items-center gap-1 border-l pl-3 border-gray-100">
        {/* Render icon dựa trên nhiệt độ hoặc description (ví dụ cơ bản) */}
        {weather.temp > 30 ? (
          <Sun className="w-5 h-5 text-orange-500" />
        ) : weather.description.includes("mưa") ? (
          <CloudRain className="w-5 h-5 text-blue-500" />
        ) : (
          <Cloud className="w-5 h-5 text-gray-400" />
        )}
        <span className="text-xl font-bold text-green-700">{weather.temp}°C</span>
      </div>
    </div>
  );
}