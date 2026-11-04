import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { getPositions } from '@/lib/services/catalog';
import { listInvites } from '@/lib/services/invites';
import { workerStanding } from '@/lib/services/profile';
import { InviteCard } from '@/components/worker/invite-card';
import { ShiftExplorer } from './shift-explorer';

export const metadata: Metadata = { title: 'Khám phá ca' };

/** W3: Khám phá ca dạng danh sách (P1-09). Bản đồ là P3-01. */
export default async function ExplorePage() {
  // Đọc phiên trước khi lấy dữ liệu: trang chạy lúc có request, không bị prerender lúc build
  const user = await requireRole('worker');
  const [positions, standing, invites] = await Promise.all([
    getPositions(),
    workerStanding(user.id),
    listInvites(user.id, 'pending'),
  ]);
  return (
    <>
      {standing.suspended_until ? (
        <div
          role="alert"
          data-testid="suspension-banner"
          className="mb-4 flex items-start gap-3 rounded-[var(--radius-card)] bg-danger-soft p-4 text-sm text-on-danger-soft"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="grid gap-1">
            <strong className="text-base">
              Bạn đang bị tạm khóa nhận ca đến {fmtDateTime(standing.suspended_until)}
            </strong>
            <span>
              Có {standing.penalty_points} điểm phạt trong 30 ngày gần nhất (hủy sát giờ, vắng mặt).
              Bạn vẫn xem được ca và làm các ca đã nhận.{' '}
              <Link href="/worker/bookings?tab=history" className="font-semibold underline">
                Xem lịch sử
              </Link>
            </span>
          </p>
        </div>
      ) : null}
      {invites.length > 0 ? (
        <section className="mb-4 grid gap-2" aria-label="Lời mời làm ca">
          <ul className="grid gap-2">
            {invites.slice(0, 3).map((i) => (
              <InviteCard key={i.id} invite={i} />
            ))}
          </ul>
        </section>
      ) : null}
      <ShiftExplorer positions={positions} />
    </>
  );
}
