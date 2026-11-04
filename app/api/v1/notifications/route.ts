import { z } from 'zod';
import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listNotifications } from '@/lib/services/notifications';
import { paginationSchema } from '@/lib/validators';

const query = z
  .object({ unread: z.enum(['true', 'false']).optional() })
  .extend(paginationSchema.shape);

/** GET /api/v1/notifications?unread=true: kèm meta.unread_count cho chuông */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { allowIncomplete: true });
    const q = readQuery(req, query);
    const { items, total, unread_count } = await listNotifications(user.id, {
      unread: q.unread === 'true',
      page: q.page,
      limit: q.limit,
    });
    return ok(items, { meta: { page: q.page, limit: q.limit, total, unread_count } });
  });
}
