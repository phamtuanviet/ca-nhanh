import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page';
import { requireRole } from '@/lib/auth';
import { listPendingTimesheets } from '@/lib/services/bookings';
import { listMyShops } from '@/lib/services/shops';
import { ShopLiveRefresh } from '../live-refresh';
import { TimesheetList } from './timesheet-list';

export const metadata: Metadata = { title: 'Giờ công' };

/** S5: giờ công chờ duyệt (P2-05, US-32, US-33). Duyệt xong tiền vào ví người làm ngay. */
export default async function TimesheetsPage() {
  const user = await requireRole('shop_owner');
  const [items, shops] = await Promise.all([listPendingTimesheets(user.id), listMyShops(user.id)]);
  return (
    <>
      <PageHeader
        title="Giờ công"
        description="Giờ vào, ra lấy từ lần quét QR. Duyệt xong là tiền vào ví người làm ngay."
        actions={
          shops.length > 0 ? (
            <ShopLiveRefresh shopIds={shops.map((s) => s.id)} label="Cập nhật trực tiếp" />
          ) : null
        }
      />
      <TimesheetList items={items} multiShop={shops.length > 1} />
    </>
  );
}
