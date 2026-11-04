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

/** Màn hình mở khi bấm vào thông báo */
function targetOf(n: Notification, role: Role): string | null {
  const data = n.data ?? {};
  if (data.payment_order_id) return role === 'shop_owner' ? '/shop/wallet' : null;
  if (data.shift_id)
    return role === 'shop_owner'
      ? `/shop/shifts/${data.shift_id}`
      : `/worker/shifts/${data.shift_id}`;
  if (data.booking_id) return role === 'shop_owner' ? '/shop' : '/worker/bookings';
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
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
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
