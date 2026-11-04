import 'server-only';
import { ApiError, type ApiUser, unwrap, unwrapMaybe } from '@/lib/api';
import type { Database } from '@/lib/database.types';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import type { WORKER_SCOPES } from '@/lib/validators';
import { getSettings } from './settings';
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
  'id, status, source, booked_at, check_in_at, check_out_at, is_late, auto_checked_out, worked_minutes, wage_amount, fee_amount, seat_hold, penalty_points, compensation_amount, cancelled_by, adjustment_note, settled_at, reviews(direction), shift:shifts(id, title, position_code, start_at, end_at, hourly_rate, est_wage_per_seat, status), shop:shops(id, name, address, district, cover_url)';

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

/** Còn đánh giá được: đã quyết toán trong 7 ngày và chiều này chưa đánh giá (BR-21) */
export function canReview(
  booking: { status: string; settled_at: string | null; reviews: { direction: string }[] },
  direction: 'worker_to_shop' | 'shop_to_worker',
  now = Date.now(),
) {
  return (
    booking.status === 'completed' &&
    booking.settled_at !== null &&
    now - new Date(booking.settled_at).getTime() < 7 * 86_400_000 &&
    !booking.reviews.some((r) => r.direction === direction)
  );
}

async function workerBookingRows(userId: string) {
  const rows = unwrap(
    await adminClient()
      .from('bookings')
      .select(WORKER_LIST_COLUMNS)
      .eq('worker_id', userId)
      .order('booked_at', { ascending: false })
      .limit(500),
  );
  const now = Date.now();
  return rows.map(({ reviews, ...row }) => ({
    ...row,
    can_review: canReview({ ...row, reviews }, 'worker_to_shop', now),
  }));
}

type WorkerRow = Awaited<ReturnType<typeof workerBookingRows>>[number];

/** Chia booking của người làm theo tab; sắp tới, đang làm: gần nhất trước; chờ duyệt, lịch sử: mới nhất trước */
function groupWorkerRows(rows: WorkerRow[]) {
  const now = new Date();
  const groups: Record<WorkerScope, WorkerRow[]> = {
    upcoming: [],
    active: [],
    pending_approval: [],
    history: [],
  };
  for (const row of rows) {
    if (!row.shift) continue;
    groups[scopeOf(row.status, row.shift.start_at, row.shift.end_at, now)].push(row);
  }
  for (const [scope, list] of Object.entries(groups) as [WorkerScope, WorkerRow[]][]) {
    const dir = scope === 'upcoming' || scope === 'active' ? 1 : -1;
    list.sort(
      (a, b) => dir * (new Date(a.shift.start_at).getTime() - new Date(b.shift.start_at).getTime()),
    );
  }
  return groups;
}

/** GET /bookings (người làm): ?scope=upcoming|active|pending_approval|history */
export async function listWorkerBookings(
  userId: string,
  options: { scope: WorkerScope; page: number; limit: number },
) {
  const items = groupWorkerRows(await workerBookingRows(userId))[options.scope];
  const start = (options.page - 1) * options.limit;
  return { items: items.slice(start, start + options.limit), total: items.length };
}

