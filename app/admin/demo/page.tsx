import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Công cụ demo' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Công cụ demo"
      description="Reset dữ liệu, tua thời gian, chạy bộ hẹn giờ"
      illustration="qr-scan"
      heading="Công cụ cho người thuyết trình"
      text="Reset 60 ngày dữ liệu demo, tua một ca tới giờ bắt đầu hoặc kết thúc, chạy bộ hẹn giờ ngay."
      task="P3-06"
    />
  );
}
