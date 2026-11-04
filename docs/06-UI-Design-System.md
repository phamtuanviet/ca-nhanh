# Giao diện, hình ảnh và công cụ — Ca Nhanh

| Mục | Nội dung |
|---|---|
| Phiên bản | 1.0 · 04/11/2026 |
| Hệ thiết kế (xem trực tiếp) | **Hệ thiết kế Ca Nhanh**: https://claude.ai/artifact/4uG7edwcZRAKQcbZptsw62 (đang ở chế độ riêng tư; mở Share để chia sẻ cho nhóm) |
| Code và asset | [`design/`](../design/): `theme.css`, `components.css`, `motion/`, `assets/` |
| Dựa trên | [01-SRS](01-SRS.md) (NFR-USA, NFR-PERF) · [03-HLD](03-System-Architecture-HLD.md) (Next.js, shadcn/ui, Leaflet) |

---

## 1. Tóm tắt quyết định

| Hạng mục | Quyết định |
|---|---|
| Màu chủ đạo | **Lam Ca** `#2D58F2` (tin cậy, nhanh) + **Nghệ** `#FFAB41` (tia chớp, ca gấp) + **Ngọc** `#066A48` (tiền về). Son cho lỗi, Mực cho chữ và nền. Kế thừa cặp xanh–hổ phách của slide Ca Nhanh, đẩy lên sắc độ hiện đại hơn |
| Chữ | **Be Vietnam Pro** cho giao diện, **Big Shoulders Display** cho con số và khẩu hiệu ngắn |
| Điểm nhấn riêng | **Vé ca**: tấm vé có khía và đường đục lỗ. Có mặt ở logo, thẻ ca, trang bìa, ảnh chia sẻ. Không đối thủ nào dùng |
| Chuyển động | 10 khoảnh khắc gắn với hành động thật; làm bằng CSS trước; toàn bộ CSS + JS của hệ thiết kế 6,5 KB gzip |
| Hình ảnh | 8 ảnh Unsplash đã kiểm giấy phép, 6 minh họa tự vẽ, 16 avatar CC0, bộ logo / icon PWA / favicon / ảnh OG |
| Công cụ | 5 agent skill và 1 MCP nên cài (§8), kèm các cảnh báo bảo mật |

---

## 2. Tham khảo các website cùng loại

Tôi chụp và phân tích trang chủ của các sàn ghép ca. Ảnh chụp chỉ dùng để phân tích và không lưu vào repo, vì thuộc bản quyền của các trang đó.