/** "Ca của tôi" (W5): cả bốn tab trong một lần đọc, để hiện số trên từng tab */
export async function workerBookingGroups(userId: string) {
  return groupWorkerRows(await workerBookingRows(userId));
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

// ---------- Phase 2: duyệt giờ công, hủy ----------

/** Giờ công chờ duyệt của các quán (S5): đã check-out hoặc đang khiếu nại */
export async function listPendingTimesheets(userId: string) {
  const shops = unwrap(await adminClient().from('shops').select('id, name').eq('owner_id', userId));
  if (shops.length === 0) return [];
  const names = new Map(shops.map((s) => [s.id, s.name]));
  const rows = unwrap(
    await adminClient()
      .from('bookings')
      .select(
        'id, shop_id, status, check_in_at, check_out_at, check_in_distance_m, check_out_distance_m, is_late, auto_checked_out, worked_minutes, wage_amount, fee_amount, seat_hold, shift:shifts(id, title, start_at, end_at, hourly_rate, break_minutes, fee_rate), worker:profiles!bookings_worker_id_fkey(id, full_name, avatar_url)',
      )
      .in(
        'shop_id',
        shops.map((s) => s.id),
      )
      .in('status', ['checked_out', 'disputed'])
      .order('check_out_at', { ascending: true }),
  );
  return rows.map((r) => ({ ...r, shop_name: names.get(r.shop_id) ?? '' }));
}

export type PendingTimesheet = Awaited<ReturnType<typeof listPendingTimesheets>>[number];

/** POST /bookings/{id}/approve: duyệt đúng giờ ({}) hoặc điều chỉnh kèm lý do, quyết toán ngay */
export async function approveBooking(
  user: Pick<ApiUser, 'id'>,
  bookingId: string,
  input: { worked_minutes?: number; note?: string },
) {
  const { data, error } = await adminClient().rpc('fn_approve_booking', {
    p_actor: user.id,
    p_booking_id: bookingId,
    p_worked_minutes: input.worked_minutes,
    p_note: input.note || undefined,
  });
  if (error) throw fromPostgrest(error);
  return presentBooking(data);
}

/**
 * GET /bookings/{id}/cancel-preview: điểm phạt (người làm) hoặc bồi thường (quán) nếu hủy bây giờ.
 * Cùng quy tắc với fn_cancel_booking: người làm hủy trước < 24 giờ bị phạt 1 điểm, < 6 giờ bị 2 điểm;
 * quán hủy trong vòng 24 giờ bồi thường % tiền công dự kiến.
 */
export async function bookingCancelPreview(user: Pick<ApiUser, 'id'>, bookingId: string) {
  const db = adminClient();
  const booking = unwrapMaybe(
    await db
      .from('bookings')
      .select('id, worker_id, shop_id, status, shift_id')
      .eq('id', bookingId)
      .maybeSingle(),
  );
  if (!booking) throw new ApiError('NOT_FOUND');
  const [shift, shop, settings] = await Promise.all([
    db
      .from('shifts')
      .select('start_at, est_wage_per_seat')
      .eq('id', booking.shift_id)
      .single()
      .then(unwrap),
    db.from('shops').select('owner_id').eq('id', booking.shop_id).single().then(unwrap),
    getSettings(),
  ]);
  const actor =
    user.id === booking.worker_id ? 'worker' : user.id === shop.owner_id ? 'shop' : null;
  if (!actor) throw new ApiError('NOT_FOUND');
  if (booking.status !== 'confirmed') throw new ApiError('INVALID_STATE');
  const hours = (new Date(shift.start_at).getTime() - Date.now()) / 3_600_000;
  if (hours <= 0) throw new ApiError('TOO_LATE_TO_CANCEL');

  if (actor === 'worker') {
    const points =
      hours >= 24
        ? 0
        : hours >= 6
          ? settings.penalty_points.cancel_lt_24h
          : settings.penalty_points.cancel_lt_6h;
    const current =
      unwrapMaybe(await db.rpc('penalty_points_of', { p_worker: booking.worker_id })) ?? 0;
    return {
      actor,
      hours_before_start: Math.round(hours * 10) / 10,
      penalty_points: points,
      current_points: current,
      threshold: settings.suspension_threshold,
      will_be_suspended: points > 0 && current + points >= settings.suspension_threshold,
      suspension_days: settings.suspension_days,
      compensation: 0,
    };
  }
  return {
    actor,
    hours_before_start: Math.round(hours * 10) / 10,
    penalty_points: 0,
    compensation:
      hours < 24 ? Math.round(shift.est_wage_per_seat * settings.shop_cancel_compensation_rate) : 0,
  };
}

/** POST /bookings/{id}/cancel */
export async function cancelBooking(user: Pick<ApiUser, 'id'>, bookingId: string, reason?: string) {
  const { data, error } = await adminClient().rpc('fn_cancel_booking', {
    p_actor: user.id,
    p_booking_id: bookingId,
    p_reason: reason || undefined,
  });
  if (error) throw fromPostgrest(error);
  return presentBooking(data);
}
