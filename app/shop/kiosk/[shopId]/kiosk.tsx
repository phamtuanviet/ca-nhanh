'use client';

import { ArrowLeft, Expand } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { LivePulse } from '@/components/cn/live-pulse';
import { Button } from '@/components/ui/button';
import { fmtTime } from '@/lib/format';
import { api } from '@/lib/http';
import { useRealtime } from '@/lib/realtime/use-realtime';
import type { Arrival } from '@/lib/services/attendance';

type Token = {
  token: string;
  qr_payload: string;
  window: number;
  rotation_seconds: number;
  expires_at: string;
};

const R = 46;
const CIRC = 2 * Math.PI * R;

// Đồng hồ 4 lần mỗi giây cho vòng đếm ngược; ở server chưa có giờ.
// Giá trị giữ trong biến ngoài để getSnapshot trả cùng một số giữa hai nhịp (React yêu cầu ổn định).
let quarter = 0;
const readClock = () => Math.floor(Date.now() / 250) * 250;
const subscribe = (tick: () => void) => {
  const timer = setInterval(() => {
    quarter = readClock();
    tick();
  }, 250);
  return () => clearInterval(timer);
};
const nowQuarter = () => {
  if (quarter === 0) quarter = readClock();
  return quarter;
};

/**
 * Kiosk QR trên tablet của quán (design/COMPONENTS.md › QrKiosk): mã đổi mỗi 30 giây, vòng nghệ cạn
 * theo thời gian còn lại, QR lật khi đổi mã, giữ màn hình sáng, danh sách người đã đến hôm nay.
 */
export function Kiosk({
  shop,
  initialToken,
  arrivals,
}: {
  shop: { id: string; name: string };
  initialToken: Token;
  arrivals: Arrival[];
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const now = useSyncExternalStore(subscribe, nowQuarter, () => null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Vẽ QR thật (SVG) cho URL deep link /c/<token>
  useEffect(() => {
    let alive = true;
    void QRCode.toString(token.qr_payload, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
    }).then((s) => {
      if (alive) setSvg(s);
    });
    return () => {
      alive = false;
    };
  }, [token.qr_payload]);

  // Sang cửa sổ 30 giây mới thì lấy mã mới (05 §4.3: gọi lại khi qua expires_at).
  // Phụ thuộc cả object token: đồng hồ tablet nhanh hơn server thì server trả lại đúng mã cũ, effect vẫn
  // chạy lại và hỏi tiếp sau ít nhất 1 giây (server vẫn nhận mã của cửa sổ liền trước nên không lỡ lượt quét).
  useEffect(() => {
    const wait = Math.max(new Date(token.expires_at).getTime() - Date.now() + 150, 1000);
    const timer = setTimeout(() => {
      api<Token>(`/shops/${shop.id}/checkin-token`)
        .then((next) => {
          setToken(next);
          setError(false);
        })
        .catch(() => {
          // Mất mạng hoặc phiên hết hạn: báo trên LivePulse và thử lại sau 3 giây
          setError(true);
          setTimeout(() => setAttempt((n) => n + 1), 3000);
        });
    }, wait);
    return () => clearTimeout(timer);
  }, [token, shop.id, attempt]);

  // Giữ màn hình sáng (Wake Lock); bị từ chối thì thôi
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          lock = l;
        })
        .catch(() => {});
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => {});
    };
  }, []);

  // Có người check-in → tải lại danh sách đã đến
  const status = useRealtime({
    channel: `shop-bookings:${shop.id}`,
    table: 'bookings',
    event: 'UPDATE',
    filter: `shop_id=eq.${shop.id}`,
    onChange: () => router.refresh(),
  });

  const total = token.rotation_seconds * 1000;
  const left = now === null ? total : Math.max(new Date(token.expires_at).getTime() - now, 0);
  const seconds = Math.ceil(left / 1000);

  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl content-center gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
      <div className="flex items-center justify-between lg:col-span-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/shop">
            <ArrowLeft aria-hidden /> Về trang quán
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})}
        >
          <Expand aria-hidden /> Toàn màn hình
        </Button>
      </div>

      <section className="cn-kiosk" aria-label={`Mã QR chấm công của ${shop.name}`}>
        <h1 className="text-center text-2xl font-bold">{shop.name}</h1>
        <p className="text-center text-text-muted">Quét mã để check-in hoặc check-out</p>
        <div className="cn-kiosk__frame" ref={frameRef} style={{ width: 'min(400px, 78vw)' }}>
          <svg className="cn-kiosk__ring" viewBox="0 0 100 100" aria-hidden>
            <circle className="cn-kiosk__track" cx="50" cy="50" r={R} />
            <circle
              className="cn-kiosk__progress"
              cx="50"
              cy="50"
              r={R}
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - left / total)}
            />
          </svg>
          <div
            key={token.window}
            className="cn-kiosk__qr cn-kiosk__qr--flip"
            data-testid="kiosk-qr"
            data-token={token.token}
            role="img"
            aria-label="Mã QR chấm công, đổi mỗi 30 giây"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
        <p className="cn-kiosk__secs" aria-live="off">
          Mã đổi sau <b>{seconds}</b> giây
        </p>
        <LivePulse status={error ? 'offline' : status} label="Kiosk đang mở" />
      </section>

      <section className="grid content-start gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-bold">Đã đến hôm nay ({arrivals.length})</h2>
        {arrivals.length === 0 ? (
          <p className="text-text-muted">Chưa có ai check-in hôm nay.</p>
        ) : (
          <ul className="grid gap-2" aria-live="polite">
            {arrivals.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
                  <img src={a.avatar_url} alt="" className="size-10 rounded-full bg-lam-100" />
                ) : (
                  <span className="size-10 rounded-full bg-lam-100" aria-hidden />
                )}
                <span className="grid">
                  <span className="text-base font-semibold">{a.full_name}</span>
                  <span className="text-sm text-text-muted">
                    Đến lúc {fmtTime(a.check_in_at)}
                    {a.is_late ? ' · đi muộn' : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
