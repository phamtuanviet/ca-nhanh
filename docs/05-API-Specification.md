# API Specification — Ca Nhanh

| Mục | Nội dung |
|---|---|
| Phiên bản API | `v1` · tài liệu 1.0 (bản để review) · 04/11/2026 |
| Kiểu | REST + JSON, cài bằng Next.js Route Handlers; sự kiện thời gian thực qua Supabase Realtime |
| Dựa trên | [01-SRS.md](01-SRS.md) (FR/BR) · [03-HLD](03-System-Architecture-HLD.md) (kiến trúc) · [04-ERD](04-ERD-Database-Schema.md) (bảng, hàm `fn_*`) |

---

## 1. Tổng quan

| Mục | Quy ước |
|---|---|
| Base URL | `https://<app>.vercel.app/api/v1` · local `http://localhost:3000/api/v1` |
| Định dạng | JSON UTF-8; request ghi phải có `Content-Type: application/json` |
| Xác thực | Web: cookie phiên Supabase (`@supabase/ssr`). Postman/mobile: `Authorization: Bearer <access_token>` lấy từ Supabase Auth |
| Đăng ký, đăng nhập | Dùng trực tiếp Supabase Auth SDK (`signUp`, `signInWithPassword`, `signInWithOAuth('google')`); API này không bọc lại |
| Vai trò | `worker`, `shop_owner`, `admin`; cột **Quyền** trong §3 |
| Thời gian | ISO 8601 có múi giờ. Gửi lên dạng `2026-11-05T17:00:00+07:00`; server trả UTC `2026-11-05T10:00:00Z` |
| Tiền | Số nguyên VND (`150000` = 150.000đ) |
| ID | UUID v4 (riêng `notifications.id` là số nguyên) |
| Kiểu đặt tên | `snake_case`, khớp tên cột CSDL và kiểu TypeScript sinh tự động |
| Phiên bản | Thay đổi phá vỡ tương thích thì sang `/api/v2`; thêm trường mới không tính là phá vỡ |

---

## 2. Quy ước chung

### 2.1 Phong bì phản hồi

```json
// Một đối tượng
{ "data": { "id": "b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "status": "open" } }

// Danh sách
{ "data": [ { "...": "..." } ], "meta": { "page": 1, "limit": 20, "total": 57 } }

// Lỗi
{
  "error": {
    "code": "SHIFT_FULL",
    "message": "Ca vừa đủ người",
    "details": null,
    "request_id": "req_7f3a9c21"
  }
}
```

### 2.2 Phân trang, lọc, sắp xếp
- `?page=1&limit=20` (limit tối đa 50). `meta.total` là tổng số bản ghi khớp bộ lọc.
- Lọc bằng query string theo tên trường (`status=open`, `from=2026-11-05`). Danh sách nhiều giá trị ngăn bằng dấu phẩy (`positions=barista,server`).

### 2.3 Idempotency
- `POST /wallet/topups` và `POST /wallet/withdrawals` **bắt buộc** header `Idempotency-Key: <uuid>`. Gửi lại cùng khóa thì nhận lại đúng lệnh đã tạo, không tạo lệnh mới.
- Nhận ca idempotent tự nhiên: bấm hai lần thì lần sau nhận `409 ALREADY_BOOKED`.
- Webhook thanh toán idempotent theo mã tham chiếu.

### 2.4 Header khác

| Header | Hướng | Ý nghĩa |
|---|---|---|
| `X-Request-Id` | ↔ | Client có thể gửi; server luôn trả về (cũng nằm trong `error.request_id`) |
| `Retry-After` | ← | Kèm `429 RATE_LIMITED` |
| `X-CN-Timestamp`, `X-CN-Signature` | → | Chỉ dùng cho webhook (§6) |

### 2.5 Mã HTTP

| Mã | Dùng khi |
|---|---|
| 200 / 201 / 204 | Thành công / đã tạo / không có nội dung |
| 400 | Sai định dạng đầu vào (`VALIDATION_ERROR`) |
| 401 | Chưa đăng nhập, token hết hạn, chữ ký webhook sai |
| 403 | Đã đăng nhập nhưng không đủ quyền hoặc không đủ điều kiện (chưa xác minh, bị tạm khóa…) |
| 404 | Không tồn tại **hoặc** không có quyền thấy (không tiết lộ sự tồn tại) |
| 409 | Xung đột trạng thái (hết chỗ, trùng giờ, đã quyết toán…) |
| 422 | Đúng định dạng nhưng vi phạm quy tắc nghiệp vụ (lương thấp, thiếu số dư, QR hết hạn, ngoài geofence…) |
| 429 | Gọi quá nhanh |
| 500 / 503 | Lỗi server / CSDL không phản hồi |

---

## 3. Danh sách endpoint

