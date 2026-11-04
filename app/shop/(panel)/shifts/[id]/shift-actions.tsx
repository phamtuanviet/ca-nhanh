'use client';

import { FastForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { CancelDialog } from '@/components/booking/cancel-dialog';
import { Button } from '@/components/ui/button';
import { fmtRange } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';

/** Quán hủy cả ca (US-26): xem trước bồi thường và tiền hoàn rồi mới hủy */
export function CancelShiftButton({ shiftId }: { shiftId: string }) {
  return (
    <CancelDialog
      target={{ kind: 'shift', id: shiftId }}
      trigger={
        <Button variant="destructive" size="sm">
          Hủy ca
        </Button>
      }
    />
  );
}

/** Quán hủy một người đã nhận (US-15) */
export function CancelBookingButton({ bookingId, who }: { bookingId: string; who: string }) {
  return (
    <CancelDialog
      target={{ kind: 'booking', id: bookingId, who }}
      trigger={
        <Button variant="ghost" size="sm" aria-label={`Hủy ca của ${who}`}>
          Hủy
        </Button>
      }
    />
  );
}

type Shifted = { start_at: string; end_at: string };

/**
 * Công cụ demo (P2-08, Gherkin 02 §6.11): dời ca để bắt đầu sau 1 phút, hoặc vừa kết thúc 1 phút trước.
 * Chỉ hiện khi bật DEMO_MODE; API kiểm tra lại quyền chủ quán.
 */
export function DemoTimeControls({ shiftId, canStart }: { shiftId: string; canStart: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<'start' | 'end' | null>(null);

  async function jump(to: 'start' | 'end') {
    setPending(to);
    try {
      const shift = await api<Shifted>('/admin/demo/fast-forward', {
        body: { shift_id: shiftId, to },
      });
      toast.success(to === 'start' ? 'Đã tua tới giờ bắt đầu' : 'Đã tua tới giờ kết thúc', {
        description: `Ca giờ là ${fmtRange(shift.start_at, shift.end_at)}`,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Không tua được, thử lại sau');
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      className="grid gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong p-4"
      aria-label="Công cụ demo"
    >
      <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">
        Công cụ demo · tua thời gian
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => jump('start')}
          disabled={pending !== null || !canStart}
        >
          <FastForward aria-hidden />
          {pending === 'start' ? 'Đang tua…' : 'Tua tới giờ bắt đầu'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => jump('end')} disabled={pending !== null}>
          <FastForward aria-hidden />
          {pending === 'end' ? 'Đang tua…' : 'Tua tới giờ kết thúc'}
        </Button>
      </div>
    </section>
  );
}
