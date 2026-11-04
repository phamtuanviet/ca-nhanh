import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Quán' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Quán"
      description="Thông tin quán và vị trí chấm công"
      illustration="shop-onboarding"
      heading="Hồ sơ quán và ghim bản đồ"
      text="Tên, địa chỉ, ảnh bìa và bán kính chấm công quanh vị trí đã ghim."
      task="P1-12"
    />
  );
}