| # | Method · Path | Quyền | Mô tả | Hàm CSDL | FR |
|---|---|---|---|---|---|
| 1 | `GET /health` | Công khai | Kiểm tra sức khỏe, có truy vấn CSDL | `select 1` | SYS-02 |
| 2 | `GET /config` | Công khai | Tham số công khai (phí, lương tối thiểu, cờ demo…) | `platform_settings` | ADM-07 |
| 3 | `GET /positions` | Công khai | Danh mục vị trí | `positions` | SFT-01 |
| 4 | `GET /me` | Đã đăng nhập | Hồ sơ, hồ sơ người làm hoặc danh sách quán, ví | đọc | AUTH-05 |
| 5 | `POST /me/onboarding` | Đã đăng nhập | Chốt vai trò và thông tin cơ bản | `fn_complete_onboarding` | AUTH-03 |
| 6 | `PATCH /me` | Đã đăng nhập | Sửa họ tên, SĐT, ảnh | update | PRF-01 |
| 7 | `PATCH /me/worker-profile` | worker | Trường, kỹ năng, giới thiệu, vị trí nhà, ngân hàng | update | PRF-01, 04 |
| 8 | `POST /me/kyc` | worker | Gửi hồ sơ xác minh | `fn_submit_kyc` | PRF-02 |
| 9 | `GET /workers/{workerId}` | shop_owner, admin | Hồ sơ năng lực người làm | đọc | PRF-05, BKG-10 |
| 10 | `POST /shops` | shop_owner | Tạo quán | insert | SHP-01…03 |
| 11 | `GET /shops/mine` | shop_owner | Các quán của tôi | đọc | SHP-02 |
| 12 | `GET /shops/{shopId}` | Đã đăng nhập | Hồ sơ công khai của quán + đánh giá | đọc | RAT-02 |
| 13 | `PATCH /shops/{shopId}` | chủ quán | Sửa quán, đặt lại vị trí, bán kính | update | SHP-01, 06 |
| 14 | `GET /shops/{shopId}/checkin-token` | chủ quán | Token QR xoay vòng cho kiosk | HMAC (server) | SHP-04 |
| 15 | `GET /shops/{shopId}/shifts` | chủ quán | Ca của quán theo trạng thái/ngày | đọc | SFT-05 |
| 16 | `GET /shops/{shopId}/workers` | chủ quán | Người từng làm, người quen, bị chặn | đọc | SHP-05 |
| 17 | `PUT /shops/{shopId}/workers/{workerId}/list` | chủ quán | Đánh dấu người quen hoặc chặn | upsert | SHP-05 |
| 18 | `DELETE /shops/{shopId}/workers/{workerId}/list` | chủ quán | Bỏ đánh dấu | delete | SHP-05 |
| 19 | `POST /shifts/estimate` | shop_owner | Ước tính chi phí trước khi đăng | tính ở server | SFT-02 |
| 20 | `POST /shifts` | shop_owner | **Đăng ca + tạm giữ** | `fn_publish_shift` | SFT-01, 03, 04, 08, 09, 12 |
| 21 | `GET /shifts` | Đã đăng nhập | **Tìm ca** theo vị trí, lọc, sắp xếp | `search_shifts` | SRC-01, 03 |
| 22 | `GET /shifts/{shiftId}` | Đã đăng nhập | Chi tiết ca (chủ quán thấy thêm các booking) | đọc | SRC-04, SFT-05 |
| 23 | `PATCH /shifts/{shiftId}` | chủ quán | Sửa mô tả/yêu cầu, đổi số người | update, `fn_resize_shift` | SFT-06 |
| 24 | `GET /shifts/{shiftId}/cancel-preview` | chủ quán | Báo trước bồi thường nếu hủy | tính ở server | SFT-07 |
| 25 | `POST /shifts/{shiftId}/cancel` | chủ quán | Hủy ca | `fn_cancel_shift` | SFT-07 |
| 26 | `POST /shifts/{shiftId}/boost` | chủ quán | Đẩy ca gấp | `fn_boost_shift` | SFT-08 |
| 27 | `POST /shifts/{shiftId}/duplicate` | chủ quán | Đăng lại sang ngày khác | `fn_publish_shift` | SFT-11 |
| 28 | `POST /shifts/{shiftId}/invites` | chủ quán | Mời người quen | `fn_invite_workers` | SFT-10 |
| 29 | `POST /shifts/{shiftId}/bookings` | worker | **Nhận ca** | `fn_book_shift` | BKG-01…04 |
| 30 | `GET /bookings` | worker, shop_owner | Ca của tôi / booking của quán | đọc | BKG-05 |
| 31 | `GET /bookings/{bookingId}` | người trong cuộc, admin | Chi tiết booking, giờ công, log quét | đọc | BKG-05 |
| 32 | `GET /bookings/{bookingId}/cancel-preview` | worker, chủ quán | Báo trước điểm phạt hoặc bồi thường | tính ở server | BKG-06, 07 |
| 33 | `POST /bookings/{bookingId}/cancel` | worker, chủ quán | Hủy booking | `fn_cancel_booking` | BKG-06, 07 |
| 34 | `POST /bookings/{bookingId}/check-in` | worker | **Check-in QR** | HMAC + `fn_record_attendance` | ATT-01…05 |
| 35 | `POST /bookings/{bookingId}/check-out` | worker | Check-out QR, tính giờ công | HMAC + `fn_record_attendance` | ATT-01, PAY-03 |
| 36 | `POST /bookings/{bookingId}/approve` | chủ quán | **Duyệt giờ công + quyết toán** | `fn_approve_booking` | PAY-04, 05 |
| 37 | `POST /bookings/{bookingId}/dispute` | worker, chủ quán | Mở khiếu nại | `fn_open_dispute` | PAY-09 |
| 38 | `POST /bookings/{bookingId}/reviews` | worker, chủ quán | Đánh giá đối phương | `fn_submit_review` | RAT-01, 03 |
| 39 | `GET /invites` | worker | Lời mời của tôi | đọc | BKG-09 |
| 40 | `POST /invites/{inviteId}/accept` | worker | Nhận lời mời (tạo booking) | `fn_respond_invite` | BKG-09 |
| 41 | `POST /invites/{inviteId}/decline` | worker | Từ chối lời mời | `fn_respond_invite` | BKG-09 |
| 42 | `GET /wallet` | Đã đăng nhập | Số dư + 5 giao dịch gần nhất | đọc | PAY-01 |
| 43 | `GET /wallet/transactions` | Đã đăng nhập | Lịch sử sổ cái | đọc | PAY-07 |
| 44 | `POST /wallet/topups` | shop_owner | Tạo lệnh nạp VietQR | `fn_create_topup` | PAY-02 |
| 45 | `GET /payment-orders/{orderId}` | chủ ví, admin | Trạng thái lệnh | đọc | PAY-02 |
| 46 | `POST /payment-orders/{orderId}/simulate-paid` | chủ ví, admin · **demo** | Giả lập ngân hàng báo có | `fn_confirm_topup` | PAY-02 |
| 47 | `POST /wallet/withdrawals` | worker | Rút về ngân hàng | `fn_request_withdrawal` | PAY-06 |
| 48 | `POST /webhooks/payments` | Cổng thanh toán (HMAC) | Báo có | `fn_confirm_topup` | PAY-02, 08 |
| 49 | `GET /notifications` | Đã đăng nhập | Danh sách thông báo | đọc | NTF-01 |
| 50 | `POST /notifications/read` | Đã đăng nhập | Đánh dấu đã đọc | update | NTF-02 |
| 51 | `GET /admin/kpis` | admin | KPI tổng hợp + theo ngày | `fn_kpi_summary` | ADM-01 |
| 52 | `GET /admin/kyc` | admin | Hàng chờ xác minh (kèm URL ảnh ký 60 giây) | đọc | ADM-02 |
| 53 | `POST /admin/kyc/{submissionId}/review` | admin | Duyệt/từ chối xác minh | `fn_review_kyc` | ADM-02 |
| 54 | `GET /admin/shops` | admin | Quán chờ duyệt | đọc | ADM-03 |
| 55 | `POST /admin/shops/{shopId}/review` | admin | Duyệt/từ chối quán | update + `fn_notify` | ADM-03 |
| 56 | `GET /admin/users` | admin | Tìm người dùng | đọc | ADM-04 |
| 57 | `PATCH /admin/users/{userId}` | admin | Khóa/mở khóa, gỡ tạm khóa nhận ca | update | ADM-04 |
| 58 | `GET /admin/disputes` | admin | Khiếu nại theo trạng thái | đọc | ADM-05 |
| 59 | `POST /admin/disputes/{disputeId}/resolve` | admin | Xử lý khiếu nại | `fn_resolve_dispute` | ADM-05 |
| 60 | `GET /admin/payment-orders` | admin | Lệnh nạp/rút | đọc | ADM-06 |
| 61 | `POST /admin/payment-orders/{orderId}/complete` | admin | Xác nhận lệnh rút thành công/thất bại | `fn_complete_withdrawal` | ADM-06 |
| 62 | `GET /admin/settings` | admin | Toàn bộ tham số | đọc | ADM-07 |
| 63 | `PATCH /admin/settings` | admin | Sửa tham số | update | ADM-07 |
| 64 | `POST /admin/demo/reset` | admin · **demo** | Reset + sinh lịch sử | `fn_demo_reset` | ADM-08 |
| 65 | `POST /admin/demo/fast-forward` | admin hoặc chủ quán của ca · **demo** | Tua ca tới giờ bắt đầu/kết thúc | `fn_demo_fast_forward` | ADM-08 |
| 66 | `POST /admin/demo/tick` | admin · **demo** | Chạy bộ hẹn giờ ngay | `fn_cron_tick` | ADM-08 |

Endpoint có nhãn **demo** trả `403 DEMO_DISABLED` khi `demo_mode.enabled = false`.

---

## 4. Chi tiết endpoint

Dữ liệu ví dụ dùng xuyên suốt: quán *Cà phê Góc Phố* (144 Xuân Thủy, Cầu Giấy) của chị Lan; ca *Pha chế ca tối* 17:00–22:00 ngày 05/11/2026, 30.000đ/giờ, 2 người; người làm Minh.

### 4.1 Hệ thống

#### `GET /health`
```json
200 { "data": { "status": "ok", "db": "ok", "time": "2026-11-04T08:00:00Z", "version": "1.0.0" } }
503 { "error": { "code": "INTERNAL_ERROR", "message": "CSDL không phản hồi" } }
```

#### `GET /config`
```json
200 {
  "data": {
    "fee_rate": 0.2, "min_hourly_rate": 25500, "urgent_boost_fee": 20000, "min_lead_minutes": 30,
    "checkin_open_before_minutes": 30, "qr_rotation_seconds": 30,
    "penalty_points": { "cancel_lt_24h": 1, "cancel_lt_6h": 2, "no_show": 4 },
    "suspension_threshold": 4, "topup_min": 50000, "withdraw_min": 10000,
    "demo_mode": { "enabled": true, "auto_verify": true, "skip_geofence": false }
  }
}
```

