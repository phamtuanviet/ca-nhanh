import 'server-only';
import { ApiError, type ApiUser, unwrap, unwrapMaybe } from '@/lib/api';
import type { Database } from '@/lib/database.types';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import type { WORKER_SCOPES } from '@/lib/validators';
import { getOwnedShop } from './shops';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type BookingStatus = Database['public']['Enums']['booking_status'];
export type WorkerScope = (typeof WORKER_SCOPES)[number];

function presentBooking(row: BookingRow) {
  const { period: _period, ...rest } = row;
  return rest;
}

/** POST /shifts/{id}/bookings: nhận ca (fn_book_shift khóa dòng ca nên chỉ một người lấy được chỗ cuối) */
export async function bookShift(user: Pick<ApiUser, 'id'>, shiftId: string) {
  const db = adminClient();
  const { data, error } = await db.rpc('fn_book_shift', { p_actor: user.id, p_shift_id: shiftId });
  if (!error) return presentBooking(data);

  const apiError = fromPostgrest(error);
  // Bổ sung chi tiết để thông điệp có thời điểm, điểm tối thiểu (05 §4.5)
  if (apiError.code === 'FAVORITES_ONLY' || apiError.code === 'RATING_TOO_LOW') {
    const shift = unwrapMaybe(
      await db
        .from('shifts')
        .select('favorites_only_until, min_rating')
        .eq('id', shiftId)
        .maybeSingle(),
    );
    throw new ApiError(apiError.code, {
      until: shift?.favorites_only_until ?? null,
      min_rating: shift ? Number(shift.min_rating) : null,
    });
  }
  if (apiError.code === 'ACCOUNT_SUSPENDED') {
    const wp = unwrapMaybe(
      await db
        .from('worker_profiles')
        .select('suspended_until')
        .eq('user_id', user.id)
        .maybeSingle(),
    );
    throw new ApiError('ACCOUNT_SUSPENDED', { until: wp?.suspended_until ?? null });
  }
  throw apiError;
}

const WORKER_LIST_COLUMNS =
  'id, status, source, booked_at, check_in_at, check_out_at, worked_minutes, wage_amount, fee_amount, seat_hold, penalty_points, compensation_amount, shift:shifts(id, title, position_code, start_at, end_at, hourly_rate, est_wage_per_seat, status), shop:shops(id, name, address, district, cover_url)';

/** Tab của "Ca của tôi" dựa trên trạng thái booking và giờ ca */
export function scopeOf(
  status: BookingStatus,
  startAt: string,
  endAt: string,
  now = new Date(),
): WorkerScope {
  if (status === 'checked_in') return 'active';
  if (status === 'checked_out' || status === 'disputed') return 'pending_approval';
  if (status === 'confirmed') {
    if (new Date(endAt) <= now) return 'pending_approval';
    return new Date(startAt) <= now ? 'active' : 'upcoming';
  }
  return 'history';
}

/** GET /bookings (người làm): ?scope=upcoming|active|pending_approval|history */
export async function listWorkerBookings(
  userId: string,
  options: { scope: WorkerScope; page: number; limit: number },
) {
  const rows = unwrap(
    await adminClient()
      .from('bookings')
      .select(WORKER_LIST_COLUMNS)
      .eq('worker_id', userId)
      .order('booked_at', { ascending: false })
      .limit(500),
  );
  const now = new Date();
  const items = rows
    .filter(
      (row) =>
        row.shift &&
        scopeOf(row.status, row.shift.start_at, row.shift.end_at, now) === options.scope,
    )
    .sort((a, b) => {
      const diff = new Date(a.shift.start_at).getTime() - new Date(b.shift.start_at).getTime();
      // Sắp tới và đang làm: gần nhất trước; chờ duyệt và lịch sử: mới nhất trước
      return options.scope === 'upcoming' || options.scope === 'active' ? diff : -diff;
    });
  const start = (options.page - 1) * options.limit;
  return { items: items.slice(start, start + options.limit), total: items.length };
}

