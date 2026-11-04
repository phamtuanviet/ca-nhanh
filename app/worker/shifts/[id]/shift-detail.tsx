'use client';

import { ArrowLeft, Clock, MapPin, Navigation, ShieldCheck, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { CancelDialog } from '@/components/booking/cancel-dialog';
import { Badge } from '@/components/cn/badge';
import { SeatSlots } from '@/components/cn/seat-slots';
import { ShiftTicket } from '@/components/cn/shift-ticket';
import { Stamp } from '@/components/cn/stamp';
import { Button } from '@/components/ui/button';
import { fmtDay, fmtRange, fmtTime, vnd } from '@/lib/format';
import { api, apiList, ApiClientError } from '@/lib/http';
import { useRealtime } from '@/lib/realtime/use-realtime';
import type { ShiftDetail } from '@/lib/services/shifts';

type Similar = {
  shift_id: string;
  shop_name: string;
  shop_rating: number;
  shop_cover_url: string | null;
  title: string;
  start_at: string;
  end_at: string;
  hourly_rate: number;
  est_earning: number;
  distance_m: number;
  headcount: number;
  filled_count: number;
  is_urgent: boolean;
};

type Outcome = 'idle' | 'booked' | 'full';

export function ShiftDetailView({ detail }: { detail: ShiftDetail }) {
  const router = useRouter();
  const { shift, shop, seats, viewer } = detail;
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(viewer?.my_booking_id ? 'booked' : 'idle');
  const [error, setError] = useState<ApiClientError | null>(null);
  // Số chỗ lúc mở trang: có người nhận thêm thì avatar mới nhất chạy hiệu ứng lấp chỗ
  const [initialFilled] = useState(shift.filled_count);
  const popSeat = shift.filled_count > initialFilled;

  // Số chỗ thay đổi realtime (người khác nhận ca) → tải lại dữ liệu trang
  useRealtime({
    channel: `shift:${shift.id}`,
    table: 'shifts',
    event: 'UPDATE',
    filter: `id=eq.${shift.id}`,
    onChange: () => router.refresh(),
  });

  const isFull = shift.status === 'full' || outcome === 'full';
  const booked = outcome === 'booked' || viewer?.my_booking_id;
  const seatsLeft = Math.max(shift.headcount - shift.filled_count, 0);
  const favoritesUntil =
    viewer?.favorites_only_active && shift.favorites_only_until
      ? fmtTime(shift.favorites_only_until)
      : null;

  // Ca đủ người (khi mở trang hoặc vừa tranh chỗ thua): gợi ý 3 ca cùng vị trí trong 5 km
  const showSimilar = isFull && !booked && shop.lat !== null && shop.lng !== null;
  const { data: similar = null } = useQuery({
    queryKey: ['similar', shift.id],
    enabled: showSimilar,
    queryFn: async ({ signal }) => {
      const q = new URLSearchParams({
        lat: String(shop.lat),
        lng: String(shop.lng),
        radius_km: '5',
        positions: shift.position_code,
        limit: '4',
      });
      const res = await apiList<Similar>(`/shifts?${q}`, signal);
      return res.data.filter((s) => s.shift_id !== shift.id).slice(0, 3);
    },
  });

  async function book() {
    setPending(true);
    setError(null);
    try {
      await api(`/shifts/${shift.id}/bookings`, { method: 'POST' });
      setOutcome('booked');
      toast.success('Đã nhận ca', {
        description: `${shift.title} · ${fmtRange(shift.start_at, shift.end_at)} ${fmtDay(shift.start_at)}`,
      });
      router.refresh();
    } catch (err) {
      const apiError = err instanceof ApiClientError ? err : null;
      if (apiError?.code === 'SHIFT_FULL') {
        setOutcome('full');
      } else if (apiError?.code === 'ALREADY_BOOKED') {
        setOutcome('booked');
        router.refresh();
      } else {
        setError(
          apiError ?? new ApiClientError(0, 'INTERNAL_ERROR', 'Có lỗi xảy ra, vui lòng thử lại'),
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 pb-24">
      <Link
        href="/worker"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden /> Khám phá ca
      </Link>

      <section className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        {shop.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa đã nén sẵn
          <img src={shop.cover_url} alt="" className="aspect-[3/1] w-full object-cover" />
        ) : null}
        <div className="relative grid gap-3 p-5">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="font-medium text-text">{shop.name}</span>
            {shop.rating_count > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <Star className="size-3.5 fill-current text-spark" aria-hidden />{' '}
                {shop.rating_avg.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl leading-8 font-bold tracking-tight text-balance">
            {shift.title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              <span className="cn-num text-lg text-text">
                {fmtRange(shift.start_at, shift.end_at)}
              </span>
            </span>
            <span>{fmtDay(shift.start_at)}</span>
            {shift.break_minutes > 0 ? <span>nghỉ {shift.break_minutes} phút</span> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {shift.hold_amount > 0 ? (
              <Badge tone="deposit" icon="shield-check">
                Đã ký quỹ
              </Badge>
            ) : null}
            {shift.is_urgent ? (
              <Badge tone="urgent" icon="zap">
                Ca gấp
              </Badge>
            ) : null}
            {favoritesUntil ? (
              <Badge tone="warn" icon="clock">{`Ưu tiên người quen đến ${favoritesUntil}`}</Badge>
            ) : null}
          </div>
          {booked ? (
            <Stamp
              text="Đã nhận"
              animate={outcome === 'booked' && !viewer?.my_booking_id}
              className="absolute right-5 bottom-5"
            />
          ) : isFull ? (
            <Stamp
              text="Đủ người"
              animate={outcome === 'full'}
              className="absolute right-5 bottom-5"
            />
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="grid gap-1 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <span className="text-xs font-semibold text-text-muted">Thu nhập dự kiến</span>
          <strong className="cn-num text-4xl text-money">{vnd(shift.est_wage_per_seat)}</strong>
          <span className="text-xs text-text-muted">{vnd(shift.hourly_rate)}/giờ</span>
        </div>
        <div className="grid content-between gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
            <Users className="size-3.5" aria-hidden /> Chỗ
          </span>
          <SeatSlots headcount={shift.headcount} seats={seats} animateLast={popSeat} />
          <span className="text-xs text-text-muted">
            {isFull ? 'Đã đủ người' : `Còn ${seatsLeft} chỗ`}
          </span>
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-[var(--radius-card)] bg-money-soft p-4 text-sm text-on-money-soft">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Quán đã tạm giữ tiền công của ca này trên Ca Nhanh. Làm xong và quán duyệt giờ công là
          tiền vào ví của bạn ngay.
        </p>
      </section>

      {shift.description || shift.requirements || shift.min_rating > 0 ? (
        <section className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          {shift.description ? (
            <div className="grid gap-1">
              <h2 className="font-semibold">Công việc</h2>
              <p className="text-sm whitespace-pre-line text-text-muted">{shift.description}</p>
            </div>
          ) : null}
          {shift.requirements ? (
            <div className="grid gap-1">
              <h2 className="font-semibold">Yêu cầu</h2>
              <p className="text-sm whitespace-pre-line text-text-muted">{shift.requirements}</p>
            </div>
          ) : null}
          {shift.min_rating > 0 ? (
            <p className="text-sm text-text-muted">
              Điểm đánh giá tối thiểu: {shift.min_rating.toFixed(1)}★
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-1 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <MapPin className="size-4 text-primary" aria-hidden /> {shop.address}
          </span>
          {shop.district ? <span className="text-text-muted">{shop.district}</span> : null}
          {shop.phone ? <span className="text-text-muted">SĐT quán: {shop.phone}</span> : null}
        </div>
        {shop.lat !== null && shop.lng !== null ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation aria-hidden /> Chỉ đường
            </a>
          </Button>
        ) : null}
      </section>

      {error ? (
        <div
          role="alert"
          className="grid gap-1 rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
        >
          <span className="font-semibold">{error.message}</span>
          {error.code === 'KYC_REQUIRED' ? (
            <Link href="/worker/profile" className="underline">
              Xác minh danh tính
            </Link>
          ) : null}
        </div>
      ) : null}

      {outcome === 'full' || (isFull && !booked) ? (
        <section className="grid gap-3">
          <h2 className="font-semibold">
            {outcome === 'full' ? 'Ca vừa đủ người. Thử các ca tương tự:' : 'Ca tương tự gần đây'}
          </h2>
          {similar === null ? (
            <div className="cn-skel h-32 rounded-[var(--radius-ticket)]" />
          ) : similar.length === 0 ? (
            <p className="text-sm text-text-muted">Chưa có ca tương tự trong 5 km.</p>
          ) : (
            similar.map((s) => (
              <ShiftTicket
                key={s.shift_id}
                href={`/worker/shifts/${s.shift_id}`}
                shopName={s.shop_name}
                shopLogoUrl={s.shop_cover_url}
                shopRating={s.shop_rating || null}
                title={s.title}
                startAt={s.start_at}
                endAt={s.end_at}
                hourlyRate={s.hourly_rate}
                estEarning={s.est_earning}
                distanceM={s.distance_m}
                headcount={s.headcount}
                filledCount={s.filled_count}
                isUrgent={s.is_urgent}
                deposited
              />
            ))
          )}
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          {booked ? (
            <div className="flex gap-2">
              <Button asChild size="lg" block variant="secondary" className="flex-1">
                <Link href="/worker/bookings">Đã nhận ca · Xem Ca của tôi</Link>
              </Button>
              {viewer?.my_booking_id &&
              viewer.my_booking_status === 'confirmed' &&
              ['open', 'full'].includes(shift.status) ? (
                <CancelDialog
                  target={{ kind: 'booking', id: viewer.my_booking_id }}
                  onCancelled={() => setOutcome('idle')}
                  trigger={
                    <Button size="lg" variant="outline">
                      Hủy ca
                    </Button>
                  }
                />
              ) : null}
            </div>
          ) : isFull ? (
            <Button size="lg" block disabled>
              Ca đã đủ người
            </Button>
          ) : (
            <Button size="lg" block onClick={book} disabled={pending}>
              {pending ? 'Đang nhận ca…' : `Nhận ca · ${vnd(shift.est_wage_per_seat)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
