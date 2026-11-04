import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, type BadgeTone } from '@/components/cn/badge';
import { Countdown } from '@/components/cn/countdown';
import { EmptyState } from '@/components/cn/empty-state';
import { PageHeader } from '@/components/layout/page';
import { requireRole } from '@/lib/auth';
import { fmtDay, fmtRange, vnd } from '@/lib/format';
import { listWorkerBookings, type WorkerBooking } from '@/lib/services/bookings';

export const metadata: Metadata = { title: 'Ca của tôi' };

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  confirmed: { label: 'Đã nhận', tone: 'info' },
  checked_in: { label: 'Đang làm', tone: 'new' },
  checked_out: { label: 'Chờ duyệt', tone: 'warn' },
  disputed: { label: 'Đang khiếu nại', tone: 'warn' },
  completed: { label: 'Hoàn tất', tone: 'deposit' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },
  no_show: { label: 'Vắng mặt', tone: 'danger' },
};

const TABS = [
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'history', label: 'Lịch sử' },
] as const;

function BookingCard({
  booking,
  showCountdown,
}: {
  booking: WorkerBooking;
  showCountdown: boolean;
}) {
  const status = STATUS[booking.status] ?? { label: booking.status, tone: 'neutral' as BadgeTone };
  const amount = booking.wage_amount ?? booking.shift.est_wage_per_seat;
  return (
    <li>
      <Link
        href={`/worker/shifts/${booking.shift.id}`}
        className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <span className="truncate text-sm text-text-muted">{booking.shop.name}</span>
            <span className="font-semibold">{booking.shift.title}</span>
            <span className="text-sm text-text-muted">
              <span className="cn-num text-base text-text">
                {fmtRange(booking.shift.start_at, booking.shift.end_at)}
              </span>{' '}
              · {fmtDay(booking.shift.start_at)}
            </span>
          </div>
          <div className="grid justify-items-end gap-1">
            <strong className="cn-num text-2xl text-money">{vnd(amount)}</strong>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
        </div>
        {showCountdown ? <Countdown target={booking.shift.start_at} /> : null}
      </Link>
    </li>
  );
}

/** W5: Ca của tôi, bản tối thiểu (P1-11). Đang làm và chờ duyệt đầy đủ ở Phase 2. */
export default async function MyBookingsPage({ searchParams }: PageProps<'/worker/bookings'>) {
  const user = await requireRole('worker');
  const tab = (await searchParams).tab === 'history' ? 'history' : 'upcoming';
  const page = { page: 1, limit: 50 };

  const groups =
    tab === 'upcoming'
      ? await Promise.all([
          listWorkerBookings(user.id, { scope: 'active', ...page }),
          listWorkerBookings(user.id, { scope: 'upcoming', ...page }),
        ])
      : await Promise.all([
          listWorkerBookings(user.id, { scope: 'pending_approval', ...page }),
          listWorkerBookings(user.id, { scope: 'history', ...page }),
        ]);
  const items = groups.flatMap((g) => g.items);

  return (
    <>
      <PageHeader title="Ca của tôi" />
      <nav
        aria-label="Nhóm ca"
        className="mb-4 inline-flex rounded-[var(--radius-control)] bg-surface-sunken p-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'upcoming' ? '/worker/bookings' : '/worker/bookings?tab=history'}
            aria-current={tab === t.key ? 'page' : undefined}
            className="inline-flex h-9 items-center rounded-[calc(var(--radius-control)-4px)] px-4 text-sm font-medium text-text-muted aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:shadow-sm"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="empty-bookings"
            title={tab === 'upcoming' ? 'Bạn chưa nhận ca nào' : 'Chưa có ca nào trong lịch sử'}
            text="Ca bạn nhận sẽ nằm ở đây, kèm đồng hồ đếm ngược tới giờ vào ca."
            action={{ label: 'Xem ca gần bạn', href: '/worker' }}
          />
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              showCountdown={tab === 'upcoming' && b.status === 'confirmed'}
            />
          ))}
        </ul>
      )}
    </>
  );
}
