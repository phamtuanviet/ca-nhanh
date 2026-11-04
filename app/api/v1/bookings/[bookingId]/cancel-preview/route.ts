import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { bookingCancelPreview } from '@/lib/services/bookings';
import { uuid } from '@/lib/validators';

/** GET /api/v1/bookings/{id}/cancel-preview: điểm phạt hoặc bồi thường nếu hủy bây giờ */
export async function GET(
  req: Request,
  ctx: RouteContext<'/api/v1/bookings/[bookingId]/cancel-preview'>,
) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: ['worker', 'shop_owner'] });
    const { bookingId } = z.object({ bookingId: uuid }).parse(await ctx.params);
    return ok(await bookingCancelPreview(user, bookingId));
  });
}
