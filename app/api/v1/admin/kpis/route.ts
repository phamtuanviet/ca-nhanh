import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { getKpis } from '@/lib/services/admin';
import { kpiQuerySchema } from '@/lib/validators';

/** GET /api/v1/admin/kpis?from=2026-10-06&to=2026-11-04 */
export async function GET(req: Request) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    const { from, to } = readQuery(req, kpiQuerySchema);
    return ok(await getKpis(from, to));
  });
}
