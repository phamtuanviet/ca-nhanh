import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { cancelShift } from '@/lib/services/shifts';
import { cancelSchema, uuid } from '@/lib/validators';

/** POST /api/v1/shifts/{id}/cancel: hủy cả ca (US-15) */
export async function POST(req: Request, ctx: RouteContext<'/api/v1/shifts/[shiftId]/cancel'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shiftId } = z.object({ shiftId: uuid }).parse(await ctx.params);
    const { reason } = await readJson(req, cancelSchema);
    return ok(await cancelShift(user, shiftId, reason));
  });
}
