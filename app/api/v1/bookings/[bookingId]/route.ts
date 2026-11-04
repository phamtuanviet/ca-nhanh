import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { getBookingDetail } from '@/lib/services/bookings';
import { uuid } from '@/lib/validators';

/** GET /api/v1/bookings/{id}: người làm, chủ quán của ca và admin */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/bookings/[bookingId]'>) {
  return handle(req, async () => {
    const user = await requireUser(req);
    const { bookingId } = z.object({ bookingId: uuid }).parse(await ctx.params);
    return ok(await getBookingDetail(user, bookingId));
  });
}
