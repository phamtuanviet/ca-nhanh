import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'KPI' };

export default function Page() {
  return (
    <PagePlaceholder
      title="KPI"
      description="Sức khỏe chợ ca trong 30 ngày"
      illustration="empty-shifts"
      heading="Dashboard KPI"
      text="GMV, doanh thu phí, tỉ lệ lấp chỗ, thời gian có người và tỉ lệ vắng mặt theo ngày."
      task="P3-04"
    />
  );
}
