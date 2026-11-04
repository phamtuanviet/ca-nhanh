import { ArrowLeft, Clock, MapPin, QrCode, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReviewButton } from '@/components/booking/review-dialog';
import { Badge } from '@/components/cn/badge';
import { SeatSlotsLive } from '@/components/cn/seat-slots-live';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { fmtDateTime, fmtDay, fmtRange, fmtTime, vnd } from '@/lib/format';
import { BOOKING_STATUS, SHIFT_STATUS } from '@/lib/labels';
import { demoEnabled, getSettings } from '@/lib/services/settings';
import { getShiftDetail } from '@/lib/services/shifts';
import { ShopLiveRefresh } from '../../live-refresh';
import { invitedWorkerIds } from '@/lib/services/invites';
import {
  BoostButton,
  CancelBookingButton,
  CancelShiftButton,
  DemoTimeControls,
  InviteButton,
} from './shift-actions';

export const metadata: Metadata = { title: 'Chi tiết ca' };

/** Ca đã tới giờ bắt đầu chưa (hàm ngoài component: đọc đồng hồ khi có request) */
function hasStarted(startAt: string) {
  return new Date(startAt).getTime() <= Date.now();
}

type Booking = NonNullable<Awaited<ReturnType<typeof getShiftDetail>>['bookings']>[number];

/** Dòng chấm công của một người: giờ vào (đi muộn, khoảng cách), giờ ra, giờ công */
function attendanceLine(b: Booking) {
  if (b.status === 'completed' && b.worked_minutes !== null)
    return `${b.worked_minutes} phút · ${vnd(b.wage_amount ?? 0)} đã trả`;
  const parts: string[] = [];
  if (b.check_in_at)
    parts.push(
      `Vào ${fmtTime(b.check_in_at)}${b.check_in_distance_m !== null ? ` · cách ${b.check_in_distance_m} m` : ''}`,
    );
  if (b.check_out_at) parts.push(`Ra ${fmtTime(b.check_out_at)}`);
  if (b.worked_minutes !== null && b.status !== 'checked_in')
    parts.push(`${b.worked_minutes} phút`);
  return parts.join(' · ');
}

