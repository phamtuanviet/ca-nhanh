import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listUsers } from '@/lib/services/admin';
import { adminUsersQuerySchema } from '@/lib/validators';

/** GET /api/v1/admin/users?role=worker&q=minh&status=active */
export async function GET(req: Request) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    const q = readQuery(req, adminUsersQuerySchema);
    const { items, total } = await listUsers(q);
    return ok(items, { meta: { page: q.page, limit: q.limit, total } });
  });
}
