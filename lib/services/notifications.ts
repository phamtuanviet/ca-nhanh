import 'server-only';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';

const COLUMNS = 'id, type, title, body, data, read_at, created_at';

/** GET /notifications: kèm unread_count cho chuông */
export async function listNotifications(
  userId: string,
  options: { unread?: boolean; page: number; limit: number },
) {
  const db = adminClient();
  let query = db
    .from('notifications')
    .select(COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .order('id', { ascending: false })
    .range((options.page - 1) * options.limit, options.page * options.limit - 1);
  if (options.unread) query = query.is('read_at', null);
  const [list, unread] = await Promise.all([
    query,
    db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null),
  ]);
  if (list.error) throw fromPostgrest(list.error);
  if (unread.error) throw fromPostgrest(unread.error);
  return { items: list.data ?? [], total: list.count ?? 0, unread_count: unread.count ?? 0 };
}

export type NotificationItem = Awaited<ReturnType<typeof listNotifications>>['items'][number];

/** POST /notifications/read: { ids } hoặc { all: true } */
export async function markNotificationsRead(
  userId: string,
  input: { ids: number[] } | { all: true },
) {
  let query = adminClient()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if ('ids' in input) query = query.in('id', input.ids);
  const { data, error } = await query.select('id');
  if (error) throw fromPostgrest(error);
  return { updated: data?.length ?? 0 };
}
