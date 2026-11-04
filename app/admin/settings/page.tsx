import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Cấu hình' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Cấu hình"
      description="Tham số nền tảng"
      illustration="kyc-verify"
      heading="Tham số nền tảng"
      text="Phí nền tảng, lương tối thiểu, mức phạt, thời gian chờ và cờ chế độ demo."
      task="P3-05"
    />
  );
}
