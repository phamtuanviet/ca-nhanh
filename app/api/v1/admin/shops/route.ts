import { z } from 'zod';
import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listShops } from '@/lib/services/admin';

const query = z.object({
  verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
});

/** GET /api/v1/admin/shops?verification_status=pending */
export async function GET(req: Request) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    const { verification_status } = readQuery(req, query);
    return ok(await listShops(verification_status));
  });
}
