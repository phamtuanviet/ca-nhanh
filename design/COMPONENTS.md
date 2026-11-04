# Component của Ca Nhanh

Đặc tả 12 component của hệ thiết kế: khi nào dùng, props, trạng thái, quy tắc. Đây là bản chép từ artifact [Hệ thiết kế Ca Nhanh](https://claude.ai/artifact/4uG7edwcZRAKQcbZptsw62), nơi có bản xem trước chạy được của từng component.

- **Props**: [`components.d.ts`](components.d.ts) (kiểu TypeScript, dùng làm hợp đồng khi port sang React).
- **CSS**: lớp `cn-*` trong [`components.css`](components.css); hàm chuyển động trong [`motion/ca-nhanh-motion.js`](motion/ca-nhanh-motion.js).
- **Khi port sang React** (task P1-16 trong [kế hoạch](../docs/07-Implementation-Plan.md)): đặt ở `components/cn/`, giữ nguyên tên lớp và tên props; sửa ở đây thì cập nhật cả artifact.

| Component | Dùng ở |
|---|---|
| [Button](#button) | Mọi màn hình |
| [Badge](#badge) | Vé ca, chi tiết ca |
| [LivePulse](#livepulse) | Khám phá ca, kiosk |
| [ShiftTicket](#shiftticket) | Khám phá ca, Ca của tôi |
| [SeatSlots](#seatslots) | Vé ca, chi tiết ca (cả hai phía) |
| [Stamp](#stamp) | Nhận ca, ca đủ người, đã ký quỹ, vắng mặt |
| [Countdown](#countdown) | Ca của tôi, chi tiết ca |
| [QrKiosk](#qrkiosk) | Kiosk QR của quán |
| [WalletOdometer](#walletodometer) | Ví |
| [ShiftFeed](#shiftfeed) | Bảng tin ca mới trên Khám phá ca |
| [EmptyState](#emptystate) | Mọi danh sách rỗng, onboarding |
| [Skeleton](#skeleton) | Trạng thái đang tải |

---

## Button

Nút cho một hành động rõ ràng, nhãn là động từ và giữ nguyên tên suốt luồng.

### Khi dùng
- `primary` (mặc định): hành động chính, mỗi màn hình đúng một nút ("Nhận ca", "Duyệt giờ công").
- `spark`: việc gấp hoặc tốn phí ("Đẩy ca gấp · 20.000đ"), tối đa một nút mỗi màn hình.
- `ghost`: hành động phụ ("Xem chi tiết ca", "Rút về ngân hàng").
- `danger`: hủy ca, khóa tài khoản. Luôn có bước xác nhận ghi rõ hậu quả ("Hủy bây giờ sẽ bị cộng 2 điểm phạt").

### Truyền vào
`variant`, `size` (`lg` cho thanh hành động dưới cùng trên điện thoại), `block`, `busy`, `disabled`, `icon` (tên Lucide), nhãn (xem `ButtonProps`).

### Quy tắc
- Nhãn tối đa 4 từ, động từ đứng đầu; thông báo kết quả dùng lại động từ đó ("Nhận ca" → "Đã nhận ca").
- Không đặt hai nút `primary` cạnh nhau; nút thứ hai là `ghost`.
- Nút vô hiệu luôn kèm lý do bằng chữ ở gần ("Ca đã đủ người").

### Trạng thái và chuyển động
Nhấn: co `scale(0.97)` trong `--cn-dur-press`. Đang xử lý: `aria-busy="true"` (spinner, nhãn vẫn được trình đọc màn hình đọc). Focus: viền 2px `focus-ring`, cách 2px. Cao tối thiểu 44px.

### Trong Next.js
Dùng thẳng lớp `cn-btn cn-btn--spark`, hoặc thêm các biến thể này vào `buttonVariants` của shadcn/ui.

---

## Badge

Nhãn trạng thái ngắn, luôn có chữ, có icon khi trạng thái nói về an toàn hoặc độ gấp.

### Các tông
| Tông | Ví dụ | Điều kiện hiển thị |
|---|---|---|
| `deposit` | Đã ký quỹ (`shield-check`) | Ca có `hold_amount > 0` |
| `urgent` | Ca gấp (`zap`) | `is_urgent = true` |
| `new` | Mới | Ca đăng dưới 10 phút, chỉ trong bảng tin |
| `info` | Ưu tiên người quen đến 17:30 (`clock`) | `favorites_only_until` còn hiệu lực |
| `warn` | Còn 1 chỗ, Sắp tới giờ | Còn 1 chỗ, hoặc dưới 15 phút |
| `danger` | Vắng mặt, Tạm khóa nhận ca | `no_show`, `suspended_until` |
| (mặc định) | Đã duyệt giờ công | Trạng thái trung tính |

### Quy tắc
- Tối đa 2 badge trên một vé, theo thứ tự `urgent` → `deposit` → còn lại.
- Badge không bấm được. Cái gì bấm được thì là Button.
- Không dùng màu làm tín hiệu duy nhất: chữ luôn nói rõ trạng thái.

---

## LivePulse

Chấm nhịp đập báo dữ liệu trên màn hình đang được cập nhật trực tiếp.

### Khi dùng
Một chấm duy nhất mỗi màn hình: đầu trang Khám phá ca ("Đang tuyển · 12 ca gần bạn") và kiosk ("Kiosk đang mở"). Đây là một trong hai chuyển động được tự chạy, vì nó mang thông tin.

### Truyền vào
`label` (xem `LivePulseProps`).

### Quy tắc
- Khi kênh Realtime mất kết nối, bỏ chấm và hiện chữ "Mất kết nối, đang thử lại" bằng `text-muted`.
- Màu `live` (Ngọc), đạt 3:1 trên `surface` và `bg` ở cả hai theme.
- Giảm chuyển động: chấm đứng yên.

---

## ShiftTicket

Vé ca là đơn vị trung tâm của Ca Nhanh: một ca, giờ và tiền nằm trên cùng một tấm vé.

### Cấu tạo
- **Phần chính**: quán (ảnh 28px, tên, điểm), tên ca (`h3`), giờ (`numeral`), ngày, khoảng cách, SeatSlots và tối đa 2 Badge.
- **Đường đục lỗ** `perforation`, hai khía tròn bán kính `space-3` ở hai đầu.
- **Cuống** rộng 136px: "Thu nhập", số tiền `display-md` màu `money`, giá giờ.

### Truyền vào
`ShiftTicketProps`: `estEarning` lấy `est_wage_per_seat` từ `GET /shifts`, `deposited` khi `hold_amount > 0`, `state` là `open` | `full` | `booked`.

### Trạng thái
- `cn-ticket--urgent`: cuống nền `spark-soft` và badge Ca gấp.
- `cn-ticket--full`: phần chính mờ đi và Stamp "Đủ người".
- Đã nhận: Stamp "Đã nhận".

### Tương tác
Cả vé là một liên kết mở chi tiết ca: `<a>` hoặc `role="button"`, nhận Enter và Space. Hover nhấc 3px (chỉ trên thiết bị có chuột). Trong preview, bấm vé đầu tiên để xem lấp chỗ và đóng dấu.

### Quy tắc
- Thu nhập viết đủ "150.000đ" trên vé; chỉ bảng tin chật mới viết "150K".
- Không đặt nút "Nhận ca" trong vé ở danh sách. Nhận ca ở trang chi tiết để tránh bấm nhầm khi cuộn.
- Không xếp chồng vé; giữa các vé cách `space-6`.

### Trong Next.js
`<article className="cn-ticket">` bọc trong `div.cn-ticket-wrap` (đổ bóng bằng `drop-shadow` để giữ khía). Đặt `viewTransitionName: shift-{id}` để vé biến thành phần đầu trang chi tiết.

---

## SeatSlots

Dãy chỗ của một ca: mỗi chỗ là một avatar hoặc một vòng nét đứt, kèm số đếm.

### Truyền vào
`headcount`, `filled` (avatar, tên), `animateLast` (xem `SeatSlotsProps`).

### Realtime
Khi có `bookings` INSERT cho ca đang xem, gọi `CaNhanh.fillSeat(container, avatarUrl, name)`. Trong React, gắn lớp `cn-seat--pop` cho chỗ mới nhất. Hàm trả `true` khi ca vừa đủ người, lúc đó đổi vé sang trạng thái full.

### Quy tắc
- Hiện tối đa 6 avatar, nhiều hơn thì thêm "+3".
- Số đếm "2/3" luôn hiện, người dùng không phải tự đếm avatar.
- Avatar có `alt` là tên; chỗ trống là vòng nét đứt `border-strong`.
- Giảm chuyển động: avatar hiện ngay.

---

## Stamp

Con dấu xác nhận một trạng thái đã chốt và không quay lại được.

### Các con dấu
"Đã nhận" và "Đủ người" (mặc định, màu `primary`), "Đã ký quỹ" (`cn-stamp--money`), "Vắng mặt" (`cn-stamp--danger`). Chữ in hoa và nghiêng −8° là ngôn ngữ của con dấu giấy, chỉ dùng ở đây.

### Quy tắc
- Một vé có tối đa một con dấu.
- Hiệu ứng đóng dấu (`cn-stamp--in`, 440ms) chạy đúng một lần lúc trạng thái đổi, không chạy lại khi cuộn hay mở lại trang.
- `role="status"` để trình đọc màn hình đọc trạng thái mới.
- Giảm chuyển động: dấu hiện ngay ở trạng thái cuối.

---

## Countdown

Đếm ngược tới giờ vào ca, đổi sang màu nghệ khi còn dưới 15 phút.

### Truyền vào
`target` (`start_at`), `label`, `doneLabel` (xem `CountdownProps`).

### Trạng thái
Còn xa: `primary-soft`. Dưới 15 phút: `spark-soft`. Đã tới giờ: `spark`, nhãn "Đến giờ vào ca", đặt nút "Quét QR vào ca" ngay cạnh.

### Quy tắc
- Tính theo giờ server: lấy độ lệch từ header `Date` của API nếu đồng hồ máy sai.
- Chỉ đổi số mỗi giây, không thêm hiệu ứng cho từng giây. Chữ số dùng `numeral` với tabular-nums nên không xô lệch.

---

## QrKiosk

Màn hình QR chấm công trên tablet của quán: mã đổi mỗi 30 giây, vòng nghệ cho biết còn bao lâu.

### Truyền vào
`QrKioskProps`: `token` lấy từ `GET /shops/{id}/checkin-token` (dạng `v1.<shop_id>.<window>.<sig>`), `seconds` = 30, `checkedInToday`.

### Cài đặt
- QR thật dùng gói `qrcode` (`QRCode.toString(qr_payload, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })`). Preview dùng `CaNhanh.fakeQr`, không quét được.
- Gọi lại API khi qua `expires_at`; vòng `cn-kiosk__progress` cạn theo thời gian còn lại; QR lật khi đổi mã.
- Giữ màn hình sáng bằng Wake Lock API, chấp nhận khi bị từ chối.

### Quy tắc
- QR luôn nằm trên nền `#FFFFFF` ở cả hai theme để camera đọc được, cạnh tối thiểu 240px.
- Trên kiosk chỉ có tên quán, QR, số giây còn lại và người đã đến hôm nay. Chữ tối thiểu 14px, đọc được từ 1 m.

---

## WalletOdometer

Số dư ví lăn từng chữ số khi tiền về, kèm "+số tiền" bay lên và pháo giấy cho lần nhận tiền đầu tiên.

### Truyền vào
`balance`, `lastCredit`, `celebrate` (xem `WalletOdometerProps`).

### Kích hoạt
Realtime `wallets` UPDATE (số dư tăng) hoặc phản hồi `POST /bookings/{id}/approve`. Gọi `CaNhanh.odometer(el, balance)`, `CaNhanh.gain(host, el, amount)` và `CaNhanh.confetti(host)` nếu là lần đầu.

### Quy tắc
- Vùng chứa có `aria-live="polite"`; số dư có `aria-label` đủ số tiền ("510.000đ"). Hàm `odometer` tự đặt nhãn này.
- Pháo giấy tối đa một lần mỗi phiên, chỉ khi tiền vào. Khi tiền ra (rút, hoàn), số lăn nhưng không có "+" và không pháo giấy.
- Giảm chuyển động: số đổi ngay, không pháo giấy.

### Trong Next.js
Dùng odometer CSS này, hoặc `@number-flow/react` (6,1 KB): `<NumberFlow value={balance} locales="vi-VN" suffix="đ" />`.

---

## ShiftFeed

Bảng tin ca đang tuyển: ca mới chèn lên đầu trong vòng 2 giây, các ca cũ trượt xuống.

### Truyền vào
`items`, `max` (xem `ShiftFeedProps`).

### Realtime
Kênh `shift-feed` (`shifts` INSERT và UPDATE), lọc theo khoảng cách ở client rồi gọi `CaNhanh.pushShift(list, item)`. Ca chuyển sang full thì rời bảng tin bằng hiệu ứng mờ, không trượt.

### Quy tắc
- Gom sự kiện dồn dập: mỗi 3 giây chỉ làm nổi tối đa một ca mới.
- Không tự cuộn trang khi người dùng đang đọc; danh sách có `aria-live="polite"`.
- Giảm chuyển động: chèn ngay, không viền sáng.

### Trong Next.js
Dùng `AnimatePresence` với `layout` của Motion (qua `LazyMotion`), hoặc `@formkit/auto-animate` (3,1 KB) cho phần trượt.

---

## EmptyState

Màn hình rỗng có minh họa, một câu nói rõ tình huống và đúng một hành động tiếp theo.

### Truyền vào
`illustration` (một trong 6 file nhóm Illustrations), `title`, `text`, `action` (xem `EmptyStateProps`).

### Mẫu câu
| Màn hình | Tiêu đề | Hành động |
|---|---|---|
| Khám phá ca | Chưa có ca nào trong 5 km | Tìm trong 10 km |
| Ca của tôi | Bạn chưa nhận ca nào | Xem ca gần bạn |
| Ví | Chưa có tiền trong ví | Xem ca gần bạn |
| Quán mới | Tạo quán để đăng ca đầu tiên | Tạo quán |

### Quy tắc
- Tiêu đề nói điều đang xảy ra, không dùng câu cảm thán. Mô tả tối đa 2 câu.
- Chèn minh họa trực tiếp với lớp `cn-il` để màu đổi theo theme.

---

## Skeleton

Khung chờ có cùng hình dạng với nội dung thật, hiện khi dữ liệu tải lâu hơn 300 ms.

### Truyền vào
`shape` là `ticket`, `feed-item` hoặc `lines` (xem `SkeletonProps`).

### Quy tắc
- Dựng đúng bố cục sắp hiện (vé có cuống, dòng bảng tin), tối đa 6 khung.
- Vùng chứa có `aria-busy="true"` và nhãn "Đang tải danh sách ca".
- Dưới 300 ms thì không hiện skeleton, tránh nháy.
- Giảm chuyển động: khung tĩnh, không shimmer.
