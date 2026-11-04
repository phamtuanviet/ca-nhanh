import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page';

export const metadata: Metadata = { title: 'Ví' };

export default function Page() {
  return (
    <PagePlaceholder
      title="Ví"
      description="Tiền công và rút về ngân hàng"
      illustration="wallet-paid"
      heading="Tiền công vào ví ngay khi quán duyệt"
      text="Số dư, lịch sử nhận tiền và rút về tài khoản ngân hàng trong ngày."
      task="P2-06"
    />
  );
}
