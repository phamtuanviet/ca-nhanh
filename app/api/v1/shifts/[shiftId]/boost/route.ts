import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { boostShift } from '@/lib/services/shifts';
import { uuid } from '@/lib/validators';

/** POST /api/v1/shifts/{id}/boost: đẩy ca gấp (phí urgent_boost_fee) */
export async function POST(req: Request, ctx: RouteContext<'/api/v1/shifts/[shiftId]/boost'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shiftId } = z.object({ shiftId: uuid }).parse(await ctx.params);
    return ok(await boostShift(user, shiftId));
  });
}
