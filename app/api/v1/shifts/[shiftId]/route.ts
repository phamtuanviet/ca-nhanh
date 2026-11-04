import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { getShiftDetail } from '@/lib/services/shifts';
import { uuid } from '@/lib/validators';

/** GET /api/v1/shifts/{id}: chủ quán thấy booking, người làm thấy `viewer` */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/shifts/[shiftId]'>) {
  return handle(req, async () => {
    const user = await requireUser(req);
    const { shiftId } = z.object({ shiftId: uuid }).parse(await ctx.params);
    return ok(await getShiftDetail(user, shiftId));
  });
}
