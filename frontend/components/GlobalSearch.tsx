"use client";
import React, { useState } from 'react';
import Link from 'next/link';

const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchSearchResults = async (keyword: string) => {
    if (!keyword) {
      setIsDropdownOpen(false);
      return;
    }
    try {
      const response = await fetch(`http://localhost:8000/api/search?q=${keyword}`);
      const data = await response.json();
      
      // Kiểm tra xem có bất kỳ mảng nào có dữ liệu không
      const hasAnyResult = Object.values(data).some((arr: any) => arr && arr.length > 0);

      if (hasAnyResult) {
        setResults(data);
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchSearchResults(value);
  };

  // Cấu hình tiêu đề cho từng key trả về từ Backend
  const categoryLabels: Record<string, string> = {
    crop_batches: "Lô trồng",
    crop_varieties: "Giống cây",
    plots: "Lô đất",
    logs: "Nhật ký",
    harvests: "Thu hoạch"
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Tìm kiếm mọi thứ..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
        />
        <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>

      {isDropdownOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            {Object.keys(results).map((key) => {
              const items = results[key];
              if (!items || items.length === 0) return null; // Bỏ qua nếu nhóm này không có kết quả

              return (
                <div key={key} className="border-b last:border-b-0 border-gray-100">
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0">
                    {categoryLabels[key] || "Khác"}
                  </div>
                  <ul>
                    {items.map((item: any) => (
                      <li key={`${key}-${item.id}`} className="hover:bg-green-50 transition-colors">
                        <Link href={item.url} className="block px-4 py-3" onClick={() => setIsDropdownOpen(false)}>
                          <span className="font-medium text-gray-800">{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;