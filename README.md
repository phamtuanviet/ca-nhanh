# Ca Nhanh

**Chợ ca làm theo giờ giữa quán và người làm.** Quán đăng ca lúc 2 giờ chiều, 5 giờ có người đến làm, tối người làm nhận lương. Tiền công được ký quỹ ngay khi đăng ca, chấm công bằng QR đổi mỗi 30 giây, và người làm nhận tiền ngay khi quán duyệt giờ công.

Đồ án môn Thương mại điện tử. Mục tiêu là một bản demo chạy trên URL thật với chi phí hạ tầng 0đ (Vercel Hobby + Supabase Free), trình diễn trọn vòng đời một ca trong 5 phút.

## Trạng thái

| Phần | Trạng thái |
|---|---|
| Tài liệu thiết kế 01–07 | Bản 1.0 |
| CSDL: 17 bảng, 53 hàm, RLS, tác vụ định kỳ | Đã kiểm thử, đạt 92/92 |
| Hệ thiết kế: màu, chữ, component, chuyển động, ảnh | Xong |
| Ứng dụng Next.js | Bắt đầu Phase 0 ngày 05/11/2026 |

## Cấu trúc repo

```
docs/      tài liệu 01–07; docs/sql/ là migration đã kiểm thử và bộ kiểm thử
design/    theme.css, components.css, đặc tả component, hàm chuyển động, logo, ảnh, minh họa, avatar
.github/   mẫu pull request và mẫu issue
```

Mã ứng dụng (`app/`, `components/`, `lib/`, `supabase/`) được thêm từ Phase 0.

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

## Chạy kiểm thử CSDL

Cần Docker:

```bash
bash docs/sql/test/run_tests.sh
```

Kết quả mong đợi: 92 dòng bắt đầu bằng `ok`, không có `CHECK FAILED`.

## Cách đóng góp

Mỗi task là một issue (mẫu có sẵn). Tạo nhánh theo mã task, ví dụ `feat/p1-10-chi-tiet-ca`; commit theo Conventional Commits; mở pull request nhỏ và squash merge. Chi tiết ở [07 §2](docs/07-Implementation-Plan.md).

## Nguồn hình ảnh

Nguồn và giấy phép của ảnh, avatar và font: [design/assets/CREDITS.md](design/assets/CREDITS.md).