### 4.2 Tài khoản và hồ sơ

#### `GET /me`
```json
200 {
  "data": {
    "id": "0f9e8d7c-6b5a-4c3d-9e2f-1a0b9c8d7e6f", "role": "worker", "full_name": "Nguyễn Văn Minh",
    "phone": "0987654321", "avatar_url": null, "status": "active", "onboarded": true,
    "worker_profile": {
      "date_of_birth": "2004-05-12", "school": "ĐH Quốc gia Hà Nội", "skills": ["barista", "server"],
      "kyc_status": "verified", "rating_avg": 4.8, "rating_count": 12, "completed_count": 15,
      "no_show_count": 0, "penalty_points": 0, "suspended_until": null,
      "bank": { "bin": "970436", "account_no_masked": "•••• 4567", "account_name": "NGUYEN VAN MINH" }
    },
    "shops": null,
    "wallet": { "type": "worker", "balance": 150000, "held_balance": 0 }
  }
}
```
Với chủ quán: `worker_profile = null`, `shops = [{ "id", "name", "verification_status" }]`. Người dùng chưa onboarding có `onboarded: false`; client chuyển tới màn hình onboarding.

#### `POST /me/onboarding`
```json
// Request
{ "role": "worker", "full_name": "Nguyễn Văn Minh", "phone": "0987654321", "date_of_birth": "2004-05-12" }
// 200: hồ sơ như GET /me
```
| Lỗi | Khi nào |
|---|---|
| `400 VALIDATION_ERROR` | `role` khác `worker`/`shop_owner`; SĐT sai định dạng |
| `422 PROFILE_INCOMPLETE` | Người làm thiếu `date_of_birth` |
| `403 AGE_RESTRICTED` | Dưới 18 tuổi (BR-27) |
| `409 ROLE_LOCKED` | Đã onboarding với vai trò khác |

#### `PATCH /me` và `PATCH /me/worker-profile`
```json
// PATCH /me
{ "full_name": "Nguyễn Văn Minh", "phone": "0987654321", "avatar_url": "https://<ref>.supabase.co/storage/v1/object/public/public-media/<uid>/avatar.webp" }

// PATCH /me/worker-profile (mọi trường đều tùy chọn)
{
  "bio": "Pha chế 1 năm kinh nghiệm", "school": "ĐH Quốc gia Hà Nội",
  "skills": ["barista", "server"],
  "home_location": { "lat": 21.0380, "lng": 105.7820 },
  "bank": { "bin": "970436", "account_no": "0011001234567", "account_name": "NGUYEN VAN MINH" }
}
```
`skills` phải thuộc danh mục `positions`; `bank.account_name` được chuẩn hóa in hoa, bỏ dấu. Trả `200` với hồ sơ mới.

#### `POST /me/kyc`
Client tải 3 ảnh lên Storage trước (`kyc-private/<uid>/front.jpg`, `back.jpg`, `selfie.jpg`; ≤ 5 MB; jpg/png/webp), rồi gửi đường dẫn:
```json
// Request
{ "front_image_path": "<uid>/front.jpg", "back_image_path": "<uid>/back.jpg", "selfie_path": "<uid>/selfie.jpg", "id_last4": "1234" }
// 201
{ "data": { "id": "…", "status": "pending", "created_at": "2026-11-04T08:10:00Z" } }
```
Lỗi: `403 FORBIDDEN` (ảnh không nằm trong thư mục của mình), `409 KYC_PENDING`, `409 INVALID_STATE` (đã xác minh).

#### `GET /workers/{workerId}`
```json
200 {
  "data": {
    "id": "0f9e8d7c-…", "full_name": "Nguyễn Văn Minh", "avatar_url": null, "school": "ĐH Quốc gia Hà Nội",
    "skills": ["barista", "server"], "kyc_status": "verified",
    "rating_avg": 4.8, "rating_count": 12, "completed_count": 15, "no_show_count": 0,
    "badges": ["Pha chế 10+ ca", "Đúng giờ"],
    "phone": "0987654321",
    "list_type": "favorite",
    "recent_reviews": [ { "stars": 5, "tags": ["on_time"], "comment": "Nhanh nhẹn", "shop_name": "Cà phê Góc Phố", "created_at": "…" } ]
  }
}
```
`phone` chỉ có khi quán của người gọi có booking với người làm này (BR-28); `list_type` là đánh dấu của chính quán người gọi.

### 4.3 Quán

#### `POST /shops`
```json
// Request
{
  "name": "Cà phê Góc Phố", "category": "cafe", "address": "144 Xuân Thủy, Cầu Giấy", "district": "Cầu Giấy",
  "lat": 21.0368, "lng": 105.7826, "phone": "0912345678", "geofence_radius_m": 150,
  "description": "Quán cà phê sinh viên, đông khách buổi tối", "cover_url": null
}
// 201
{ "data": { "id": "5a1d6c2e-8f43-4b7a-9c1e-2d3f4a5b6c7d", "name": "Cà phê Góc Phố", "verification_status": "verified", "…": "…" } }
```
`verification_status` là `verified` nếu bật `demo_mode.auto_verify`, ngược lại `pending` (chờ admin, endpoint 55).

#### `PATCH /shops/{shopId}`
Giống `POST /shops`, mọi trường tùy chọn. Nút "Đặt vị trí quán tại đây" gửi `{ "lat": …, "lng": … }` lấy từ GPS của thiết bị.

#### `GET /shops/{shopId}/checkin-token`
Kiosk gọi mỗi khi sang cửa sổ 30 giây mới (dựa vào `expires_at`).
```json
200 {
  "data": {
    "token": "v1.5a1d6c2e-8f43-4b7a-9c1e-2d3f4a5b6c7d.59795756.jyopG7svytG0nK-fCLBr7R",
    "qr_payload": "https://ca-nhanh.vercel.app/c/v1.5a1d6c2e-8f43-4b7a-9c1e-2d3f4a5b6c7d.59795756.jyopG7svytG0nK-fCLBr7R",
    "window": 59795756, "rotation_seconds": 30, "expires_at": "2026-11-05T09:58:30Z"
  }
}
```
Đặc tả token ở §7.

#### `GET /shops/{shopId}/shifts`
Query: `status` (nhiều giá trị), `from`, `to` (ngày), `page`, `limit`. Mỗi phần tử: thông tin ca + `filled_count/headcount` + `pending_approval_count`.

#### `GET /shops/{shopId}/workers` · `PUT|DELETE /shops/{shopId}/workers/{workerId}/list`
```json
// GET ?list=favorite|blocked|all
200 { "data": [ { "worker_id": "…", "full_name": "Nguyễn Văn Minh", "rating_avg": 4.8, "completed_at_shop": 6, "last_worked_at": "…", "list_type": "favorite" } ], "meta": { "page": 1, "limit": 20, "total": 9 } }

// PUT body
{ "list_type": "favorite", "note": "Pha chế giỏi, mời ca cuối tuần" }
// 200 → bản ghi; DELETE → 204
```

### 4.4 Ca

#### `POST /shifts/estimate`
```json
// Request
{ "shop_id": "5a1d6c2e-…", "start_at": "2026-11-05T17:00:00+07:00", "end_at": "2026-11-05T22:00:00+07:00",
  "break_minutes": 0, "hourly_rate": 30000, "headcount": 2, "is_urgent": false }
// 200
{
  "data": {
    "paid_minutes": 300, "wage_per_seat": 150000, "fee_rate": 0.2, "fee_per_seat": 30000,
    "seat_cost": 180000, "total_hold": 360000, "boost_fee": 0, "total_due_now": 360000,
    "available_balance": 2000000, "shortfall": 0,
    "violations": []
  }
}
```
`violations` liệt kê các quy tắc bị vi phạm (ví dụ `["RATE_BELOW_MINIMUM"]`) để form khóa nút *Đăng ca*. Công thức giống hệt `fn_publish_shift` (BR-06, BR-17).