/** S3: chi tiết ca của quán, các chỗ cập nhật realtime (P1-15) */
export default async function ShopShiftPage({ params }: PageProps<'/shop/shifts/[id]'>) {
  const { id } = await params;
  const user = await requireRole('shop_owner');
  const detail = await getShiftDetail(user, id).catch((error: unknown) => {
    if (error instanceof ApiError && ['NOT_FOUND', 'VALIDATION_ERROR'].includes(error.code))
      notFound();
    throw error;
  });
  // Chỉ chủ quán nhận được danh sách booking; ca của quán khác → 404
  if (!detail.bookings) notFound();
  const { shift, shop, seats, bookings } = detail;
  const status = SHIFT_STATUS[shift.status] ?? { label: shift.status, tone: 'neutral' as const };
  const started = hasStarted(shift.start_at);
  // Đã có người check-in sớm (trước giờ bắt đầu 30 phút) thì không hủy cả ca nữa
  const cancellable =
    ['open', 'full'].includes(shift.status) &&
    !started &&
    !bookings.some((b) => b.status === 'checked_in');
  const [demo, invites, settings] = await Promise.all([
    demoEnabled(),
    invitedWorkerIds(shift.id),
    getSettings(),
  ]);
  const recruiting = shift.status === 'open' && !started;
  const live = ['open', 'full', 'in_progress'].includes(shift.status);

  return (
    <div className="grid gap-5">
      <Link
        href="/shop/shifts"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden /> Danh sách ca
      </Link>

      <section className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <span className="text-sm text-text-muted">{shop.name}</span>
        <h1 className="text-2xl leading-8 font-bold tracking-tight">{shift.title}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            <span className="cn-num text-lg text-text">
              {fmtRange(shift.start_at, shift.end_at)}
            </span>
          </span>
          <span>{fmtDay(shift.start_at)}</span>
          <span>{vnd(shift.hourly_rate)}/giờ</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {shift.hold_amount > 0 ? (
            <Badge
              tone="deposit"
              icon="shield-check"
            >{`Đã ký quỹ ${vnd(shift.hold_amount)}`}</Badge>
          ) : null}
          {shift.is_urgent ? (
            <Badge tone="urgent" icon="zap">
              Ca gấp
            </Badge>
          ) : null}
          {invites.length > 0 ? (
            <Badge tone="info">{`Đã mời ${invites.length} người`}</Badge>
          ) : null}
          {shift.favorites_only_until ? (
            <Badge
              tone="warn"
              icon="clock"
            >{`Ưu tiên người quen đến ${fmtDateTime(shift.favorites_only_until)}`}</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ShopLiveRefresh shopIds={[shift.shop_id]} label="Cập nhật trực tiếp" />
          <div className="flex flex-wrap gap-2">
            {live ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/shop/kiosk/${shop.id}`} target="_blank">
                  <QrCode aria-hidden /> Mở kiosk QR
                </Link>
              </Button>
            ) : null}
            {recruiting ? (
              <InviteButton
                shiftId={shift.id}
                shopId={shop.id}
                invited={invites.map((i) => i.worker_id)}
              />
            ) : null}
            {recruiting && !shift.is_urgent ? (
              <BoostButton shiftId={shift.id} fee={settings.urgent_boost_fee} />
            ) : null}
            {cancellable ? <CancelShiftButton shiftId={shift.id} /> : null}
          </div>
        </div>
      </section>

      {demo && live ? <DemoTimeControls shiftId={shift.id} canStart={!started} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Người làm</h2>
            <SeatSlotsLive headcount={shift.headcount} seats={seats} max={10} />
          </div>
          {bookings.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              Chưa có ai nhận ca. Ca đang hiện trên trang Khám phá của người làm gần quán.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {bookings.map((b) => {
                const bs = BOOKING_STATUS[b.status] ?? {
                  label: b.status,
                  tone: 'neutral' as const,
                };
                const line = attendanceLine(b);
                return (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 py-3"
                    data-testid="shift-booking"
                  >
                    {b.worker.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
                      <img
                        src={b.worker.avatar_url}
                        alt=""
                        className="size-10 rounded-full bg-lam-100"
                      />
                    ) : (
                      <span className="flex size-10 items-center justify-center rounded-full bg-lam-100 font-bold text-on-primary-soft">
                        {b.worker.full_name.at(0)}
                      </span>
                    )}
                    <span className="grid min-w-0 flex-1">
                      <Link
                        href={`/shop/workers/${b.worker.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {b.worker.full_name}
                      </Link>
                      {line ? (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          <MapPin className="size-3 shrink-0" aria-hidden /> {line}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          {b.worker.rating_count > 0 ? (
                            <>
                              <Star className="size-3 fill-current text-spark" aria-hidden />{' '}
                              {b.worker.rating_avg.toFixed(1)} ·{' '}
                            </>
                          ) : null}
                          {b.worker.completed_count} ca đã làm · nhận lúc {fmtDateTime(b.booked_at)}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      {b.is_late ? <Badge tone="warn">Đi muộn</Badge> : null}
                      <Badge tone={bs.tone}>
                        {b.status === 'checked_in' ? 'Đã đến' : bs.label}
                      </Badge>
                      {b.status === 'checked_out' ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href="/shop/timesheets">Duyệt</Link>
                        </Button>
                      ) : null}
                      {b.can_review ? (
                        <ReviewButton
                          bookingId={b.id}
                          direction="shop_to_worker"
                          subject={b.worker.full_name}
                          context={shift.title}
                        />
                      ) : null}
                      {b.status === 'confirmed' && !started ? (
                        <CancelBookingButton bookingId={b.id} who={b.worker.full_name} />
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid content-start gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold">Chi phí</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
            <dt className="text-text-muted">Tiền công mỗi người</dt>
            <dd className="cn-num text-right text-base">{vnd(shift.est_wage_per_seat)}</dd>
            <dt className="text-text-muted">Phí nền tảng {Math.round(shift.fee_rate * 100)}%</dt>
            <dd className="cn-num text-right text-base">{vnd(shift.est_fee_per_seat)}</dd>
            <dt className="text-text-muted">Số chỗ</dt>
            <dd className="text-right">{shift.headcount}</dd>
            <dt className="border-t border-border pt-2 font-semibold">Đang tạm giữ</dt>
            <dd className="cn-num border-t border-border pt-2 text-right text-2xl">
              {vnd(shift.hold_amount)}
            </dd>
          </dl>
          {shift.description ? (
            <p className="text-sm whitespace-pre-line text-text-muted">{shift.description}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
