"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

type SearchItem = {
  id: number;
  type: string;
  title: string;
  batch_code?: string | null;
};

const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchSearchResults = async (keyword: string) => {
    if (!keyword) {
      setIsDropdownOpen(false);
      return;
    }
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(keyword)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      const items: SearchItem[] = Array.isArray(data.results) ? data.results : [];

      if (items.length > 0) {
        setResults(items);
        setIsDropdownOpen(true);
      } else {
        setResults([]);
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

      {isDropdownOpen && results.length > 0 && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="border-b last:border-b-0 border-gray-100">
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0">
                Thu hoạch
              </div>
              <ul>
                {results.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="hover:bg-green-50 transition-colors">
                    <Link
                      href={item.batch_code ? `/trace/${encodeURIComponent(item.batch_code)}` : '/traceability'}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="font-medium text-gray-800">{item.title}</span>
                      {item.batch_code && (
                        <span className="shrink-0 font-mono text-xs text-gray-500">{item.batch_code}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
