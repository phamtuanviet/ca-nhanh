# Ca Nhanh

**Chợ ca làm theo giờ giữa quán và người làm.** Quán đăng ca lúc 2 giờ chiều, 5 giờ có người đến làm, tối người làm nhận lương. Tiền công được ký quỹ ngay khi đăng ca, chấm công bằng QR đổi mỗi 30 giây, và người làm nhận tiền ngay khi quán duyệt giờ công.

Đồ án môn Thương mại điện tử. Mục tiêu là một bản demo chạy trên URL thật với chi phí hạ tầng 0đ (Vercel Hobby + Supabase Free), trình diễn trọn vòng đời một ca trong 5 phút.

## Trạng thái

| Phần | Trạng thái |
|---|---|
| Tài liệu thiết kế 01–07 | Bản 1.0 |
| CSDL: 17 bảng, 53 hàm, RLS, tác vụ định kỳ | Đã kiểm thử, đạt 92/92 |
| Hệ thiết kế: màu, chữ, component, chuyển động, ảnh | Xong |
| Ứng dụng Next.js | Phase 0 (nền móng) xong trên máy: đăng nhập, phân quyền theo vai trò, khung 3 khu vực, API nền, seed, CI. Chưa deploy |

## Cấu trúc repo

```
app/         trang (worker/, shop/, admin/, (auth)/, dev/ui) và REST API app/api/v1/
components/  ui/ (shadcn/ui theo thương hiệu), cn/ (component Ca Nhanh), layout/
lib/         supabase/ (client trình duyệt, server, secret), api.ts, errors.ts, auth.ts, roles.ts
proxy.ts     làm mới phiên Supabase, chuyển hướng theo vai trò
supabase/    config.toml và migrations/ (chép từ docs/sql)
scripts/     seed.ts (dữ liệu demo), setup-env.mjs, sync-assets.mjs
tests/unit/  Vitest
docs/        tài liệu 01–07; docs/sql/ là migration gốc và bộ 92 kiểm tra
design/      theme.css, components.css, đặc tả component, hàm chuyển động, logo, ảnh, minh họa, avatar
.github/     CI, keep-alive, mẫu pull request và issue
```

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [01 SRS](docs/01-SRS.md) | Yêu cầu chức năng, quy tắc nghiệp vụ, tiêu chí nghiệm thu demo |
| [02 Use case và user story](docs/02-Use-Cases-User-Stories.md) | 24 use case, 47 story, Gherkin, kịch bản demo 5 phút |
| [03 Kiến trúc](docs/03-System-Architecture-HLD.md) | Công nghệ, sơ đồ C4, luồng chính, bảo mật, triển khai |
| [04 CSDL](docs/04-ERD-Database-Schema.md) | ERD, từ điển dữ liệu, mô hình tiền, danh mục hàm |
| [05 API](docs/05-API-Specification.md) | 66 endpoint, realtime, webhook, token QR, mã lỗi |
| [06 Giao diện](docs/06-UI-Design-System.md) | Màu, chữ, chuyển động, hiệu năng, hình ảnh, agent skill |
| [07 Kế hoạch lập trình](docs/07-Implementation-Plan.md) | Phase 0–3, task, lịch từng ngày, quy trình làm việc |

Mục lục đầy đủ và quy ước mã định danh nằm ở [docs/README.md](docs/README.md). Bản xem trước chạy được của hệ thiết kế nằm trên [trang hệ thiết kế](https://claude.ai/artifact/4uG7edwcZRAKQcbZptsw62) (link riêng tư, cần chủ sở hữu chia sẻ).

## Công nghệ

Next.js (App Router, TypeScript) trên Vercel · Supabase: Postgres + PostGIS + pg_cron, Auth, Realtime, Storage · Tailwind CSS v4 + shadcn/ui · VietQR · Leaflet + OpenStreetMap.

## Lộ trình

| Phase | Thời gian | Kết quả |
|---|---|---|
| 0 · Nền móng | 05–07/11 | Next.js, Supabase, đăng nhập, CI, deploy |
| 1 · Vòng chợ | 09–14/11 | Nạp ví, đăng ca có ký quỹ, tìm ca, nhận ca an toàn khi tranh chỗ, realtime |
| 2 · Chấm công và tiền | 16–21/11 | Kiosk QR, check-in/out, duyệt giờ công, ví, rút tiền, hủy và điểm phạt |
| 3 · Hoàn thiện | 23–28/11 | Bản đồ, đánh giá, KPI, quản trị, PWA, hiệu năng, E2E |
| Demo | 30/11 | Tập dượt và trình diễn |

## Chạy trên máy

Cần Node 22+ và Docker:

```bash
npm install
npm run db:start     # Supabase cục bộ (Postgres + PostGIS + pg_cron, Auth, Realtime, Storage)
npm run env:local    # sinh .env.local
npm run seed         # tài khoản demo, 6 quán, 60 ngày lịch sử
npm run dev          # http://localhost:3000 → Đăng nhập → Đăng nhập nhanh
```

| Lệnh | Việc |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm test` | ESLint, TypeScript, Vitest |
| `npm run db:test` | 92 kiểm tra nghiệp vụ CSDL trong Docker (không cần Supabase) |
| `npm run db:reset`, `npm run db:types` | Áp lại migration, sinh lại `lib/database.types.ts` |

Trang `/dev/ui` hiện toàn bộ token và component để kiểm tra giao diện ở hai theme. Đưa lên Supabase cloud và Vercel: [07 §11](docs/07-Implementation-Plan.md).

## Cách đóng góp

Mỗi task là một issue (mẫu có sẵn). Tạo nhánh theo mã task, ví dụ `feat/p1-10-chi-tiet-ca`; commit theo Conventional Commits; mở pull request nhỏ và squash merge. Chi tiết ở [07 §2](docs/07-Implementation-Plan.md).

## Nguồn hình ảnh

Nguồn và giấy phép của ảnh, avatar và font: [design/assets/CREDITS.md](design/assets/CREDITS.md).
