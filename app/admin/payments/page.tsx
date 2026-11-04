import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Thanh toán' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Thanh toán"
      description="Lệnh nạp và rút tiền"
      illustration="wallet-paid"
      heading="Lệnh thanh toán"
      text="Theo dõi lệnh nạp VietQR và lệnh rút tiền, hoàn tất thủ công khi cần."
      task="P3-05"
    />
  );
}
