import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { approveBooking } from '@/lib/services/bookings';
import { approveSchema, uuid } from '@/lib/validators';

/** POST /api/v1/bookings/{id}/approve: duyệt giờ công và quyết toán ngay (US-32, US-33) */
export async function POST(
  req: Request,
  ctx: RouteContext<'/api/v1/bookings/[bookingId]/approve'>,
) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { bookingId } = z.object({ bookingId: uuid }).parse(await ctx.params);
    return ok(await approveBooking(user, bookingId, await readJson(req, approveSchema)));
  });
}
