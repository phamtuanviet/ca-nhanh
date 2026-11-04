import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Người dùng' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Người dùng"
      description="Tài khoản, khóa và gỡ tạm khóa"
      illustration="empty-bookings"
      heading="Danh sách người dùng"
      text="Tìm tài khoản, khóa hoặc mở khóa, gỡ tạm khóa nhận ca và duyệt quán mới."
      task="P3-05"
    />
  );
}