#### `POST /shifts` · Đăng ca và tạm giữ
```json
// Request
{
  "shop_id": "5a1d6c2e-8f43-4b7a-9c1e-2d3f4a5b6c7d",
  "position_code": "barista",
  "title": "Pha chế ca tối",
  "description": "Pha chế đồ uống cơ bản, có hướng dẫn đầu ca",
  "requirements": "Mặc áo trắng, có kinh nghiệm pha chế là lợi thế",
  "start_at": "2026-11-05T17:00:00+07:00",
  "end_at": "2026-11-05T22:00:00+07:00",
  "break_minutes": 0,
  "hourly_rate": 30000,
  "headcount": 2,
  "min_rating": 4.0,
  "favorites_only_minutes": 30,
  "is_urgent": false
}
// 201
{
  "data": {
    "id": "b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "shop_id": "5a1d6c2e-…", "status": "open",
    "title": "Pha chế ca tối", "position_code": "barista",
    "start_at": "2026-11-05T10:00:00Z", "end_at": "2026-11-05T15:00:00Z",
    "hourly_rate": 30000, "headcount": 2, "filled_count": 0, "fee_rate": 0.2,
    "est_wage_per_seat": 150000, "est_fee_per_seat": 30000, "hold_amount": 360000,
    "favorites_only_until": "2026-11-04T08:40:00Z", "is_urgent": false, "published_at": "2026-11-04T08:10:00Z"
  }
}
```
| Lỗi | Khi nào |
|---|---|
| `400 VALIDATION_ERROR` | Thiếu trường, sai kiểu, `position_code` không tồn tại |
| `403 FORBIDDEN` / `SHOP_NOT_VERIFIED` / `SHOP_INACTIVE` | Không phải chủ quán; quán chưa duyệt; quán tạm ngưng |
| `422 RATE_BELOW_MINIMUM` | Lương < 25.500đ/giờ (`details.min_hourly_rate`) |
| `422 INVALID_TIME_RANGE` | Ngược giờ, > 12 giờ, ngoài 30 ngày tới, nghỉ ≥ thời lượng |
| `422 LEAD_TIME_TOO_SHORT` | Bắt đầu sớm hơn `min_lead_minutes` |
| `422 INVALID_HEADCOUNT` | Ngoài 1–20 |
| `422 INSUFFICIENT_BALANCE` | `details: { "required": 360000, "available": 100000, "shortfall": 260000 }` |

#### `GET /shifts` · Tìm ca
Query:

| Tham số | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|
| `lat`, `lng` | Có | | Vị trí người dùng hoặc tâm khu vực |
| `radius_km` | | 5 | 1–20 |
| `from`, `to` | | now, now + 7 ngày | Lọc theo giờ bắt đầu |
| `positions` | | tất cả | `barista,server` |
| `min_rate` | | | Lương tối thiểu |
| `sort` | | `match` | `match` · `distance` · `start_time` · `rate` |
| `page`, `limit` | | 1, 20 | |

```json
200 {
  "data": [
    {
      "shift_id": "b3f1c2d4-…", "shop_id": "5a1d6c2e-…", "shop_name": "Cà phê Góc Phố", "shop_category": "cafe",
      "shop_rating": 4.7, "shop_address": "144 Xuân Thủy, Cầu Giấy", "lat": 21.0368, "lng": 105.7826,
      "distance_m": 420, "position_code": "barista", "title": "Pha chế ca tối",
      "start_at": "2026-11-05T10:00:00Z", "end_at": "2026-11-05T15:00:00Z", "hourly_rate": 30000,
      "est_earning": 150000, "headcount": 2, "filled_count": 1, "is_urgent": false,
      "favorites_only_until": null, "match_score": 0.812
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```
Chỉ trả ca `open` chưa bắt đầu; ẩn ca của quán đã chặn người gọi. `match_score` theo BR-20.

#### `GET /shifts/{shiftId}`
```json
200 {
  "data": {
    "shift": { "id": "b3f1c2d4-…", "title": "Pha chế ca tối", "status": "full", "…": "…" },
    "shop": { "id": "5a1d6c2e-…", "name": "Cà phê Góc Phố", "rating_avg": 4.7, "lat": 21.0368, "lng": 105.7826, "address": "…" },
    "viewer": { "my_booking_id": "e7a8b9c0-…", "is_favorite": true, "favorites_only_active": false },
    "bookings": [
      { "id": "e7a8b9c0-…", "worker": { "id": "0f9e8d7c-…", "full_name": "Nguyễn Văn Minh", "rating_avg": 4.8 },
        "status": "checked_in", "check_in_at": "2026-11-05T09:58:00Z", "check_in_distance_m": 23, "is_late": false }
    ]
  }
}
```
`bookings` chỉ trả cho chủ quán và admin. `viewer` chỉ trả cho người làm.

#### `PATCH /shifts/{shiftId}`
```json
{ "title": "Pha chế ca tối (có hướng dẫn)", "description": "…", "requirements": "…", "min_rating": 4.5, "headcount": 3 }
```
Đổi `headcount` sẽ gọi `fn_resize_shift` (tạm giữ thêm hoặc hoàn bớt). Gửi `start_at`, `end_at`, `hourly_rate`, `break_minutes` → `422 FIELD_NOT_EDITABLE` (BR-05). Lỗi khác: `422 INVALID_HEADCOUNT` (nhỏ hơn số đã nhận), `422 INSUFFICIENT_BALANCE`, `409 INVALID_STATE`.

#### `GET /shifts/{shiftId}/cancel-preview` · `POST /shifts/{shiftId}/cancel`
```json
// GET cancel-preview → 200
{ "data": { "hours_before_start": 10.5, "confirmed_workers": 2, "compensation_per_worker": 75000,
            "compensation_total": 150000, "release_amount": 360000 } }
// POST cancel, request
{ "reason": "Quán mất điện" }
// 200 → ca với status "cancelled", hold_amount 0
```
Lỗi: `409 INVALID_STATE` (ca đã bắt đầu, đã hủy hoặc hết hạn).

#### `POST /shifts/{shiftId}/boost`
Không có body. `200` ca với `is_urgent: true`. Lỗi: `409 INVALID_STATE` (ca không ở trạng thái `open`), `422 INSUFFICIENT_BALANCE`.

#### `POST /shifts/{shiftId}/duplicate`
```json
{ "start_date": "2026-11-08" }   // giữ nguyên giờ, lương, số người; trả 201 với ca mới
```

#### `POST /shifts/{shiftId}/invites`
```json
// Request
{ "worker_ids": ["0f9e8d7c-…", "2b3c4d5e-…"], "message": "Cuối tuần làm với quán nhé" }
// 200
{ "data": { "invited": 1, "skipped": 1 } }
```
Chỉ người quen hoặc người từng hoàn thành ca tại quán (không bị chặn) mới được mời (BR-25); số còn lại nằm trong `skipped`.

### 4.5 Booking

