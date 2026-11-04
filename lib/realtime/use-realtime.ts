'use client';

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import type { Database } from '@/lib/database.types';
import { getBrowserClient } from '@/lib/supabase/client';

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

type Row = Record<string, unknown>;

export type RealtimeOptions = {
  /** Tên kênh theo 05 §5, ví dụ `shift-feed`, `shop-bookings:{shopId}` */
  channel: string;
  table: 'shifts' | 'bookings' | 'wallets' | 'payment_orders' | 'notifications';
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** Bộ lọc postgres_changes, ví dụ `shop_id=eq.<uuid>` */
  filter?: string;
  enabled?: boolean;
  onChange: (payload: RealtimePostgresChangesPayload<Row>) => void;
};

let authReady: Promise<void> | null = null;

/**
 * Nạp JWT của phiên vào kết nối Realtime trước khi join kênh. Nếu không, kênh join đầu tiên có thể
 * đi bằng khóa publishable (vai trò anon) và RLS chặn mọi sự kiện dù kênh báo SUBSCRIBED.
 */
function ensureRealtimeAuth(client: SupabaseClient<Database>): Promise<void> {
  authReady ??= client.auth
    .getSession()
    .then(() => client.realtime.setAuth())
    .catch(() => {
      authReady = null;
    });
  return authReady;
}

/**
 * Đăng ký thay đổi của một bảng qua Supabase Realtime (P1-17). Dữ liệu đã lọc theo RLS của người dùng.
 * Trả về trạng thái kết nối để hiện LivePulse; supabase-js tự kết nối lại khi mất mạng.
 */
export function useRealtime({
  channel,
  table,
  event = '*',
  filter,
  enabled = true,
  onChange,
}: RealtimeOptions): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

  useEffect(() => {
    if (!enabled) return;
    const client = getBrowserClient();
    let ch: RealtimeChannel | null = null;
    let cancelled = false;

    void ensureRealtimeAuth(client).then(() => {
      if (cancelled) return;
      // Thêm hậu tố để hai component cùng nghe một kênh không giẫm lên nhau
      ch = client
        .channel(`${channel}#${Math.random().toString(36).slice(2, 8)}`)
        .on(
          'postgres_changes' as never,
          { event, schema: 'public', table, ...(filter ? { filter } : {}) },
          (payload: RealtimePostgresChangesPayload<Row>) => handler.current(payload),
        )
        .subscribe((state) => {
          if (state === 'SUBSCRIBED') setStatus('live');
          else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
            setStatus('offline');
          }
        });
    });

    return () => {
      cancelled = true;
      if (ch) void client.removeChannel(ch);
    };
  }, [channel, table, event, filter, enabled]);

  return enabled ? status : 'offline';
}
