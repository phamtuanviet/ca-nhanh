## Task

<!-- Mã task và issue, ví dụ: [P1-10] Chi tiết ca và nút Nhận ca. Closes #12 -->

## Thay đổi

-

## Cách kiểm thử

<!-- Lệnh đã chạy, các bước đã thử bằng tay, tài khoản demo đã dùng -->

## Ảnh chụp màn hình

<!-- Nếu đổi giao diện: khổ 360px và desktop, theme sáng và tối -->

## Checklist "Xong" (docs/07 §2.3)

- [ ] `npm run lint`, `npm run typecheck`, `npm test` đều xanh; không dùng `any`
- [ ] Màu, chữ, bo góc lấy từ token và lớp `cn-*`; không viết cứng mã màu
- [ ] Đúng ở 360px và desktop, ở cả theme sáng và tối
- [ ] Có trạng thái đang tải, rỗng và lỗi; thông điệp lỗi lấy từ docs/05 §9
- [ ] Dùng được bằng bàn phím, focus hiện rõ, ảnh có `alt`, chuyển động có nhánh `prefers-reduced-motion`
- [ ] Logic có unit test; endpoint mới có ít nhất 1 test thành công và 1 test lỗi chính
- [ ] Đã xem trên Vercel Preview
- [ ] Đổi API hoặc CSDL thì đã cập nhật docs/04, docs/05; đổi SQL thì đã thêm kiểm thử vào `docs/sql/test/` và `run_tests.sh` vẫn đạt 100%