#### `POST /shifts/{shiftId}/bookings` · Nhận ca
Không có body.
```json
201 {
  "data": {
    "id": "e7a8b9c0-1d2e-4f3a-8b4c-5d6e7f8a9b0c", "shift_id": "b3f1c2d4-…", "shop_id": "5a1d6c2e-…",
    "worker_id": "0f9e8d7c-…", "status": "confirmed", "source": "marketplace", "seat_hold": 180000,
    "booked_at": "2026-11-04T08:15:02Z"
  }
}
```
| Lỗi | HTTP | Thông điệp gợi ý |
|---|---|---|
| `SHIFT_FULL` | 409 | Ca vừa đủ người |
| `SHIFT_NOT_OPEN` | 409 | Ca không còn nhận người |
| `ALREADY_BOOKED` | 409 | Bạn đã nhận ca này rồi |
| `BOOKING_OVERLAP` | 409 | Bạn đã có ca trùng giờ |
| `KYC_REQUIRED` | 403 | Bạn cần xác minh danh tính trước khi nhận ca |
| `AGE_RESTRICTED` | 403 | Ca Nhanh chỉ nhận người làm từ 18 tuổi |
| `ACCOUNT_SUSPENDED` | 403 | Bạn đang bị tạm khóa nhận ca đến {suspended_until} |
| `BLOCKED_BY_SHOP` | 403 | Bạn không thể nhận ca của quán này |
| `FAVORITES_ONLY` | 403 | Ca đang ưu tiên người quen của quán đến {favorites_only_until} |
| `RATING_TOO_LOW` | 403 | Ca yêu cầu điểm đánh giá tối thiểu {min_rating} |
| `PROFILE_INCOMPLETE` | 422 | Hãy hoàn thiện hồ sơ trước |

#### `GET /bookings`
- Người làm: `?scope=upcoming|active|pending_approval|history` (mặc định `upcoming`).
- Chủ quán: `?shop_id=…&status=checked_out&date=2026-11-05` (bắt buộc `shop_id` thuộc mình).

Mỗi phần tử: booking + tóm tắt ca (tiêu đề, giờ, lương) + tóm tắt quán (người làm xem) hoặc người làm (quán xem).

#### `GET /bookings/{bookingId}`
Gồm: `booking`, `shift`, `shop`, `worker`, `timesheet` (`worked_minutes`, `wage_amount`, `fee_amount`, `adjustment_note`), `attendance` (5 lần quét gần nhất: `type`, `accepted`, `reject_code`, `distance_m`, `scanned_at`), `my_review_submitted`.

#### `GET /bookings/{bookingId}/cancel-preview` · `POST /bookings/{bookingId}/cancel`
```json
// GET cancel-preview của người làm → 200
{ "data": { "actor": "worker", "hours_before_start": 3.2, "penalty_points": 2, "current_points": 0,
            "threshold": 4, "will_be_suspended": false, "compensation": 0 } }
// GET cancel-preview của chủ quán → 200
{ "data": { "actor": "shop", "hours_before_start": 10.0, "penalty_points": 0, "compensation": 75000 } }

// POST cancel, request
{ "reason": "Bận đột xuất" }
// 200 → booking với status "cancelled", cancelled_by, penalty_points, compensation_amount
```
Lỗi: `409 TOO_LATE_TO_CANCEL`, `409 INVALID_STATE`, `422 INSUFFICIENT_BALANCE` (quán không đủ tiền bồi thường).

#### `POST /bookings/{bookingId}/check-in` · `POST /bookings/{bookingId}/check-out`
```json
// Request
{ "token": "v1.5a1d6c2e-8f43-4b7a-9c1e-2d3f4a5b6c7d.59795756.jyopG7svytG0nK-fCLBr7R",
  "lat": 21.03695, "lng": 105.78275, "accuracy_m": 12 }

// 200 check-in
{ "data": { "accepted": true, "distance_m": 23,
            "booking": { "id": "e7a8b9c0-…", "status": "checked_in", "check_in_at": "2026-11-05T09:58:00Z", "is_late": false } } }

// 200 check-out
{ "data": { "accepted": true, "distance_m": 18,
            "booking": { "id": "e7a8b9c0-…", "status": "checked_out", "worked_minutes": 300,
                         "wage_amount": 150000, "fee_amount": 30000 } } }

// 422 bị từ chối (lần quét vẫn được lưu vào attendance_events)
{ "error": { "code": "OUT_OF_GEOFENCE", "message": "Bạn đang ở ngoài khu vực quán (cách 1474 m)",
             "details": { "distance_m": 1474, "allowed_m": 160 } } }
```
Thứ tự kiểm tra: (1) API kiểm token: `QR_INVALID`, `QR_EXPIRED`; (2) CSDL: `WRONG_SHOP` → `INVALID_STATE` → `OUTSIDE_CHECKIN_WINDOW` (chỉ check-in) → `LOCATION_REQUIRED` → `OUT_OF_GEOFENCE`. Không có token thì trả `400 VALIDATION_ERROR`.

#### `POST /bookings/{bookingId}/approve` · Duyệt và quyết toán
```json
// Duyệt đúng giờ công đã ghi: body rỗng {}
// Điều chỉnh:
{ "worked_minutes": 320, "note": "Ở lại thêm 20 phút dọn quầy" }

// 200
{ "data": { "id": "e7a8b9c0-…", "status": "completed", "worked_minutes": 300, "wage_amount": 150000,
            "fee_amount": 30000, "approved_at": "2026-11-05T15:20:00Z", "settled_at": "2026-11-05T15:20:00Z" } }
```
Lỗi: `422 ADJUSTMENT_NOTE_REQUIRED`, `400 VALIDATION_ERROR` (`worked_minutes` ngoài 0–960), `409 INVALID_STATE` (chưa check-out hoặc đang khiếu nại), `409 ALREADY_SETTLED`, `422 INSUFFICIENT_BALANCE` (điều chỉnh tăng vượt tạm giữ và số dư).

#### `POST /bookings/{bookingId}/dispute`
```json
// Request
{ "reason_code": "wrong_hours", "description": "Em vào ca lúc 17:00 nhưng quét QR lỗi, đã làm đủ 5 tiếng" }
// 201
{ "data": { "id": "…", "booking_id": "e7a8b9c0-…", "status": "open", "prev_status": "checked_out" } }
```
`reason_code` ∈ `wrong_hours`, `no_show_claim`, `payment`, `behavior`, `other`. Lỗi: `409 DISPUTE_NOT_ALLOWED`.

#### `POST /bookings/{bookingId}/reviews`
```json
// Request
{ "stars": 5, "tags": ["on_time", "want_rebook"], "comment": "Nhanh nhẹn, lễ phép" }
// 201
{ "data": { "id": "…", "direction": "shop_to_worker", "stars": 5 } }
```
Thẻ gợi ý: quán đánh giá người làm `on_time`, `fast`, `polite`, `want_rebook`; người làm đánh giá quán `as_described`, `friendly`, `clear_guidance`, `paid_on_time`. Lỗi: `409 ALREADY_REVIEWED`, `409 REVIEW_WINDOW_CLOSED`, `409 INVALID_STATE`.

### 4.6 Lời mời

```json
// GET /invites?status=pending → 200
{ "data": [ { "id": "…", "status": "pending", "message": "Cuối tuần làm với quán nhé",
              "shift": { "id": "…", "title": "Pha chế cuối tuần", "start_at": "…", "hourly_rate": 32000 },
              "shop": { "id": "…", "name": "Cà phê Góc Phố" } } ], "meta": { "page": 1, "limit": 20, "total": 1 } }

// POST /invites/{inviteId}/accept → 201
{ "data": { "invite": { "id": "…", "status": "accepted" }, "booking": { "id": "…", "source": "invite", "status": "confirmed" } } }

// POST /invites/{inviteId}/decline → 200
{ "data": { "invite": { "id": "…", "status": "declined" } } }
```
Nhận lời mời dùng chung kiểm tra với nhận ca (trừ thời gian ưu tiên và điểm tối thiểu) nên có thể trả mọi lỗi của endpoint 29.

### 4.7 Ví và thanh toán

#### `GET /wallet` · `GET /wallet/transactions`
```json
// GET /wallet → 200
{ "data": { "type": "shop", "balance": 1640000, "held_balance": 360000,
            "recent_transactions": [
              { "id": 2, "type": "hold", "balance_delta": -360000, "held_delta": 360000,
                "balance_after": 1640000, "held_after": 360000, "ref_type": "shift", "ref_id": "b3f1c2d4-…",
                "note": "Tạm giữ chi phí ca: Pha chế ca tối", "created_at": "2026-11-04T08:10:00Z" }
            ] } }
// GET /wallet/transactions?type=hold,release&page=1&limit=20 → danh sách cùng cấu trúc
```

