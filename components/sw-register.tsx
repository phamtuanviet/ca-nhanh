'use client';

import { useEffect } from 'react';

/** Đăng ký service worker (chỉ bản production: tránh lưu cache khi đang phát triển) */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Không đăng ký được (trình duyệt chặn, http không an toàn): app vẫn chạy bình thường
    });
  }, []);
  return null;
}
