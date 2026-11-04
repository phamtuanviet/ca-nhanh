'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { LivePulse } from '@/components/cn/live-pulse';
import { useRealtime } from '@/lib/realtime/use-realtime';

function ShopChannel({
  shopId,
  onChange,
  label,
}: {
  shopId: string;
  onChange: () => void;
  label?: string;
}) {
  const status = useRealtime({
    channel: `shop-bookings:${shopId}`,
    table: 'bookings',
    filter: `shop_id=eq.${shopId}`,
    onChange,
  });
  return label ? <LivePulse status={status} label={label} /> : null;
}

/**
 * Nghe booking của các quán (kênh shop-bookings) và tải lại dữ liệu trang khi có người nhận, hủy, check-in.
 * Thông báo "X đã nhận ca" do chuông thông báo hiện; ở đây chỉ làm mới chỗ.
 */
export function ShopLiveRefresh({ shopIds, label }: { shopIds: string[]; label: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 250);
  };
  return (
    <>
      {shopIds.map((id, i) => (
        <ShopChannel key={id} shopId={id} onChange={refresh} label={i === 0 ? label : undefined} />
      ))}
    </>
  );
}