#### `POST /wallet/topups`
```http
POST /api/v1/wallet/topups
Idempotency-Key: 3f2b8c1e-6a4d-4e9b-9a51-0c7d2e8f1a6b
Content-Type: application/json

{ "amount": 2000000 }
```
```json
201 {
  "data": {
    "id": "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a", "kind": "topup", "amount": 2000000, "status": "pending",
    "reference_code": "CN7F3A9C21", "expires_at": "2026-11-04T08:25:00Z",
    "qr_image_url": "https://img.vietqr.io/image/970436-0011000000000-compact2.png?amount=2000000&addInfo=CN7F3A9C21&accountName=CA%20NHANH%20DEMO",
    "bank": { "bin": "970436", "account_no": "0011000000000", "account_name": "CA NHANH DEMO" },
    "transfer_note": "CN7F3A9C21"
  }
}
```
Lỗi: `400 IDEMPOTENCY_KEY_REQUIRED`, `422 AMOUNT_OUT_OF_RANGE` (ngoài 50.000–50.000.000), `403 FORBIDDEN` (không phải ví quán).

#### `GET /payment-orders/{orderId}` · `POST /payment-orders/{orderId}/simulate-paid`
`simulate-paid` (chỉ demo, không có body) gọi `fn_confirm_topup(reference_code, amount, 'vietqr_sim')`, giống webhook thật. Trả `200` với lệnh `succeeded`; gọi lại vẫn `200` (idempotent).

#### `POST /wallet/withdrawals`
```http
POST /api/v1/wallet/withdrawals
Idempotency-Key: 8a1c2e3f-4b5d-4c6e-9f70-81a2b3c4d5e6

{ "amount": 150000 }
```
```json
201 { "data": { "id": "…", "kind": "withdrawal", "amount": 150000, "status": "succeeded",
                "reference_code": "CNW4B7E2A90",
                "bank_snapshot": { "bank_bin": "970436", "account_no": "0011001234567", "account_name": "NGUYEN VAN MINH" },
                "completed_at": "2026-11-05T15:25:02Z" } }
```
Ở chế độ demo, API gọi tiếp `fn_complete_withdrawal(true)` trong cùng request (giao diện hiển thị hiệu ứng "đang chuyển" khoảng 2 giây). Khi tắt demo, lệnh ở `pending` cho tới khi admin xác nhận (endpoint 61). Lỗi: `400 IDEMPOTENCY_KEY_REQUIRED`, `422 BANK_ACCOUNT_MISSING`, `422 AMOUNT_OUT_OF_RANGE`, `422 INSUFFICIENT_BALANCE`.

### 4.8 Thông báo

```json
// GET /notifications?unread=true&page=1&limit=20 → 200
{ "data": [ { "id": 1281, "type": "booking.created", "title": "Nguyễn Văn Minh đã nhận ca",
              "body": "\"Pha chế ca tối\" 17:00 05/11 · 1/2 người.",
              "data": { "shift_id": "b3f1c2d4-…", "booking_id": "e7a8b9c0-…" },
              "read_at": null, "created_at": "2026-11-04T08:15:02Z" } ],
  "meta": { "page": 1, "limit": 20, "total": 3, "unread_count": 3 } }

// POST /notifications/read
{ "ids": [1281, 1282] }      // hoặc { "all": true }
// 200 → { "data": { "updated": 2 } }
```

### 4.9 Quản trị

#### `GET /admin/kpis?from=2026-10-05&to=2026-11-04`
```json
200 {
  "data": {
    "from": "2026-10-05", "to": "2026-11-04",
    "shifts_posted": 280, "seats_posted": 562, "seats_filled": 404, "fill_rate": 0.719,
    "bookings_completed": 375, "no_show_rate": 0.072, "median_minutes_to_fill": 86.0,
    "gmv": 65871600, "fee_revenue": 10978600, "boost_revenue": 0,
    "active_workers": 16, "active_shops": 2, "rebook_rate": 0.915,
    "daily": [
      { "day": "2026-10-05", "shifts_posted": 9, "seats_posted": 18, "seats_filled": 14, "fill_rate": 0.778,
        "median_minutes_to_fill": 74.5, "bookings_completed": 13, "no_shows": 1, "late_cancels": 0,
        "gmv": 2152800, "fee_revenue": 358800 }
    ]
  }
}
```
Số liệu ví dụ lấy từ một lần chạy thật của `fn_demo_reset(30)` với 2 quán, 16 người làm.

#### Các endpoint quản trị khác

| Endpoint | Body | Phản hồi, lỗi |
|---|---|---|
| `GET /admin/kyc?status=pending` | | Danh sách; mỗi ảnh có `signed_url` hết hạn sau 60 giây |
| `POST /admin/kyc/{submissionId}/review` | `{ "approve": false, "reason": "Ảnh mặt sau bị mờ" }` | `200` hồ sơ; `400 VALIDATION_ERROR` nếu từ chối mà thiếu lý do; `409 INVALID_STATE` |
| `GET /admin/shops?verification_status=pending` | | Danh sách quán |
| `POST /admin/shops/{shopId}/review` | `{ "approve": true }` | `200` quán; chủ quán được thông báo |
| `GET /admin/users?role=worker&q=minh&status=active` | | Danh sách, gồm `penalty_points`, `suspended_until` |
| `PATCH /admin/users/{userId}` | `{ "status": "locked" }` hoặc `{ "clear_suspension": true }` | `200` |
| `GET /admin/disputes?status=open` | | Danh sách kèm booking, log quét, mô tả |
| `POST /admin/disputes/{disputeId}/resolve` | `{ "accept": true, "resolution": "Camera quán xác nhận có mặt từ 17:00", "adjusted_minutes": 300 }` | `200` khiếu nại; `400 VALIDATION_ERROR` (chấp nhận khiếu nại vắng mặt mà thiếu `adjusted_minutes`) |
| `GET /admin/payment-orders?kind=withdrawal&status=pending` | | Danh sách lệnh |
| `POST /admin/payment-orders/{orderId}/complete` | `{ "success": false, "reason": "Sai số tài khoản" }` | `200`; thất bại thì tiền tự hoàn về ví |
| `GET /admin/settings` · `PATCH /admin/settings` | `{ "fee_rate": 0.18, "min_lead_minutes": 2 }` | `200`; mỗi khóa có schema riêng (ví dụ `fee_rate` 0–0,5); khóa lạ thì `400` |
| `POST /admin/demo/reset` | `{ "days": 60, "shop_balance": 2000000 }` | `200 { "history_shifts": 563, "shop_balance": 2000000 }` |
| `POST /admin/demo/fast-forward` | `{ "shift_id": "…", "to": "start" }` (`start` hoặc `end`) | `200` ca sau khi dịch thời gian |
| `POST /admin/demo/tick` | | `200 { "started": 1, "no_shows": 0, "auto_checkouts": 0, "auto_approved": 0, "completed": 0, "reminders": 0, "expired_payments": 0 }` |

---

## 5. Sự kiện thời gian thực

Client đăng ký bằng supabase-js (khóa publishable + phiên người dùng). Payload là bản ghi mới của bảng (`payload.new`) và đã được lọc theo RLS.

