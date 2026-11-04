import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/cn/empty-state';
import { PageHeader } from '@/components/layout/page';
import { ShopShiftCard } from '@/components/shop/shop-shift-card';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { vnDate } from '@/lib/format';
import { listShopShifts, type ShopShift } from '@/lib/services/shifts';
import { listMyShops } from '@/lib/services/shops';
import { ShopLiveRefresh } from '../live-refresh';

export const metadata: Metadata = { title: 'Ca' };

/** Ca chưa kết thúc (sắp tới, gần nhất trước) và ca đã qua (mới nhất trước) */
function splitByTime(all: ShopShift[]) {
  const now = Date.now();
  const upcoming = all
    .filter((s) => new Date(s.end_at).getTime() > now && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const past = all
    .filter((s) => !upcoming.includes(s))
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
  return { upcoming, past };
}

/** Danh sách ca của quán: sắp tới và 7 ngày qua */
export default async function ShopShiftsPage() {
  const user = await requireRole('shop_owner');
  const shops = await listMyShops(user.id);
  const dayStart = new Date(`${vnDate()}T00:00:00+07:00`);
  const from = new Date(dayStart.getTime() - 7 * 86_400_000);
  const names = new Map(shops.map((s) => [s.id, s.name]));
  const lists = await Promise.all(
    shops.map((s) =>
      listShopShifts(user.id, s.id, { from: from.toISOString(), page: 1, limit: 50 }),
    ),
  );
  const { upcoming, past } = splitByTime(lists.flatMap((l) => l.items));
  const showShop = shops.length > 1;

  return (
    <>
      <PageHeader
        title="Ca"
        description="Ca đang mở, đủ người và 7 ngày qua"
        actions={
          <Button asChild>
            <Link href="/shop/shifts/new">
              <Plus aria-hidden /> Đăng ca
            </Link>
          </Button>
        }
      />
      {shops.length > 0 ? (
        <div className="mb-4">
          <ShopLiveRefresh shopIds={shops.map((s) => s.id)} label="Cập nhật trực tiếp" />
        </div>
      ) : null}
      {upcoming.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="empty-shifts"
            title="Chưa có ca nào sắp tới"
            text="Ca đã đăng sẽ hiện ở đây kèm số chỗ đã có người nhận."
            action={{ label: 'Đăng ca', href: '/shop/shifts/new' }}
          />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {upcoming.map((s) => (
            <ShopShiftCard
              key={s.id}
              shift={s}
              shopName={showShop ? names.get(s.shop_id) : undefined}
            />
          ))}
        </div>
      )}
      {past.length > 0 ? (
        <section className="mt-8 grid gap-3">
          <h2 className="text-lg font-bold">7 ngày qua</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {past.slice(0, 20).map((s) => (
              <ShopShiftCard
                key={s.id}
                shift={s}
                shopName={showShop ? names.get(s.shop_id) : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
