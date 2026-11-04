import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Khám phá ca' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Khám phá ca"
      description="Ca gần bạn, cập nhật theo thời gian thực"
      illustration="empty-shifts"
      heading="Ca gần bạn sẽ hiện ở đây"
      text="Lọc theo ngày, vị trí, lương và khoảng cách. Ca mới đăng tự hiện trong 2 giây, không cần tải lại."
      task="P1-09"
    />
  );
}
