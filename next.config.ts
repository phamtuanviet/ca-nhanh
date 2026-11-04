import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Ảnh trong design/assets đã nén sẵn (AVIF/WebP nhiều cỡ), không dùng hạn mức tối ưu ảnh của Vercel Hobby
  images: { unoptimized: true },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
