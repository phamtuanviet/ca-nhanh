import { Plus, QrCode } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/cn/empty-state';
import { PageHeader } from '@/components/layout/page';
import { ShopShiftCard } from '@/components/shop/shop-shift-card';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { fmtDate, vnDate, vnd } from '@/lib/format';
import { listShopShifts } from '@/lib/services/shifts';
import { listMyShops } from '@/lib/services/shops';
import { getWallet } from '@/lib/services/wallet';
import { ShopLiveRefresh } from './live-refresh';

export const metadata: Metadata = { title: 'Hôm nay' };

/** S1: bảng điều khiển trong ngày, chỗ được lấp theo thời gian thực (P1-15) */
export default async function ShopTodayPage() {
  const user = await requireRole('shop_owner');
  const [shops, wallet] = await Promise.all([listMyShops(user.id), getWallet(user.id)]);
  if (shops.length === 0) {
    return (
      <>
        <PageHeader title="Hôm nay" />
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="shop-onboarding"
            title="Tạo quán để đăng ca đầu tiên"
            text="Ghim vị trí quán để người làm tìm thấy và chấm công đúng chỗ."
            action={{ label: 'Tạo quán', href: '/shop/settings' }}
          />
        </div>
      </>
    );
  }

  const today = vnDate();
  const dayStart = new Date(`${today}T00:00:00+07:00`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const weekEnd = new Date(dayStart.getTime() + 8 * 86_400_000);
  const names = new Map(shops.map((s) => [s.id, s.name]));
  const lists = await Promise.all(
    shops.map((s) =>
      listShopShifts(user.id, s.id, {
        from: dayStart.toISOString(),
        to: weekEnd.toISOString(),
        statuses: ['open', 'full', 'in_progress', 'completed'],
        page: 1,
        limit: 50,
      }),
    ),
  );
  const shifts = lists
    .flatMap((l) => l.items)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const todays = shifts.filter((s) => new Date(s.start_at) < dayEnd);
  const upcoming = shifts.filter((s) => new Date(s.start_at) >= dayEnd && s.status !== 'completed');
  const seatsTotal = todays.reduce((n, s) => n + s.headcount, 0);
  const seatsFilled = todays.reduce((n, s) => n + s.seats.length, 0);
  const pending = shifts.reduce((n, s) => n + s.pending_approval_count, 0);
  const showShop = shops.length > 1;

  return (
    <>
      <PageHeader
        title="Hôm nay"
        description={fmtDate(new Date())}
        actions={
          <div className="flex flex-wrap gap-2">
            {shops.map((s) => (
              <Button key={s.id} asChild variant="secondary">
                <Link href={`/shop/kiosk/${s.id}`} target="_blank">
                  <QrCode aria-hidden /> {showShop ? `Kiosk ${s.name}` : 'Kiosk QR'}
                </Link>
              </Button>
            ))}
            <Button asChild>
              <Link href="/shop/shifts/new">
                <Plus aria-hidden /> Đăng ca
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mb-4">
        <ShopLiveRefresh
          shopIds={shops.map((s) => s.id)}
          label="Chỗ được lấp hiện ngay khi có người nhận"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Ca hôm nay', value: String(todays.length) },
          { label: 'Chỗ đã lấp', value: `${seatsFilled}/${seatsTotal}` },
          { label: 'Chờ duyệt giờ công', value: String(pending), href: '/shop/timesheets' },
          { label: 'Ví khả dụng', value: vnd(wallet.balance), href: '/shop/wallet' },
        ].map((card) => {
          const body = (
            <>
              <span className="text-xs font-semibold text-text-muted">{card.label}</span>
              <strong className="cn-num text-3xl">{card.value}</strong>
            </>
          );
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="grid gap-1 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] hover:bg-primary-soft"
            >
              {body}
            </Link>
          ) : (
            <div
              key={card.label}
              className="grid gap-1 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
            >
              {body}
            </div>
          );
        })}
      </div>

      <section className="grid gap-3">
        <h2 className="text-lg font-bold">Ca hôm nay</h2>
        {todays.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
            <EmptyState
              illustration="empty-shifts"
              title="Hôm nay chưa có ca nào"
              text="Đăng ca để có người làm trong vài giờ tới. Tiền công được tạm giữ ngay khi đăng."
              action={{ label: 'Đăng ca', href: '/shop/shifts/new' }}
            />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {todays.map((s) => (
              <ShopShiftCard
                key={s.id}
                shift={s}
                shopName={showShop ? names.get(s.shop_id) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-8 grid gap-3">
          <h2 className="text-lg font-bold">7 ngày tới</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {upcoming.map((s) => (
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
