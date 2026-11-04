import type { Metadata } from 'next';
import { RetryButton } from './retry-button';

export const metadata: Metadata = { title: 'Mất kết nối', robots: { index: false } };

/**
 * Trang service worker trả về khi mất mạng (PWA và app Android). Dùng style nội tuyến để vẫn đẹp khi
 * CSS chưa kịp lưu; không đọc phiên, không gọi dữ liệu.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#F4F7FD',
        color: '#151B2A',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center', maxWidth: 320 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh đã lưu sẵn trong service worker */}
        <img
          src="/brand/app-icon-192.png"
          alt=""
          width={72}
          height={72}
          style={{ borderRadius: 18 }}
        />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Mất kết nối mạng</h1>
        <p style={{ margin: 0, color: '#51596B', lineHeight: 1.5 }}>
          Ca Nhanh cần mạng để hiện ca trống và số dư đúng lúc. Kiểm tra Wi-Fi hoặc 4G rồi thử lại.
        </p>
        <RetryButton />
      </div>
    </main>
  );
}
