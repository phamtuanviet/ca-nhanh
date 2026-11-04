# design/: theme, component CSS và asset của Ca Nhanh

Bản dùng trong code của **Hệ thiết kế Ca Nhanh** (https://claude.ai/artifact/4uG7edwcZRAKQcbZptsw62). Trang đó có brand book, 87 token màu ở hai theme, 12 component có xem trước chạy được, và quy tắc chuyển động. Thư mục này là phần chép vào ứng dụng Next.js. Lý do của từng lựa chọn nằm ở [docs/06-UI-Design-System.md](../docs/06-UI-Design-System.md).

| Đường dẫn | Nội dung |
|---|---|
| `theme.css` | Token màu (thang `lam`, `nghe`, `ngoc`, `son`, `muc` và token ngữ nghĩa) cho theme sáng và tối; ánh xạ sang biến của shadcn/ui; `@theme inline` cho Tailwind v4 (`bg-surface`, `text-money`, `bg-spark`, `rounded-ticket`, `font-display`…) |
| `components.css` | Lớp `cn-*` cho vé ca, chỗ, con dấu, đếm ngược, kiosk QR, odometer, bảng tin, skeleton; token chuyển động `--cn-dur-*`, `--cn-ease-*`; luật `prefers-reduced-motion` |
| `motion/ca-nhanh-motion.js` | Hàm chuyển động (ES module, an toàn khi SSR): `odometer`, `gain`, `confetti`, `fillSeat`, `stamp`, `countdown`, `kiosk`, `pushShift`, `vnd` |
| `COMPONENTS.md` | Đặc tả 12 component (khi dùng, props, trạng thái, quy tắc), dùng khi port sang React |
| `components.d.ts` | Kiểu props của 12 component, làm hợp đồng cho bản React |
| `assets/brand/` | Logo (3 phiên bản nền), biểu tượng, favicon, icon PWA 192/512/maskable, `apple-touch-icon.png`, `og-image.jpg` 1200 × 630, `manifest.webmanifest` |
| `assets/photos/` | 8 ảnh, mỗi ảnh có AVIF + WebP ở 480 / 960 (và 1600 cho ảnh khổ ngang); `photos.json` ghi kích thước, `blurDataURL`, văn bản thay thế, nguồn |
| `assets/illustrations/` | 6 minh họa SVG cho màn hình rỗng và onboarding, tự đổi màu theo theme khi chèn trực tiếp |
| `assets/avatars/` | 16 avatar Notionists (CC0) cho người dùng demo |
| `assets/CREDITS.md` | Nguồn và giấy phép của từng ảnh |

## Gắn vào Next.js

1. Chép `assets/brand`, `assets/photos`, `assets/illustrations`, `assets/avatars` vào `public/` (thành `public/brand/…`, `public/photos/…`).
2. Trong `app/globals.css`:
   ```css
   @import "tailwindcss";
   @import "../design/theme.css";
   @import "../design/components.css";
   ```
3. Nạp font trong `app/layout.tsx` (chỉ tải phần tiếng Việt và Latin):
   ```tsx
   import { Be_Vietnam_Pro, Big_Shoulders_Display } from 'next/font/google';
   const sans = Be_Vietnam_Pro({ subsets: ['vietnamese', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-be-vietnam-pro', display: 'swap' });
   const display = Big_Shoulders_Display({ subsets: ['vietnamese', 'latin'], weight: ['700', '800'], variable: '--font-big-shoulders', display: 'swap' });
   // <html lang="vi" className={`${sans.variable} ${display.variable}`}>
   ```
4. Theme tối: dùng `next-themes` với `attribute="class"`; `theme.css` đọc cả lớp `.dark` lẫn `[data-theme="dark"]`, và theo `prefers-color-scheme` khi chưa chọn.
5. Metadata: `icons: { icon: '/brand/favicon.svg', apple: '/brand/apple-touch-icon.png' }`, `openGraph.images: '/brand/og-image.jpg'`, `manifest: '/brand/manifest.webmanifest'`; màu thanh trình duyệt khai báo riêng: `export const viewport = { themeColor: '#2D58F2' }`.
6. Ảnh: `<Image src="/photos/cafe-garden-960.webp" width={960} height={640} sizes="(max-width: 640px) 100vw, 480px" placeholder="blur" blurDataURL={…} alt="Quán cà phê có cửa sổ nhìn ra vườn" />`, lấy `blurDataURL` và `alt` từ `photos.json`. Ảnh đã nén sẵn nên có thể đặt `images.unoptimized = true` để không dùng hạn mức tối ưu ảnh của Vercel Hobby.

## Ví dụ: vé ca trong React

```tsx
<div className="cn-ticket-wrap">
  <Link href={`/worker/shifts/${s.id}`} className="cn-ticket" style={{ viewTransitionName: `shift-${s.id}` }}>
    <div className="cn-ticket__main">
      <div className="cn-ticket__shop"><img src={s.shopLogoUrl} alt="" width={28} height={28} /><span>{s.shopName}</span><span>{s.shopRating}★</span></div>
      <h3 className="cn-ticket__title">{s.title}</h3>
      <p className="cn-ticket__meta"><span className="cn-num">{fmtTime(s.startAt)}–{fmtTime(s.endAt)}</span><span>{fmtDay(s.startAt)}</span><span>{fmtDistance(s.distanceM)}</span></p>
      <div className="cn-ticket__foot"><SeatSlots headcount={s.headcount} filled={s.filled} />{s.deposited && <Badge tone="deposit">Đã ký quỹ</Badge>}</div>
    </div>
    <div className="cn-ticket__stub"><span className="cn-ticket__label">Thu nhập</span><strong className="cn-ticket__pay">{vnd(s.estEarning)}</strong><span className="cn-ticket__rate">{vnd(s.hourlyRate)}/giờ</span></div>
  </Link>
</div>
```

Kích thước: CSS + hàm chuyển động khoảng 6,5 KB gzip; ảnh hero 1600px nặng 55 KB (AVIF).
