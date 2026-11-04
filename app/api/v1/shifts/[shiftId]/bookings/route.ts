import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { bookShift } from '@/lib/services/bookings';
import { uuid } from '@/lib/validators';

/** POST /api/v1/shifts/{id}/bookings: nhận ca một chạm (05 §4.5) */
export async function POST(req: Request, ctx: RouteContext<'/api/v1/shifts/[shiftId]/bookings'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'worker' });
    const { shiftId } = z.object({ shiftId: uuid }).parse(await ctx.params);
    return ok(await bookShift(user, shiftId), { status: 201 });
  });
}
