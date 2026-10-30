/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false, // Tắt toàn bộ dev overlay/badge ở góc màn hình
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Tree-shake theo từng icon/component thay vì nạp cả thư viện -> bundle nhỏ hơn, vào trang nhanh hơn.
    optimizePackageImports: ['lucide-react', 'motion', '@base-ui/react', 'recharts'],
  },
};

export default nextConfig;
