import { handle, ok, readJson, requireUser } from '@/lib/api';
import { fastForward } from '@/lib/services/demo';
import { fastForwardSchema } from '@/lib/validators';

/** POST /api/v1/admin/demo/fast-forward: { shift_id, to: 'start' | 'end' } (admin hoặc chủ quán của ca) */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: ['admin', 'shop_owner'] });
    const { shift_id, to } = await readJson(req, fastForwardSchema);
    return ok(await fastForward(user, shift_id, to));
  });
}