| Kênh | Bảng · sự kiện · bộ lọc | Ai nghe | Client làm gì |
|---|---|---|---|
| `notifications:{uid}` | `notifications` · INSERT · `user_id=eq.{uid}` | Mọi người dùng | Toast, tăng số trên chuông |
| `shop-bookings:{shopId}` | `bookings` · * · `shop_id=eq.{shopId}` | Dashboard và kiosk của quán | Cập nhật chỗ, trạng thái check-in, chờ duyệt |
| `my-bookings:{uid}` | `bookings` · UPDATE · `worker_id=eq.{uid}` | Người làm | Đổi trạng thái *Ca của tôi* |
| `shift-feed` | `shifts` · INSERT, UPDATE · không lọc | Trang khám phá ca | Lọc theo khoảng cách ở client, gắn nhãn *Mới*, làm mới query |
| `wallet:{uid}` | `wallets` · UPDATE · `owner_id=eq.{uid}` | Chủ ví | Cập nhật số dư |
| `payment-order:{id}` | `payment_orders` · UPDATE · `id=eq.{id}` | Màn hình nạp tiền | Đóng QR, báo thành công |

Ví dụ payload (`notifications` INSERT):
```json
{ "schema": "public", "table": "notifications", "eventType": "INSERT",
  "new": { "id": 1290, "user_id": "0f9e8d7c-…", "type": "earning.credited", "title": "+150.000đ đã vào ví",
           "body": "Ca \"Pha chế ca tối\": 300 phút làm việc.", "data": { "booking_id": "e7a8b9c0-…" },
           "read_at": null, "created_at": "2026-11-05T15:20:00Z" } }
```

---

## 6. Webhook thanh toán

`POST /api/v1/webhooks/payments`: điểm nhận báo có từ cổng thanh toán hoặc bộ giả lập. Mỗi cổng thật (payOS, SePay…) có định dạng riêng; adapter tương ứng chuyển về **định dạng nội bộ** dưới đây và kiểm chữ ký theo cách của cổng đó.

```http
POST /api/v1/webhooks/payments
Content-Type: application/json
X-CN-Timestamp: 1793755000
X-CN-Signature: sha256=5d1f0c9a…(hex)

{
  "event": "payment.received",
  "provider": "vietqr_sim",
  "provider_txn_id": "FT26308123456",
  "amount": 2000000,
  "description": "CN7F3A9C21 nap vi Ca Nhanh",
  "occurred_at": "2026-11-04T08:16:40+07:00"
}
```

**Xác thực**: `signature = HMAC_SHA256(PAYMENT_WEBHOOK_SECRET, X-CN-Timestamp + "." + raw_body)`, mã hex; so sánh hằng thời gian; từ chối nếu `|now − timestamp| > 300 giây`.

**Xử lý**: tách mã tham chiếu bằng regex `CN[0-9A-F]{8}` trong `description` (nội dung chuyển khoản có thể bị ngân hàng thêm chữ), rồi gọi `fn_confirm_topup(reference_code, amount, provider, provider_txn_id)`.

| Phản hồi | Khi nào |
|---|---|
| `200 { "received": true, "status": "credited" }` | Ghi có thành công |
| `200 { "received": true, "status": "duplicate" }` | Lệnh đã thành công trước đó (gửi lại) |
| `200 { "received": true, "status": "unmatched" }` | Không tìm thấy mã tham chiếu; ghi log cho admin xử lý tay (trả 200 để cổng không gửi lại mãi) |
| `401 INVALID_SIGNATURE` | Sai chữ ký hoặc timestamp quá hạn |

---

## 7. Đặc tả token QR chấm công

| Thành phần | Giá trị |
|---|---|
| Định dạng | `v1.<shop_id>.<window>.<sig>` |
| `window` | `floor(unix_seconds / 30)` (tham số `qr_rotation_seconds`) |
| `sig` | `base64url(HMAC_SHA256(QR_SIGNING_SECRET, "v1.<shop_id>.<window>"))`, lấy 22 ký tự đầu (132 bit) |
| Hợp lệ khi | Chữ ký đúng và `|window_hiện_tại − window| ≤ 1` (tuổi tối đa khoảng 60 giây) |
| Nội dung QR | URL `https://<app>/c/<token>`: quét bằng camera hệ thống thì mở trang `/c/[token]`; trang tìm booking hôm nay của người làm tại quán đó rồi tự gọi check-in hoặc check-out |
| Chống gian lận | Token hết hạn nhanh + geofence ở CSDL + log mọi lần quét (`attendance_events`) |

```ts
// lib/qr-token.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const ROTATION_SECONDS = 30;
const SECRET = process.env.QR_SIGNING_SECRET!;
const sign = (payload: string) =>
  createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 22);

export function issueCheckinToken(shopId: string, nowMs = Date.now()) {
  const window = Math.floor(nowMs / 1000 / ROTATION_SECONDS);
  const payload = `v1.${shopId}.${window}`;
  return {
    token: `${payload}.${sign(payload)}`,
    window,
    expiresAt: new Date((window + 1) * ROTATION_SECONDS * 1000),
  };
}

export function verifyCheckinToken(token: string, nowMs = Date.now()) {
  const m = /^v1\.([0-9a-f-]{36})\.(\d+)\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return { ok: false, code: 'QR_INVALID' } as const;
  const [, shopId, w, sig] = m;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(sign(`v1.${shopId}.${w}`))))
    return { ok: false, code: 'QR_INVALID' } as const;
  const current = Math.floor(nowMs / 1000 / ROTATION_SECONDS);
  if (Math.abs(current - Number(w)) > 1) return { ok: false, code: 'QR_EXPIRED' } as const;
  return { ok: true, shopId, window: Number(w) } as const;
}
```

Sau khi kiểm token, API gọi `fn_record_attendance(p_actor, p_booking_id, p_type, p_token_shop_id = shopId, p_token_window = window, p_lat, p_lng, p_accuracy_m)`.

---

## 8. URL ảnh VietQR

