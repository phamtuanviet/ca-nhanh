import { ApiError, handle, ok, readQuery, requireUser } from '@/lib/api';
import type { Database } from '@/lib/database.types';
import { listShopBookings, listWorkerBookings } from '@/lib/services/bookings';
import { bookingListSchema } from '@/lib/validators';

type BookingStatus = Database['public']['Enums']['booking_status'];
const STATUSES: BookingStatus[] = [
  'confirmed',
  'checked_in',
  'checked_out',
  'disputed',
  'completed',
  'cancelled',
  'no_show',
];

/** GET /api/v1/bookings: người làm theo ?scope=, chủ quán theo ?shop_id= */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: ['worker', 'shop_owner'] });
    const q = readQuery(req, bookingListSchema);
    if (user.role === 'worker') {
      const { items, total } = await listWorkerBookings(user.id, q);
      return ok(items, { meta: { page: q.page, limit: q.limit, total, scope: q.scope } });
    }
    if (!q.shop_id) {
      throw new ApiError('VALIDATION_ERROR', [
        { field: 'shop_id', message: 'Chủ quán cần truyền shop_id' },
      ]);
    }
    const statuses = q.status
      ?.split(',')
      .filter((s): s is BookingStatus => STATUSES.includes(s as BookingStatus));
    const { items, total } = await listShopBookings(user.id, q.shop_id, {
      statuses,
      date: q.date,
      page: q.page,
      limit: q.limit,
    });
    return ok(items, { meta: { page: q.page, limit: q.limit, total } });
  });
}
