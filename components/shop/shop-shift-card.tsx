import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/cn/badge';
import { SeatSlotsLive } from '@/components/cn/seat-slots-live';
import { fmtDay, fmtRange, vnd } from '@/lib/format';
import { SHIFT_STATUS } from '@/lib/labels';
import type { ShopShift } from '@/lib/services/shifts';

/** Thẻ ca ở phía quán: giờ, chỗ đã lấp (avatar), tiền đang tạm giữ, giờ công chờ duyệt */
export function ShopShiftCard({ shift, shopName }: { shift: ShopShift; shopName?: string }) {
  const status = SHIFT_STATUS[shift.status] ?? { label: shift.status, tone: 'neutral' as const };
  return (
    <Link
      href={`/shop/shifts/${shift.id}`}
      className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          {shopName ? (
            <span className="truncate text-xs font-medium text-text-muted">{shopName}</span>
          ) : null}
          <span className="font-semibold">{shift.title}</span>
          <span className="text-sm text-text-muted">
            <span className="cn-num text-base text-text">
              {fmtRange(shift.start_at, shift.end_at)}
            </span>{' '}
            · {fmtDay(shift.start_at)} · {vnd(shift.hourly_rate)}/giờ
          </span>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeatSlotsLive headcount={shift.headcount} seats={shift.seats} max={8} />
        <div className="flex flex-wrap gap-2">
          {shift.pending_approval_count > 0 ? (
            <span className="cn-badge cn-badge--warn">
              <ClipboardCheck aria-hidden /> {shift.pending_approval_count} chờ duyệt
            </span>
          ) : null}
          {shift.hold_amount > 0 ? (
            <Badge
              tone="deposit"
              icon="shield-check"
            >{`Đã ký quỹ ${vnd(shift.hold_amount)}`}</Badge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
