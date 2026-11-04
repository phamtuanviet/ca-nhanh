'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fmtAgo } from '@/lib/format';
import { api, apiList } from '@/lib/http';
import { useRealtime } from '@/lib/realtime/use-realtime';
import type { Role } from '@/lib/roles';

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
  read_at: string | null;
  created_at: string;
};

/** Màn hình mở khi bấm vào thông báo (P2-10, 01 §3.13) */
export function targetOf(n: Pick<Notification, 'type' | 'data'>, role: Role): string | null {
  const data = n.data ?? {};
  // Admin chỉ nhận thông báo khiếu nại; trang khiếu nại thuộc khu quản trị (Phase 3)
  if (role === 'admin') return data.dispute_id ? '/admin' : null;
  const shop = role === 'shop_owner';
  const shift = data.shift_id
    ? shop
      ? `/shop/shifts/${data.shift_id}`
      : `/worker/shifts/${data.shift_id}`
    : null;
  switch (n.type) {
    // Tiền
    case 'wallet.topup_succeeded':
      return '/shop/wallet';
    case 'earning.credited':
    case 'wallet.withdrawal_succeeded':
    case 'wallet.withdrawal_failed':
      return shop ? '/shop/wallet' : '/worker/wallet';
    // Chấm công, duyệt giờ công
    case 'timesheet.pending':
      return '/shop/timesheets';
    case 'attendance.checked_in':
    case 'booking.created':
    case 'booking.cancelled_by_worker':
    case 'booking.no_show':
    case 'shift.expired':
    case 'invite.declined':
      return shift ?? '/shop';
    case 'attendance.auto_checked_out':
      return '/worker/bookings?tab=pending_approval';
    // Người làm: ca sắp tới, bị hủy, điểm phạt
    case 'booking.reminder':
      return '/worker/bookings';
    case 'booking.cancelled_by_shop':
    case 'shift.cancelled':
    case 'account.penalty':
      return '/worker/bookings?tab=history';
    case 'account.suspended':
      return '/worker';
    case 'shift.seat_reopened':
    case 'shift.priority_invite':
    case 'shift.urgent_nearby':
    case 'invite.received':
      return shift ?? '/worker';
    case 'kyc.reviewed':
      return '/worker/profile';
    case 'shop.reviewed':
      return '/shop/settings';
    case 'account.unsuspended':
    case 'account.unlocked':
      return shop ? '/shop' : '/worker';
    case 'review.received':
    case 'dispute.opened':
    case 'dispute.resolved':
      return shop ? '/shop/timesheets' : '/worker/bookings?tab=history';
  }
  if (data.payment_order_id) return shop ? '/shop/wallet' : '/worker/wallet';
  if (shift) return shift;
  if (data.booking_id) return shop ? '/shop' : '/worker/bookings';
  return null;
}

/** Chuông thông báo (FR-NTF-01): số chưa đọc, toast khi có thông báo mới qua Realtime */
export function NotificationBell({ userId, role }: { userId: string; role: Role }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) =>
      apiList<Notification, { unread_count: number }>('/notifications?limit=8', signal),
  });

  useRealtime({
    channel: `notifications:${userId}`,
    table: 'notifications',
    event: 'INSERT',
    filter: `user_id=eq.${userId}`,
    onChange: (payload) => {
      const n = payload.new as Notification;
      toast(n.title, { description: n.body ?? undefined });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unread = data?.meta.unread_count ?? 0;
  const items = data?.data ?? [];

  async function markRead(body: { ids: number[] } | { all: true }) {
    await api('/notifications/read', { body }).catch(() => null);
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative flex size-10 items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-sunken hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={unread ? `Thông báo, ${unread > 9 ? '9+' : unread} chưa đọc` : 'Thông báo'}
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-[18px] font-bold text-on-danger">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-text">
            Thông báo
          </DropdownMenuLabel>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => markRead({ all: true })}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" aria-hidden /> Đánh dấu đã đọc
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-text-muted">Chưa có thông báo nào</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="grid cursor-pointer items-start gap-0.5 py-2"
              onSelect={() => {
                if (!n.read_at) void markRead({ ids: [n.id] });
                const target = targetOf(n, role);
                if (target) router.push(target);
              }}
            >
              <span className="flex items-start gap-2">
                {!n.read_at ? (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    role="img"
                    aria-label="Chưa đọc"
                  />
                ) : (
                  <span className="mt-1.5 size-2 shrink-0" />
                )}
                <span className="grid gap-0.5">
                  <span
                    className={
                      n.read_at ? 'text-sm text-text-muted' : 'text-sm font-semibold text-text'
                    }
                  >
                    {n.title}
                  </span>
                  {n.body ? <span className="text-xs text-text-muted">{n.body}</span> : null}
                  <span className="text-[11px] text-text-muted">{fmtAgo(n.created_at)}</span>
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
