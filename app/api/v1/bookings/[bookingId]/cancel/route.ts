import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { cancelBooking } from '@/lib/services/bookings';
import { cancelSchema, uuid } from '@/lib/validators';

/** POST /api/v1/bookings/{id}/cancel: người làm hủy (điểm phạt) hoặc quán hủy một người (bồi thường) */
export async function POST(req: Request, ctx: RouteContext<'/api/v1/bookings/[bookingId]/cancel'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: ['worker', 'shop_owner'] });
    const { bookingId } = z.object({ bookingId: uuid }).parse(await ctx.params);
    const { reason } = await readJson(req, cancelSchema);
    return ok(await cancelBooking(user, bookingId, reason));
  });
}
