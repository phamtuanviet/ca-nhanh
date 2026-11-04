'use client';

import { useSyncExternalStore } from 'react';

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Đồng hồ dùng chung, nhảy mỗi giây; ở server chưa có giờ nên hiện "--:--"
const subscribe = (tick: () => void) => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
};
const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Đếm ngược tới giờ vào ca; dưới 15 phút đổi sang màu nghệ (design/COMPONENTS.md › Countdown).
 * Chỉ đổi số mỗi giây; còn từ 1 ngày trở lên thì hiện số ngày.
 */
export function Countdown({
  target,
  label = 'Vào ca sau',
  doneLabel = 'Đến giờ vào ca',
  soonMinutes = 15,
}: {
  target: string;
  label?: string;
  doneLabel?: string;
  soonMinutes?: number;
}) {
  const now = useSyncExternalStore(subscribe, nowSeconds, () => null);
  const left = now === null ? null : new Date(target).getTime() - now * 1000;
  if (left !== null && left <= 0) {
    return <span className="cn-countdown cn-countdown--now">{doneLabel}</span>;
  }
  const soon = left !== null && left <= soonMinutes * 60_000;
  const days = left !== null ? Math.floor(left / 86_400_000) : 0;
  return (
    <span className={soon ? 'cn-countdown cn-countdown--soon' : 'cn-countdown'}>
      {label}{' '}
      <span className="cn-countdown__time">
        {left === null ? '--:--' : days >= 1 ? `${days} ngày` : format(left)}
      </span>
    </span>
  );
}
