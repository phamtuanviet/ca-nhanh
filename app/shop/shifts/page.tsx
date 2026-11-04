import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Ca' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Ca"
      description="Đăng ca và theo dõi người nhận"
      illustration="empty-shifts"
      heading="Đăng ca có ký quỹ"
      text="Xem chi phí dự kiến trước khi đăng; tiền công được tạm giữ ngay để người làm yên tâm nhận ca."
      task="P1-14"
    />
  );
}
