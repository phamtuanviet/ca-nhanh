import { z } from 'zod';
import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listInvites } from '@/lib/services/invites';

const query = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional(),
});

/** GET /api/v1/invites?status=pending */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'worker' });
    const { status } = readQuery(req, query);
    const items = await listInvites(user.id, status);
    return ok(items, { meta: { page: 1, limit: items.length, total: items.length } });
  });
}
