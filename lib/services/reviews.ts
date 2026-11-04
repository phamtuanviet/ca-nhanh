import 'server-only';
import type { z } from 'zod';
import { ApiError, type ApiUser } from '@/lib/api';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import { SHOP_REVIEW_TAGS, WORKER_REVIEW_TAGS, type reviewSchema } from '@/lib/validators';

/**
 * POST /bookings/{id}/reviews (P3-03, US-37): đánh giá đối phương sau ca đã quyết toán, trong 7 ngày,
 * mỗi chiều một lần. Quán gắn "Muốn mời lại" thì người làm vào danh sách người quen (fn_submit_review).
 */
export async function submitReview(
  user: Pick<ApiUser, 'id' | 'role'>,
  bookingId: string,
  input: z.output<typeof reviewSchema>,
) {
  const allowed: readonly string[] = user.role === 'worker' ? WORKER_REVIEW_TAGS : SHOP_REVIEW_TAGS;
  const wrong = input.tags.filter((t) => !allowed.includes(t));
  if (wrong.length > 0) {
    throw new ApiError('VALIDATION_ERROR', [
      { field: 'tags', message: `Thẻ không dùng cho chiều đánh giá này: ${wrong.join(', ')}` },
    ]);
  }
  const { data, error } = await adminClient().rpc('fn_submit_review', {
    p_actor: user.id,
    p_booking_id: bookingId,
    p_stars: input.stars,
    p_tags: input.tags,
    p_comment: input.comment || undefined,
  });
  if (error) throw fromPostgrest(error);
  return {
    id: data.id,
    direction: data.direction,
    stars: data.stars,
    tags: data.tags,
    added_to_favorites: data.direction === 'shop_to_worker' && data.tags.includes('want_rebook'),
  };
}
