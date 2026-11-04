'use client';

import { CheckCircle2, LoaderCircle, MapPin, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/cn/badge';
import { Button } from '@/components/ui/button';
import { fmtDateTime, fmtRange, fmtTime, vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import type { CheckinTarget } from '@/lib/services/attendance';

type Result = {
  accepted: true;
  distance_m: number | null;
  booking: {
    check_in_at?: string;
    check_out_at?: string;
    is_late?: boolean;
    worked_minutes?: number;
    wage_amount?: number;
  };
};

type State =
  | { step: 'locating' }
  | { step: 'sending' }
  | { step: 'done'; result: Result }
  | { step: 'failed'; error: ApiClientError };

/** Lấy vị trí GPS độ chính xác cao; bị từ chối hoặc quá giờ thì gửi không kèm vị trí (CSDL báo LOCATION_REQUIRED) */
function locate(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });
}

const HINT: Record<string, string> = {
  QR_EXPIRED: 'Mã trên kiosk đổi mỗi 30 giây. Hãy quét lại mã đang hiển thị.',
  OUT_OF_GEOFENCE: 'Hãy đứng tại quán rồi quét lại. Lần quét này đã được ghi lại.',
  LOCATION_REQUIRED: 'Bật định vị cho trình duyệt (Cài đặt → Quyền riêng tư → Vị trí) rồi thử lại.',
  WRONG_SHOP: 'Ca của bạn ở quán khác. Kiểm tra lại trong Ca của tôi.',
  OUTSIDE_CHECKIN_WINDOW: 'Check-in mở trước giờ bắt đầu 30 phút.',
};

/** W6: gửi check-in hoặc check-out kèm vị trí, hiện kết quả rõ ràng (Gherkin 02 §6.5) */
export function AttendanceFlow({ token, target }: { token: string; target: CheckinTarget }) {
  const [state, setState] = useState<State>({ step: 'locating' });
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  const action = target.action;
  const booking = target.booking;

  useEffect(() => {
    if (!action || !booking || started.current === attempt) return;
    started.current = attempt;
    void (async () => {
      const pos = await locate();
      setState({ step: 'sending' });
      try {
        const result = await api<Result>(
          `/bookings/${booking.id}/${action === 'check_in' ? 'check-in' : 'check-out'}`,
          {
            body: {
              token,
              ...(pos
                ? {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy_m: Math.round(pos.coords.accuracy),
                  }
                : {}),
            },
          },
        );
        // Rung 30 ms (Android). Trình duyệt chỉ cho rung sau khi người dùng đã chạm vào trang: mở từ
        // trang quét QR trong app thì được, mở thẳng từ camera hệ thống thì bỏ qua.
        if (action === 'check_in' && navigator.userActivation?.hasBeenActive)
          navigator.vibrate?.(30);
        setState({ step: 'done', result });
      } catch (err) {
        setState({
          step: 'failed',
          error:
            err instanceof ApiClientError
              ? err
              : new ApiClientError(0, 'INTERNAL_ERROR', 'Có lỗi xảy ra, vui lòng thử lại'),
        });
      }
    })();
  }, [action, booking, token, attempt]);

  if (!action || !booking) {
    return (
      <Panel tone="muted" title={`Bạn không có ca nào tại ${target.shop.name} lúc này`}>
        <p className="text-sm text-text-muted">
          {target.opens_at
            ? `Ca tiếp theo của bạn tại quán mở check-in lúc ${fmtDateTime(target.opens_at)}.`
            : 'Chỉ ca bạn đã nhận và đang trong giờ check-in mới chấm công được.'}
        </p>
        <Button asChild variant="outline" block>
          <Link href="/worker/bookings">Xem Ca của tôi</Link>
        </Button>
      </Panel>
    );
  }

  const heading = action === 'check_in' ? 'Check-in' : 'Check-out';
  const shiftLine = `${booking.shift.title} · ${fmtRange(booking.shift.start_at, booking.shift.end_at)}`;

  if (state.step === 'locating' || state.step === 'sending') {
    return (
      <Panel
        tone="muted"
        title={state.step === 'locating' ? 'Đang lấy vị trí…' : `Đang ${heading.toLowerCase()}…`}
      >
        <p className="text-sm text-text-muted">
          {target.shop.name} · {shiftLine}
        </p>
        <LoaderCircle className="mx-auto size-10 animate-spin text-primary" aria-hidden />
      </Panel>
    );
  }

  if (state.step === 'done') {
    const b = state.result.booking;
    const at = action === 'check_in' ? b.check_in_at : b.check_out_at;
    const distance = state.result.distance_m;
    return (
      <Panel
        tone="success"
        title={`${heading} lúc ${at ? fmtTime(at) : '--:--'}${distance !== null ? ` · cách quán ${distance} m` : ''}`}
      >
        <p className="text-sm text-text-muted">
          {target.shop.name} · {shiftLine}
        </p>
        {action === 'check_in' && b.is_late ? <Badge tone="warn">Đi muộn</Badge> : null}
        {action === 'check_out' && b.worked_minutes !== undefined ? (
          <p className="text-base">
            <span className="cn-num text-2xl">{b.worked_minutes}</span> phút ·{' '}
            <span className="cn-num text-2xl text-money">{vnd(b.wage_amount ?? 0)}</span>
            <span className="block text-sm text-text-muted">
              Đã gửi giờ công cho quán duyệt. Duyệt xong tiền vào ví ngay.
            </span>
          </p>
        ) : (
          <p className="text-sm text-text-muted">Quán đã thấy bạn đến. Chúc ca làm suôn sẻ!</p>
        )}
        <Button asChild block>
          <Link href={action === 'check_out' ? '/worker/wallet' : '/worker/bookings?tab=active'}>
            {action === 'check_out' ? 'Xem ví' : 'Xem ca đang làm'}
          </Link>
        </Button>
      </Panel>
    );
  }

  const { error } = state;
  const details = (error.details ?? {}) as { allowed_m?: number };
  return (
    <Panel tone="danger" title={error.message}>
      <p className="text-sm text-text-muted">
        {HINT[error.code] ?? 'Thử lại sau ít giây.'}
        {error.code === 'OUT_OF_GEOFENCE' && details.allowed_m
          ? ` Phạm vi cho phép: ${details.allowed_m} m.`
          : ''}
      </p>
      <div className="grid gap-2">
        {error.code === 'QR_EXPIRED' || error.code === 'QR_INVALID' ? (
          <Button asChild block>
            <Link href="/worker/scan">Quét lại</Link>
          </Button>
        ) : (
          <Button
            block
            onClick={() => {
              setState({ step: 'locating' });
              setAttempt((n) => n + 1);
            }}
          >
            Thử lại
          </Button>
        )}
        <Button asChild variant="ghost" block>
          <Link href="/worker/bookings">Ca của tôi</Link>
        </Button>
      </div>
    </Panel>
  );
}

function Panel({
  tone,
  title,
  children,
}: {
  tone: 'muted' | 'success' | 'danger';
  title: string;
  children: React.ReactNode;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' ? XCircle : MapPin;
  const color =
    tone === 'success' ? 'text-money' : tone === 'danger' ? 'text-danger' : 'text-primary';
  return (
    <section
      role={tone === 'muted' ? 'status' : 'alert'}
      className="grid w-full justify-items-center gap-4 rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-[var(--shadow-card)]"
    >
      <Icon className={`size-14 ${color}`} aria-hidden />
      <h1 className="text-xl leading-7 font-bold" data-testid="attendance-title">
        {title}
      </h1>
      <div className="grid w-full gap-3">{children}</div>
    </section>
  );
}
