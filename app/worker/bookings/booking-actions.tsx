'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { CancelDialog } from '@/components/booking/cancel-dialog';
import { LivePulse } from '@/components/cn/live-pulse';
import { Button } from '@/components/ui/button';
import { useRealtime } from '@/lib/realtime/use-realtime';

/** Nghe booking của chính mình (kênh my-bookings): quán duyệt, hủy, hệ thống tự check-out → tải lại trang */
export function MyBookingsLive({ userId }: { userId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = useRealtime({
    channel: `my-bookings:${userId}`,
    table: 'bookings',
    filter: `worker_id=eq.${userId}`,
    onChange: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 250);
    },
  });
  return <LivePulse status={status} label="Cập nhật trực tiếp" />;
}

/** Người làm hủy ca đã nhận: hộp xác nhận ghi rõ điểm phạt (Gherkin 02 §6.4) */
export function WorkerCancelButton({ bookingId }: { bookingId: string }) {
  return (
    <CancelDialog
      target={{ kind: 'booking', id: bookingId }}
      trigger={
        <Button variant="ghost" size="sm">
          Hủy ca
        </Button>
      }
    />
  );
}