```ts
// lib/vietqr.ts — VietQR Quick Link: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
export function vietQrImageUrl(amount: number, transferNote: string) {
  const bin = process.env.PLATFORM_BANK_BIN!;          // ví dụ 970436
  const account = process.env.PLATFORM_BANK_ACCOUNT!;  // tối đa 19 ký tự
  const name = process.env.PLATFORM_BANK_NAME ?? '';
  return `https://img.vietqr.io/image/${bin}-${account}-compact2.png`
    + `?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(name)}`;
}
```
`compact2` là mẫu có sẵn (QR + logo + thông tin chuyển khoản). `accountName` chỉ để hiển thị trên ảnh, không thuộc chuẩn VietQR.

---

## 9. Danh mục mã lỗi

| Mã | HTTP | Thông điệp (tiếng Việt) | Nguồn |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ (`details` liệt kê từng trường) | Zod; CSDL |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Thiếu header Idempotency-Key | API |
| `UNAUTHENTICATED` | 401 | Vui lòng đăng nhập | API |
| `INVALID_SIGNATURE` | 401 | Chữ ký webhook không hợp lệ | API |
| `FORBIDDEN` | 403 | Bạn không có quyền thực hiện thao tác này | API, CSDL |
| `ACCOUNT_LOCKED` | 403 | Tài khoản đang bị khóa | CSDL |
| `DEMO_DISABLED` | 403 | Chỉ dùng được ở chế độ demo | API, CSDL |
| `AGE_RESTRICTED` | 403 | Ca Nhanh chỉ nhận người làm từ 18 tuổi | CSDL |
| `KYC_REQUIRED` | 403 | Bạn cần xác minh danh tính trước khi nhận ca | CSDL |
| `ACCOUNT_SUSPENDED` | 403 | Bạn đang bị tạm khóa nhận ca đến {thời điểm} | CSDL |
| `BLOCKED_BY_SHOP` | 403 | Bạn không thể nhận ca của quán này | CSDL |
| `FAVORITES_ONLY` | 403 | Ca đang ưu tiên người quen của quán đến {giờ} | CSDL |
| `RATING_TOO_LOW` | 403 | Ca yêu cầu điểm đánh giá tối thiểu {x} | CSDL |
| `SHOP_NOT_VERIFIED` | 403 | Quán đang chờ duyệt, chưa đăng ca được | CSDL |
| `SHOP_INACTIVE` | 403 | Quán đang tạm ngưng | CSDL |
| `NOT_FOUND` | 404 | Không tìm thấy | API, CSDL |
| `PAYMENT_NOT_FOUND` | 404 | Không tìm thấy lệnh thanh toán | CSDL |
| `SHIFT_FULL` | 409 | Ca vừa đủ người | CSDL |
| `SHIFT_NOT_OPEN` | 409 | Ca không còn nhận người | CSDL |
| `ALREADY_BOOKED` | 409 | Bạn đã nhận ca này rồi | CSDL |
| `BOOKING_OVERLAP` | 409 | Bạn đã có ca trùng giờ | CSDL |
| `TOO_LATE_TO_CANCEL` | 409 | Ca đã bắt đầu, không thể hủy | CSDL |
| `INVALID_STATE` | 409 | Trạng thái hiện tại không cho phép thao tác này | CSDL |
| `ROLE_LOCKED` | 409 | Không thể đổi vai trò sau khi đã hoàn tất đăng ký | CSDL |
| `KYC_PENDING` | 409 | Hồ sơ xác minh đang chờ duyệt | CSDL |
| `ALREADY_SETTLED` | 409 | Ca này đã được quyết toán | CSDL |
| `DISPUTE_NOT_ALLOWED` | 409 | Không thể khiếu nại ở trạng thái này | CSDL |
| `ALREADY_REVIEWED` | 409 | Bạn đã đánh giá ca này | CSDL |
| `REVIEW_WINDOW_CLOSED` | 409 | Đã quá 7 ngày, không thể đánh giá | CSDL |
| `PROFILE_INCOMPLETE` | 422 | Hãy hoàn thiện hồ sơ trước | CSDL |
| `FIELD_NOT_EDITABLE` | 422 | Không sửa giờ và lương sau khi đăng ca. Hãy hủy và đăng lại | API |
| `RATE_BELOW_MINIMUM` | 422 | Lương tối thiểu là 25.500đ/giờ | CSDL |
| `INVALID_TIME_RANGE` | 422 | Thời gian ca không hợp lệ (tối đa 12 giờ, trong 30 ngày tới) | CSDL |
| `LEAD_TIME_TOO_SHORT` | 422 | Ca phải bắt đầu sau ít nhất {n} phút | CSDL |
| `INVALID_HEADCOUNT` | 422 | Số người không hợp lệ | CSDL |
| `INSUFFICIENT_BALANCE` | 422 | Số dư không đủ (`details.shortfall`) | CSDL |
| `AMOUNT_OUT_OF_RANGE` | 422 | Số tiền không hợp lệ | CSDL |
| `BANK_ACCOUNT_MISSING` | 422 | Hãy thêm tài khoản ngân hàng nhận tiền | CSDL |
| `ADJUSTMENT_NOTE_REQUIRED` | 422 | Nhập lý do điều chỉnh (tối thiểu 5 ký tự) | CSDL |
| `QR_INVALID` | 422 | Mã QR không hợp lệ | API |
| `QR_EXPIRED` | 422 | Mã QR đã hết hạn, hãy quét mã mới trên màn hình quán | API |
| `WRONG_SHOP` | 422 | Mã QR không thuộc quán của ca này | CSDL (log) |
| `OUTSIDE_CHECKIN_WINDOW` | 422 | Chưa tới giờ check-in (mở trước giờ bắt đầu 30 phút) | CSDL (log) |
| `LOCATION_REQUIRED` | 422 | Hãy bật định vị để chấm công | CSDL (log) |
| `OUT_OF_GEOFENCE` | 422 | Bạn đang ở ngoài khu vực quán (cách {d} m) | CSDL (log) |
| `RATE_LIMITED` | 429 | Thao tác quá nhanh, thử lại sau ít giây | API |
| `INTERNAL_ERROR` | 500 | Có lỗi xảy ra, vui lòng thử lại | API |

---

## 10. Mẫu cài đặt Route Handler

Mọi endpoint theo cùng một khuôn: **xác thực → kiểm tra đầu vào → gọi một hàm CSDL → ánh xạ lỗi**.

```ts
// lib/errors.ts
export const ERRORS = {
  VALIDATION_ERROR: [400, 'Dữ liệu không hợp lệ'],
  UNAUTHENTICATED: [401, 'Vui lòng đăng nhập'],
  FORBIDDEN: [403, 'Bạn không có quyền thực hiện thao tác này'],
  NOT_FOUND: [404, 'Không tìm thấy'],
  SHIFT_FULL: [409, 'Ca vừa đủ người'],
  BOOKING_OVERLAP: [409, 'Bạn đã có ca trùng giờ'],
  INSUFFICIENT_BALANCE: [422, 'Số dư không đủ'],
  // … đủ các mã ở §9
  INTERNAL_ERROR: [500, 'Có lỗi xảy ra, vui lòng thử lại'],
} as const satisfies Record<string, readonly [number, string]>;
export type ErrorCode = keyof typeof ERRORS;

export class ApiError extends Error {
  constructor(public code: ErrorCode, public details?: unknown) { super(code); }
}

// Hàm fn_* dùng RAISE EXCEPTION '<MÃ>' (SQLSTATE P0001) nên message chính là mã lỗi
export function fromPostgrest(e: { code?: string; message: string }): ApiError {
  if (e.code === 'P0001' && e.message in ERRORS) return new ApiError(e.message as ErrorCode);
  if (['22P02', '23503', '23514'].includes(e.code ?? '')) return new ApiError('VALIDATION_ERROR');
  return new ApiError('INTERNAL_ERROR');
}
```

```ts
// app/api/v1/shifts/[shiftId]/bookings/route.ts
import { z } from 'zod';
import { handle, requireUser } from '@/lib/api';
import { adminClient } from '@/lib/supabase/admin';
import { fromPostgrest } from '@/lib/errors';

export const POST = (req: Request, ctx: { params: Promise<{ shiftId: string }> }) =>
  handle(async () => {
    const user = await requireUser(req, { role: 'worker' });             // cookie hoặc Bearer; 401/403
    const { shiftId } = z.object({ shiftId: z.string().uuid() }).parse(await ctx.params);
    const { data, error } = await adminClient()                          // secret key, chỉ ở server
      .rpc('fn_book_shift', { p_actor: user.id, p_shift_id: shiftId });
    if (error) throw fromPostgrest(error);
    return Response.json({ data }, { status: 201 });
  });
```

`handle()` bắt `ZodError` → `400 VALIDATION_ERROR` (kèm danh sách trường), `ApiError` → mã HTTP tương ứng, lỗi khác → `500` và ghi log kèm `request_id`.

---

## 11. Thử nhanh bằng curl

```bash
API=https://ca-nhanh.vercel.app/api/v1
SB=https://<ref>.supabase.co; KEY=<publishable-key>

# 1. Lấy access token của chủ quán demo (Supabase Auth REST)
TOKEN=$(curl -s "$SB/auth/v1/token?grant_type=password" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"email":"lan@demo.vn","password":"<mật khẩu demo>"}' | jq -r .access_token)

# 2. Ước tính rồi đăng ca
curl -s -X POST "$API/shifts" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "shop_id":"<shop-id>","position_code":"barista","title":"Pha chế ca tối",
  "start_at":"2026-11-05T17:00:00+07:00","end_at":"2026-11-05T22:00:00+07:00",
  "hourly_rate":30000,"headcount":2}' | jq .

# 3. Nạp ví và giả lập ngân hàng báo có
ORDER=$(curl -s -X POST "$API/wallet/topups" -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" -H "Content-Type: application/json" -d '{"amount":2000000}' | jq -r .data.id)
curl -s -X POST "$API/payment-orders/$ORDER/simulate-paid" -H "Authorization: Bearer $TOKEN" | jq .data.status
```

> Có thể sinh OpenAPI 3.1 từ chính các Zod schema (thư viện `zod-to-openapi`) để có Swagger UI tại `/api/docs`. Đây là mục Should, không bắt buộc cho demo.
