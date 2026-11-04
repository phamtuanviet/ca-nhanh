import { QrCode, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '@/components/cn/badge';
import { Countdown } from '@/components/cn/countdown';
import { EmptyState } from '@/components/cn/empty-state';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { fmtDateTime, fmtDay, fmtRange, fmtTime, vnd } from '@/lib/format';
import { BOOKING_STATUS } from '@/lib/labels';
import { type WorkerBooking, workerBookingGroups } from '@/lib/services/bookings';
import { getSettings, type PlatformSettings } from '@/lib/services/settings';
import { MyBookingsLive, WorkerCancelButton } from './booking-actions';

export const metadata: Metadata = { title: 'Ca của tôi' };

const TABS = [
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'active', label: 'Đang làm' },
  { key: 'pending_approval', label: 'Chờ duyệt' },
  { key: 'history', label: 'Lịch sử' },
] as const;

type Tab = (typeof TABS)[number]['key'];

const EMPTY: Record<Tab, { title: string; text: string }> = {
  upcoming: {
    title: 'Bạn chưa nhận ca nào',
    text: 'Ca bạn nhận sẽ nằm ở đây, kèm đồng hồ đếm ngược tới giờ vào ca.',
  },
  active: {
    title: 'Không có ca nào đang làm',
    text: 'Đến quán, quét mã QR trên kiosk để check-in. Ca đang làm hiện ở đây.',
  },
  pending_approval: {
    title: 'Không có giờ công chờ duyệt',
    text: 'Sau khi check-out, giờ công chờ quán duyệt nằm ở đây. Duyệt xong tiền vào ví ngay.',
  },
  history: {
    title: 'Chưa có ca nào trong lịch sử',
    text: 'Ca đã hoàn tất, đã hủy hoặc vắng mặt sẽ được lưu ở đây.',
  },
};

/** Đọc đồng hồ ngoài component: trang chạy khi có request (đã đọc phiên trước đó) */
function minutesUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 60_000;
}

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

function ScanButton({ label }: { label: string }) {
  return (
    <Button asChild size="sm">
      <Link href="/worker/scan">
        <QrCode aria-hidden /> {label}
      </Link>
    </Button>
  );
}

function Note({ tone = 'muted', children }: { tone?: 'muted' | 'warn'; children: ReactNode }) {
  return tone === 'warn' ? (
    <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-spark-soft px-3 py-2 text-sm text-on-spark-soft">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  ) : (
    <p className="text-sm text-text-muted">{children}</p>
  );
}

/** Phần dưới của thẻ: thông tin và hành động theo trạng thái */
function Footer({ b, settings }: { b: WorkerBooking; settings: PlatformSettings }) {
  const toStart = minutesUntil(b.shift.start_at);
  switch (b.status) {
    case 'confirmed': {
      if (toStart > 0) {
        const checkinOpen = toStart <= settings.checkin_open_before_minutes;
        return (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Countdown target={b.shift.start_at} />
            <div className="flex gap-2">
              <WorkerCancelButton bookingId={b.id} />
              {checkinOpen ? <ScanButton label="Quét QR check-in" /> : null}
            </div>
          </div>
        );
      }
      if (minutesUntil(b.shift.end_at) > 0) {
        return (
          <div className="grid gap-2">
            <Note tone="warn">
              Bạn chưa check-in. Quá {settings.no_show_after_minutes} phút sau giờ bắt đầu sẽ bị
              tính vắng mặt ({settings.penalty_points.no_show} điểm phạt).
            </Note>
            <div className="flex justify-end">
              <ScanButton label="Quét QR check-in" />
            </div>
          </div>
        );
      }
      return <Note>Ca đã kết thúc mà chưa check-in. Hệ thống đang xử lý.</Note>;
    }
    case 'checked_in':
      return (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-text-muted">
            Vào lúc <span className="cn-num text-base text-text">{fmtTime(b.check_in_at!)}</span>
            {b.is_late ? ' · đi muộn' : ''}
          </span>
          <ScanButton label="Quét QR check-out" />
        </div>
      );
    case 'checked_out':
      return (
        <div className="grid gap-1 text-sm text-text-muted">
          <span>
            {b.check_in_at ? `Vào ${fmtTime(b.check_in_at)} · ` : ''}
            Ra {b.check_out_at ? fmtTime(b.check_out_at) : '--:--'} ·{' '}
            <span className="text-text">{b.worked_minutes ?? 0} phút</span>
          </span>
          {b.auto_checked_out ? (
            <span>Hệ thống đã check-out giúp bạn tại giờ kết thúc ca.</span>
          ) : null}
          {b.check_out_at ? (
            <span>
              Chờ quán duyệt. Quá hạn sẽ tự duyệt lúc{' '}
              {fmtDateTime(addHours(b.check_out_at, settings.auto_approve_after_hours))}.
            </span>
          ) : null}
        </div>
      );
    case 'disputed':
      return <Note>Đang khiếu nại. Admin sẽ xử lý và quyết toán.</Note>;
    case 'completed':
      return (
        <div className="grid gap-1 text-sm text-text-muted">
          <span>
            {b.worked_minutes ?? 0} phút ·{' '}
            <span className="font-semibold text-money">+{vnd(b.wage_amount ?? 0)} đã vào ví</span>
          </span>
          {b.adjustment_note ? <span>Quán điều chỉnh: {b.adjustment_note}</span> : null}
        </div>
      );
    case 'cancelled':
      return (
        <Note>
          {b.cancelled_by === 'worker'
            ? `Bạn đã hủy${b.penalty_points > 0 ? ` · ${b.penalty_points} điểm phạt` : ' · không bị phạt'}`
            : b.cancelled_by === 'shop'
              ? `Quán đã hủy${b.compensation_amount > 0 ? ` · bạn được bồi thường ${vnd(b.compensation_amount)}` : ''}`
              : 'Ca đã bị hủy'}
        </Note>
      );
    case 'no_show':
      return (
        <Note tone="warn">
          Vắng mặt: quá {settings.no_show_after_minutes} phút chưa check-in · {b.penalty_points}{' '}
          điểm phạt.
        </Note>
      );
    default:
      return null;
  }
}

