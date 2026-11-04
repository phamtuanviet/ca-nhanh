import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Big_Shoulders } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

// Chỉ tải phần chữ tiếng Việt và Latin. Big Shoulders là font biến thiên có trục opsz:
// cỡ chữ lớn tự dùng nét "display" (Google Fonts đã gộp Big Shoulders Display vào họ này).
const sans = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});
const display = Big_Shoulders({
  subsets: ['vietnamese', 'latin'],
  axes: ['opsz'],
  variable: '--font-big-shoulders',
  display: 'swap',
  // next/font chưa có số đo để dựng font dự phòng cho họ này
  adjustFontFallback: false,
  fallback: ['Arial Narrow', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Ca Nhanh · Chợ ca làm theo giờ', template: '%s · Ca Nhanh' },
  description:
    'Quán đăng ca lúc 2 giờ chiều, 5 giờ có người đến làm, tối người làm nhận lương. Tiền công được ký quỹ trước, chấm công bằng QR.',
  applicationName: 'Ca Nhanh',
  icons: {
    icon: [
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  manifest: '/brand/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Ca Nhanh',
    images: [{ url: '/brand/og-image.jpg', width: 1200, height: 630, alt: 'Ca Nhanh' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#2D58F2',
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