| Website | Điểm hay | Ca Nhanh mượn | Ca Nhanh làm khác |
|---|---|---|---|
| [Instawork](https://www.instawork.com/) (Mỹ) | Hero là chính giao diện sản phẩm: thẻ người làm có điểm 4.8, 94 ca, 97% đúng giờ, chứng chỉ, "Favorited by 4 businesses" | Đưa số liệu tin cậy (điểm, số ca, đúng giờ) lên ngay hero và hồ sơ năng lực | Không tô màu riêng một chữ trong tiêu đề (kiểu "reinvented" in nghiêng đỏ) vì đó là dấu hiệu thiết kế rập khuôn |
| [Wonolo](https://www.wonolo.com/) (Mỹ) | Khối màu vàng thương hiệu mạnh; nút viên thuốc đen; hai lối vào "I'm a Business" / "I'm a Worker" | Hai lối vào cho hai phía của sàn: "Tôi cần người" / "Tôi muốn làm ca" | Không chọn vàng làm màu chủ đạo: Wonolo, be và Timee đều đã dùng vàng |
| [Indeed Flex](https://indeedflex.com/) (Mỹ, Anh) | Hero xen thẻ việc và thẻ người làm có ảnh và điểm; menu tách *Job Seekers* / *Employers* | Thẻ ca có ảnh quán, điểm và thu nhập | Tránh màu hồng tím (Indeed Flex, MoMo) |
| [be](https://be.com.vn/) (Việt Nam) | Màu rực, ảnh món ăn 3D, banner khuyến mãi dày đặc: đúng thói quen thị giác của người dùng Việt | Ảnh đồ uống, món ăn thật để gợi cảm giác F&B | Giao diện bình tĩnh hơn, lấy sản phẩm làm trung tâm thay vì banner |
| Timee (Nhật) và Qwick (Mỹ) | Không chụp được (trang chặn trình duyệt tự động). Theo nguồn đọc được: Qwick đã mua Gigpro và chuyển từ bảng tin việc sang đề xuất ca bằng AI | "Gợi ý cho bạn" bằng điểm phù hợp (BR-20) | Ca Nhanh vẫn giữ quyền chọn của người làm: danh sách và bản đồ |

**Rút ra**
- Ba mẫu nên theo: *hero là sản phẩm* (vé ca thật thay cho ảnh minh họa chung chung), *hai lối vào cho hai phía*, *số liệu tin cậy hiển thị sẵn*.
- Ba điều nên tránh: màu vàng (đã đông đúc trong ngành), ảnh người cười vào máy ảnh, banner khuyến mãi chồng chất.

---

## 3. Bảng màu

**Cách chọn**
- Giữ liên kết với slide: phần Ca Nhanh trong slide dùng xanh `#2E5E9E` và hổ phách `#E3A83B`. App dùng cùng họ màu nhưng tươi hơn, để hội đồng thấy một thương hiệu xuyên suốt từ slide đến demo.
- Màu có nghĩa trong chính sản phẩm. Lam là độ tin cậy và hành động chính. Nghệ (màu củ nghệ, cà phê rang) là sự khẩn trương và tia chớp. Ngọc là tiền, vì tiền là lời hứa trung tâm ("không lo bị quỵt").
- Tránh màu của đối thủ và màu "AI hay chọn": vàng (Wonolo, be, Timee), xanh lá làm màu chính (Grab, TopCV), hồng tím (MoMo, Indeed Flex); nền kem + chữ có chân + điểm nhấn đất nung; gradient tím xanh.

**Phương pháp**: dựng 5 thang màu × 11 bậc trong không gian **OKLCH** (độ sáng đều theo cảm nhận), giảm chroma cho tới khi vừa gam sRGB, rồi kiểm tra tương phản WCAG từng cặp chữ/nền thực tế sẽ dùng ở **cả hai theme**. Kết quả: **0 cặp không đạt**. Lần kiểm đầu có 1 cặp trượt (chữ phụ trên nền ô nhập, 4,42:1), đã sửa bằng cách đổi `surface-sunken` thành `#EEF2F8`.

| Token chính | Sáng | Tối | Dùng cho | Tương phản tiêu biểu |
|---|---|---|---|---|
| `primary` (Lam Ca) | `#2D58F2` | `#789FFE` | Nút chính, liên kết | chữ trên nút 5,54:1 (sáng) · 7,74:1 (tối) |
| `spark` (Nghệ) | `#FFAB41` | `#FFAB41` | Ca gấp, vòng QR, nhãn Mới | chữ mực trên nghệ 10,54:1 |
| `money` (Ngọc) | `#066A48` | `#2FBE87` | Thu nhập, "+150.000đ" | trên `bg`: 6,19:1 · 7,92:1 |
| `danger` (Son) | `#C62328` | `#FE6F66` | Lỗi, vắng mặt, hủy | trên `bg`: 5,33:1 · 6,89:1 |
| `text` (Mực) | `#151B2A` | `#F4F7FD` | Chữ chính | trên `bg`: 16,01:1 · 17,55:1 |
| `bg` | `#F4F7FD` | `#0A1121` | Nền trang (trung tính ngả lam, không xám chết) | |

Toàn bộ 87 token và quy tắc dùng ở trang hệ thiết kế; bản cho code ở `design/theme.css`, đã ánh xạ sẵn sang biến của shadcn/ui. Màu nghệ đặt tên là `spark` để không đụng biến `--accent` (nền hover) của shadcn.

---

## 4. Chữ

- **Be Vietnam Pro** do nhóm thiết kế người Việt làm riêng cho tiếng Việt: dấu chồng (Ằ, Ẫ, Ự) đặt đúng, đọc tốt ở cỡ nhỏ trên điện thoại. Font của slide cũng là font này.
- **Big Shoulders Display** là chữ hẹp, đậm, gợi số trên vé và bảng giờ tàu. Chỉ dùng cho con số (tiền, giờ, số chỗ) và khẩu hiệu dưới 6 chữ. Chữ hẹp giúp "150.000đ" vừa cuống vé rộng 136px.
- Đã kiểm 12 font ứng viên trên Google Fonts; cả 12 có bộ ký tự tiếng Việt. `next/font` chỉ tải phần `vietnamese` + `latin`.

---

## 5. Điểm nhấn riêng: vé ca

- Logo là tấm vé có khía hai bên và tia chớp. Thẻ ca là tấm vé thật: phần chính bên trái, đường đục lỗ có hai khía, cuống bên phải ghi thu nhập bằng chữ số lớn.
- Tương tác mang ngôn ngữ của vé: nhận ca thì **đóng dấu "Đã nhận"**, ca đủ người thì đóng dấu **"Đủ người"**, chỗ trống được lấp bằng avatar nảy vào.
- Mọi thứ còn lại giữ yên tĩnh (nền trung tính, bóng nhẹ nhuốm lam, bo góc theo vai trò), để vé là thứ duy nhất người xem nhớ.

---

## 6. Chuyển động và hiệu ứng

| Khoảnh khắc | Hiệu ứng | Thời lượng | Có trong hệ thiết kế |
|---|---|---|---|
| Ca mới xuất hiện realtime | Trượt vào đầu bảng tin, viền nghệ mờ dần, thẻ cũ trượt xuống | 320ms + 1,6s | ShiftFeed |
| Có người nhận ca | Avatar nảy vào chỗ, vòng lan; "2/3" → "3/3" | 520ms | SeatSlots |
| Nhận ca, ca đủ người | Con dấu đóng xuống vé | 440ms | Stamp, ShiftTicket |
| QR đổi mã mỗi 30 giây | Vòng nghệ cạn dần, QR lật ngang | 30s, lật 480ms | QrKiosk |
| Tiền về ví | Số dư lăn từng chữ số, "+150.000đ" bay lên, pháo giấy cho lần đầu | 700ms, 1,1s, 1,3s | WalletOdometer |
| Sắp tới giờ ca | Chip đếm ngược đổi sang nghệ | 240ms | Countdown |
| Vào ca hợp lệ | Dấu check vẽ ra, rung 30ms trên Android | 400ms | (trong app) |
| Mở chi tiết ca | Vé biến thành phần đầu trang (View Transitions) | 320ms | (trong app) |
| Nhấn nút | Co 0,97 | 90ms | Button |
| Đang tải | Skeleton cùng hình dạng | 1,4s lặp | Skeleton |

**Năm khoảnh khắc nên trình diễn trước hội đồng** (khớp kịch bản ở [02 §8](02-Use-Cases-User-Stories.md)): ca hiện trên điện thoại ngay khi quán đăng; hai người tranh chỗ cuối (một người được avatar nảy vào, người kia thấy con dấu "Đủ người"); vòng QR lật mã; số dư lăn kèm pháo giấy; con dấu "Đã nhận".

**Nguyên tắc** (theo skill `frontend-design` của Anthropic và bộ quy tắc của Emil Kowalski): chuyển động phải trả lời một hành động; mỗi màn hình một khoảnh khắc nổi bật; chỉ animate `transform` và `opacity`; luôn có nhánh `prefers-reduced-motion`. Thời lượng theo khung của Emil Kowalski: tương tác nhỏ 100–150ms, UI thường 150–250ms, sheet/dialog 200–300ms, mặc định ease-out.

**Thư viện** (đo bằng esbuild, minify + gzip, React để external, 11/2026):

| Thư viện | min + gzip | Kết luận |
|---|---|---|
| CSS + hàm `CaNhanh.*` của hệ thiết kế | 6,5 KB | Dùng mặc định |
| `motion/react` với `LazyMotion` + `domAnimation` | 26,6 KB | Chỉ cho `AnimatePresence` và layout animation (bản đầy đủ 39,9 KB) |
| `@number-flow/react` | 6,1 KB | Tùy chọn thay odometer CSS |
| `canvas-confetti` | 4,2 KB | Tùy chọn, nạp bằng `import()` lúc cần |
| `@formkit/auto-animate` | 3,1 KB | Tùy chọn cho danh sách |
| `gsap` | 27,0 KB | Không cần |
| `lottie-web` | 76,8 KB | Không dùng: nặng hơn cả React DOM (67,3 KB cho React 19 + ReactDOM) |

---

## 7. Hiệu năng

| Mục tiêu (điện thoại, 4G) | Ngưỡng |
|---|---|
| LCP | < 2,5 s (NFR-PERF-04) |
| INP | < 200 ms |
| CLS | < 0,1 |
| JS cho chuyển động trên màn hình người làm | ≤ 35 KB gzip |
| Ảnh hero 1600px | ≤ 150 KB (thực tế 55 KB AVIF) |
| Ảnh bìa quán 960px | ≤ 60 KB (thực tế 27–49 KB AVIF) |

**Cách đạt**
- Server Component là mặc định; chỉ những phần có realtime, bản đồ hay chuyển động mới là client component. Leaflet và Motion nạp bằng `dynamic()` ở đúng trang cần.
- Ảnh nén sẵn AVIF/WebP ba cỡ, có `width`/`height` cố định (tránh CLS) và placeholder mờ. `priority` chỉ cho ảnh LCP.
- Font: 2 họ chữ, chỉ subset tiếng Việt + Latin, `display: swap`; Big Shoulders chỉ 2 độ đậm.
- Danh sách dài dùng `content-visibility: auto`; mỗi lần có thay đổi realtime chỉ cập nhật đúng thẻ bị ảnh hưởng, không render lại cả danh sách.
- **Đo**: Lighthouse chế độ mobile sau mỗi sprint; Chrome DevTools MCP (§8) để agent tự ghi trace và đọc LCP/INP/CLS; Vercel Speed Insights cho số liệu người dùng thật (có hạn mức miễn phí, kiểm tra trang giá).

---

## 8. Agent skill và MCP nên dùng

Skill là các tệp hướng dẫn (đôi khi kèm script) mà agent đọc và làm theo, chạy với quyền truy cập repo của bạn. Vì vậy hãy đọc `SKILL.md` và các script trước khi cài, ưu tiên cài theo dự án và ghim phiên bản. Danh sách và lệnh cài dưới đây lấy từ README gốc của từng repo (11/2026).

| Skill hoặc công cụ | Nguồn | Giúp gì | Cài | Lưu ý |
|---|---|---|---|---|
| `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | **Hiệu năng**: hơn 40 quy tắc React/Next.js xếp theo mức ảnh hưởng (waterfall, bundle, re-render) | `npx skills add vercel-labs/agent-skills` | MIT. Cùng repo có `web-design-guidelines`, `react-view-transitions`, `composition-patterns` |
| `web-design-guidelines` | vercel-labs/agent-skills | **Giao diện**: audit hơn 100 quy tắc a11y, focus, form, `prefers-reduced-motion`, `tabular-nums`, `Intl.NumberFormat` | như trên | Chạy cuối mỗi sprint: "Review my UI" |
| `react-view-transitions` | vercel-labs/agent-skills | Chuyển trang vé → chi tiết, `<ViewTransition>` trong Next.js | như trên | |
| `supabase-postgres-best-practices` | [supabase/agent-skills](https://github.com/supabase/agent-skills) | **Hiệu năng CSDL**: index, kết nối, RLS, khóa dòng | `npx skills add supabase/agent-skills --skill supabase-postgres-best-practices` | Hợp với các hàm `fn_*` đã viết |
| `emil-design-eng`, `animation-performance`, `mobile-native`, `break-ui`, `ask-sonner` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | **Chuyển động** đúng easing/thời lượng; sửa hiệu ứng rớt khung; làm PWA có cảm giác app thật trên điện thoại (tap highlight, lỗi 100vh, ô nhập phóng to); thử dữ liệu xấu; dùng Sonner (thư viện toast trong HLD) | `npx skills@latest add emilkowalski/skills` | Chọn đúng các skill này khi cài |
| `frontend-design`, `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) | Định hướng thẩm mỹ chống thiết kế rập khuôn; kiểm thử UI local bằng Playwright (chụp màn hình, log) | `/plugin marketplace add anthropics/skills`, rồi `/plugin install example-skills@anthropic-agent-skills` | Anthropic ghi rõ đây là skill minh họa; `webapp-testing` cần Python và Playwright |
| Impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 24 lệnh (`critique`, `audit`, `polish`, `animate`, `optimize`…) và bộ dò 62 quy tắc chạy trong CI: `npx impeccable detect src/` | `npx impeccable install` | **Cẩn thận**: hook chạy ngoài vòng phê duyệt của Claude Code; chế độ `live` có thể tự gọi `claude --permission-mode bypassPermissions`. Nếu dùng, đặt `IMPECCABLE_LIVE_COPY_AGENT=chat` (hoặc `off`) và tắt telemetry (`npx impeccable telemetry off`). Khuyên chỉ dùng bộ dò CLI và lệnh `critique`/`audit` |
| UI UX Pro Max | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Kho phong cách, bảng màu, cặp font | xem README | Không cần cho dự án này (đã có hệ thiết kế); cần Python, script có thể sửa file |
| **Chrome DevTools MCP** | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | **Hiệu năng**: agent ghi trace, đọc LCP/INP/CLS, xem console và network trên Chrome thật | `claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest --no-usage-statistics --no-performance-crux` | Mặc định gửi thống kê sử dụng cho Google và gửi URL của trace cho CrUX; hai cờ trên tắt cả hai |
| Playwright MCP | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Agent điều khiển trình duyệt để chạy luồng demo trên 2 "thiết bị" | `claude mcp add playwright -- npx @playwright/mcp@latest` | Tùy chọn, khi viết E2E |

**Bộ nên cài cho Ca Nhanh** (5 skill + 1 MCP): `react-best-practices`, `web-design-guidelines`, `supabase-postgres-best-practices`, `animation-performance` + `mobile-native` (của Emil Kowalski), và Chrome DevTools MCP.

**Sẵn có trong Claude Code, không cần cài**: `/code-review` (tìm lỗi trong diff), `/simplify` (dọn mã), `/security-review`, `run` (chạy app để kiểm tra thay đổi).

**Gợi ý câu lệnh theo giai đoạn**
- Khi làm component: "Port ShiftTicket từ design/components.css sang React theo hệ thiết kế Ca Nhanh, áp dụng react-best-practices."
- Cuối sprint: "Review my UI ở app/worker theo web-design-guidelines, ưu tiên lỗi a11y và reduced-motion."
- Trước demo: "Ghi performance trace trang /worker trên mobile 4G bằng chrome-devtools, báo LCP/INP/CLS và 3 việc cần sửa."

---

## 9. Hình ảnh đã thu thập

| Nhóm | Số lượng | Nguồn và giấy phép | Vị trí |
|---|---|---|---|
| Ảnh chụp | 8 ảnh, mỗi ảnh AVIF + WebP ở 2–3 cỡ (tổng 1,6 MB cho mọi biến thể) | Unsplash License, đã kiểm trên trang gốc | `design/assets/photos/` + `photos.json` |
| Minh họa | 6 SVG (0,8–1,7 KB mỗi file) | Nhóm tự vẽ | `design/assets/illustrations/` |
| Avatar | 16 SVG | DiceBear Notionists (Zoish), CC0 1.0 | `design/assets/avatars/` |
| Thương hiệu | Logo ×3 nền, biểu tượng, favicon SVG/PNG, icon PWA 192/512/maskable, apple-touch-icon, ảnh OG 1200 × 630 (80 KB), `manifest.webmanifest` | Nhóm tự làm; chữ từ Big Shoulders Display (OFL) | `design/assets/brand/` |

- **Đã loại** 3 ảnh vì lộ thương hiệu thật (tạp dề kiểu Starbucks, logo "Oolong Bubble Teahouse", biển hiệu "Pho").
- **Không dùng unDraw**: giấy phép của unDraw cấm phân phối lại file minh họa, nên để SVG của họ trong repo là rủi ro.
- **Không dùng Pexels**: trang Pexels chặn việc xác minh tác giả, mà không xác minh được thì không đưa vào.

Chi tiết từng file, tác giả và đường dẫn gốc: [`design/assets/CREDITS.md`](../design/assets/CREDITS.md).

---

## 10. Việc tiếp theo

1. Mở trang hệ thiết kế → Share để nhóm xem được (link đang riêng tư).
2. Phase 0–1 của [kế hoạch lập trình](07-Implementation-Plan.md) (task P0-03, P0-04, P1-16): tạo app Next.js, chép `design/assets` vào `public/`, nạp `theme.css` + `components.css`, port component sang React theo [`design/COMPONENTS.md`](../design/COMPONENTS.md) (dữ liệu cần truyền, trạng thái, quy tắc) và [`design/components.d.ts`](../design/components.d.ts).
3. Cài bộ skill ở §8, chạy `web-design-guidelines` và Lighthouse sau Phase 1; lượt rà soát cuối là P3-09 và P3-10.
4. Điền ảnh quán thật của các quán demo (nếu có) thay cho ảnh Unsplash, giữ tỉ lệ 3:2.

---

## Nguồn tham khảo

- Skill và công cụ: [anthropics/skills](https://github.com/anthropics/skills) · [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) · [supabase/agent-skills](https://github.com/supabase/agent-skills) · [emilkowalski/skills](https://github.com/emilkowalski/skills) · [pbakaus/impeccable](https://github.com/pbakaus/impeccable) · [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) · [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · [skills.sh](https://skills.sh)
- Website tham khảo: [Instawork](https://www.instawork.com/) · [Wonolo](https://www.wonolo.com/) · [Indeed Flex](https://indeedflex.com/) · [be](https://be.com.vn/) · [Qwick](https://www.qwick.com/) · [Timee](https://timee.co.jp/) · [Qwick mua Gigpro (moneypantry)](https://moneypantry.com/shift-work-apps-that-pay/)
- Giấy phép: [Unsplash License](https://unsplash.com/license) · [DiceBear licenses](https://www.dicebear.com/licenses/) · [unDraw](https://undraw.co)
- Font: [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) · [Big Shoulders Display](https://fonts.google.com/specimen/Big+Shoulders+Display)
