/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false, // Tắt toàn bộ dev overlay/badge ở góc màn hình
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
