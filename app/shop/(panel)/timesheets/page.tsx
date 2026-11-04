import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Giờ công' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Giờ công"
      description="Duyệt giờ công sau ca"
      illustration="qr-scan"
      heading="Giờ công chờ duyệt sẽ hiện ở đây"
      text="Giờ vào và ra lấy từ lần quét QR; duyệt xong tiền vào ví người làm ngay."
      task="P2-05"
    />
  );
}
