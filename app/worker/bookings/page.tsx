import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Ca của tôi' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Ca của tôi"
      description="Ca sắp tới, đang làm, chờ duyệt và lịch sử"
      illustration="empty-bookings"
      heading="Ca bạn đã nhận sẽ nằm ở đây"
      text="Kèm đồng hồ đếm ngược tới giờ vào ca và nút quét QR khi đến quán."
      task="P1-11"
    />
  );
}
