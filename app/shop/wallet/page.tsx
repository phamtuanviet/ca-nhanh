import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Ví quán' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Ví quán"
      description="Số dư khả dụng và tiền đang tạm giữ"
      illustration="wallet-paid"
      heading="Nạp ví bằng VietQR"
      text="Số dư khả dụng, tiền đang tạm giữ cho các ca và lịch sử giao dịch."
      task="P1-13"
    />
  );
}