function BookingCard({ b, settings }: { b: WorkerBooking; settings: PlatformSettings }) {
  const status = BOOKING_STATUS[b.status] ?? { label: b.status, tone: 'neutral' as BadgeTone };
  const notCheckedIn = b.status === 'confirmed' && minutesUntil(b.shift.start_at) <= 0;
  const amount = b.wage_amount ?? b.shift.est_wage_per_seat;
  const head = (
    <div className="flex items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="truncate text-sm text-text-muted">{b.shop.name}</span>
        <span className="font-semibold">{b.shift.title}</span>
        <span className="text-sm text-text-muted">
          <span className="cn-num text-base text-text">
            {fmtRange(b.shift.start_at, b.shift.end_at)}
          </span>{' '}
          · {fmtDay(b.shift.start_at)}
        </span>
      </div>
      <div className="grid justify-items-end gap-1">
        <strong
          className={`cn-num text-2xl ${b.status === 'cancelled' ? 'text-text-muted line-through' : 'text-money'}`}
        >
          {vnd(amount)}
        </strong>
        {notCheckedIn ? (
          <Badge tone="warn">Chưa check-in</Badge>
        ) : (
          <Badge tone={status.tone}>{status.label}</Badge>
        )}
      </div>
    </div>
  );
  return (
    <li
      className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
      data-testid="my-booking"
    >
      {b.status === 'cancelled' ? (
        head
      ) : (
        <Link href={`/worker/shifts/${b.shift.id}`} className="rounded-[var(--radius-control)]">
          {head}
        </Link>
      )}
      <Footer b={b} settings={settings} />
    </li>
  );
}

/** W5: Ca của tôi, đủ bốn tab (P2-07), cập nhật realtime khi quán duyệt hoặc hủy */
export default async function MyBookingsPage({ searchParams }: PageProps<'/worker/bookings'>) {
  const user = await requireRole('worker');
  const raw = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t.key === raw)?.key ?? 'upcoming';
  const [groups, settings] = await Promise.all([workerBookingGroups(user.id), getSettings()]);
  const items = groups[tab];

  return (
    <>
      <PageHeader title="Ca của tôi" actions={<MyBookingsLive userId={user.id} />} />
      <nav
        aria-label="Nhóm ca"
        className="mb-4 flex max-w-full gap-0.5 overflow-x-auto rounded-[var(--radius-control)] bg-surface-sunken p-1 sm:inline-flex"
      >
        {TABS.map((t) => {
          const count = groups[t.key].length;
          return (
            <Link
              key={t.key}
              href={t.key === 'upcoming' ? '/worker/bookings' : `/worker/bookings?tab=${t.key}`}
              aria-current={tab === t.key ? 'page' : undefined}
              className="inline-flex h-9 flex-1 shrink-0 items-center justify-center gap-1 rounded-[calc(var(--radius-control)-4px)] px-2 text-sm font-medium text-text-muted aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:shadow-sm sm:flex-none sm:px-3"
            >
              {t.label}
              {count > 0 && t.key !== 'history' ? (
                <span className="min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-bold text-on-primary">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="empty-bookings"
            title={EMPTY[tab].title}
            text={EMPTY[tab].text}
            action={
              tab === 'active'
                ? { label: 'Quét QR', href: '/worker/scan' }
                : { label: 'Xem ca gần bạn', href: '/worker' }
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((b) => (
            <BookingCard key={b.id} b={b} settings={settings} />
          ))}
        </ul>
      )}
    </>
  );
}
