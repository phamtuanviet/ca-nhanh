import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { submitReview } from '@/lib/services/reviews';
import { reviewSchema, uuid } from '@/lib/validators';

/** POST /api/v1/bookings/{id}/reviews: người làm đánh giá quán hoặc quán đánh giá người làm */
export async function POST(
  req: Request,
  ctx: RouteContext<'/api/v1/bookings/[bookingId]/reviews'>,
) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: ['worker', 'shop_owner'] });
    const { bookingId } = z.object({ bookingId: uuid }).parse(await ctx.params);
    const input = await readJson(req, reviewSchema);
    return ok(await submitReview(user, bookingId, input), { status: 201 });
  });
}
