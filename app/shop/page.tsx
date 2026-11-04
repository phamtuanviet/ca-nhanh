import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Hôm nay' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Hôm nay"
      description="Ca hôm nay, chỗ đã lấp, ai đã đến"
      illustration="shop-onboarding"
      heading="Bảng điều khiển trong ngày"
      text="Các ca hôm nay, chỗ được lấp theo thời gian thực, người đã check-in và giờ công chờ duyệt."
      task="P1-15"
    />
  );
}