export type WorkerBooking = Awaited<ReturnType<typeof listWorkerBookings>>['items'][number];

/** GET /bookings?shop_id= (chủ quán): lọc theo trạng thái và ngày bắt đầu ca (giờ Việt Nam) */
export async function listShopBookings(
  userId: string,
  shopId: string,
  options: { statuses?: BookingStatus[]; date?: string; page: number; limit: number },
) {
  await getOwnedShop(userId, shopId);
  const db = adminClient();
  let shiftIds: string[] | null = null;
  if (options.date) {
    const from = new Date(`${options.date}T00:00:00+07:00`);
    const to = new Date(from.getTime() + 24 * 3_600_000);
    const shifts = unwrap(
      await db
        .from('shifts')
        .select('id')
        .eq('shop_id', shopId)
        .gte('start_at', from.toISOString())
        .lt('start_at', to.toISOString()),
    );
    shiftIds = shifts.map((s) => s.id);
    if (shiftIds.length === 0) return { items: [], total: 0 };
  }
  let query = db
    .from('bookings')
    .select(
      'id, status, booked_at, check_in_at, check_out_at, worked_minutes, wage_amount, fee_amount, is_late, shift:shifts(id, title, start_at, end_at, hourly_rate), worker:profiles!bookings_worker_id_fkey(id, full_name, avatar_url)',
      { count: 'exact' },
    )
    .eq('shop_id', shopId)
    .order('booked_at', { ascending: false })
    .range((options.page - 1) * options.limit, options.page * options.limit - 1);
  if (options.statuses?.length) query = query.in('status', options.statuses);
  if (shiftIds) query = query.in('shift_id', shiftIds);
  const { data, count, error } = await query;
  if (error) throw fromPostgrest(error);
  return { items: data ?? [], total: count ?? 0 };
}

/** GET /bookings/{id}: người trong cuộc (người làm, chủ quán) và admin; người khác → 404 */
export async function getBookingDetail(user: Pick<ApiUser, 'id' | 'role'>, bookingId: string) {
  const db = adminClient();
  const row = unwrapMaybe(await db.from('bookings').select('*').eq('id', bookingId).maybeSingle());
  if (!row) throw new ApiError('NOT_FOUND');
  const booking = presentBooking(row);

  const [shift, shop, worker, attendance, review] = await Promise.all([
    db
      .from('shifts')
      .select(
        'id, title, position_code, start_at, end_at, break_minutes, hourly_rate, est_wage_per_seat, status',
      )
      .eq('id', booking.shift_id)
      .single()
      .then(unwrap),
    db
      .from('shops')
      .select('id, owner_id, name, address, district, phone, cover_url')
      .eq('id', booking.shop_id)
      .single()
      .then(unwrap),
    db
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', booking.worker_id)
      .single()
      .then(unwrap),
    db
      .from('attendance_events')
      .select('type, accepted, reject_code, distance_m, scanned_at')
      .eq('booking_id', bookingId)
      .order('scanned_at', { ascending: false })
      .limit(5)
      .then(unwrap),
    db
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', user.id)
      .maybeSingle()
      .then(unwrapMaybe),
  ]);

  const isWorker = booking.worker_id === user.id;
  const isOwner = shop.owner_id === user.id;
  if (!isWorker && !isOwner && user.role !== 'admin') throw new ApiError('NOT_FOUND');

  const { owner_id: _owner, ...shopInfo } = shop;
  return {
    booking,
    shift,
    shop: shopInfo,
    worker,
    timesheet: {
      worked_minutes: booking.worked_minutes,
      wage_amount: booking.wage_amount,
      fee_amount: booking.fee_amount,
      adjustment_note: booking.adjustment_note,
    },
    attendance,
    my_review_submitted: review !== null,
  };
}
