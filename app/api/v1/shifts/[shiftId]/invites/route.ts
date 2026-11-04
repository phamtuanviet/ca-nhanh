import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { inviteWorkers } from '@/lib/services/invites';
import { inviteSchema, uuid } from '@/lib/validators';

/** POST /api/v1/shifts/{id}/invites: { worker_ids, message } → { invited, skipped } */
export async function POST(req: Request, ctx: RouteContext<'/api/v1/shifts/[shiftId]/invites'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shiftId } = z.object({ shiftId: uuid }).parse(await ctx.params);
    const { worker_ids, message } = await readJson(req, inviteSchema);
    return ok(await inviteWorkers(user, shiftId, worker_ids, message));
  });
}
