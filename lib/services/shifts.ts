import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { ApiError, type ApiUser, unwrap, unwrapMaybe } from '@/lib/api';
import type { Database } from '@/lib/database.types';
import { fromPostgrest } from '@/lib/errors';
import { estimateShift } from '@/lib/money';
import { adminClient } from '@/lib/supabase/admin';
import type { estimateSchema, publishShiftSchema, searchShiftsSchema } from '@/lib/validators';
import { getSettings } from './settings';
import { getOwnedShop, getShop } from './shops';

type ShiftRow = Database['public']['Tables']['shifts']['Row'];
type ShiftStatus = Database['public']['Enums']['shift_status'];

export const SHIFT_COLUMNS =
  'id, shop_id, position_code, title, description, requirements, start_at, end_at, break_minutes, hourly_rate, headcount, filled_count, min_rating, favorites_only_until, is_urgent, status, fee_rate, est_wage_per_seat, est_fee_per_seat, hold_amount, published_at, filled_at, cancelled_at, cancel_reason';

/** Booking còn giữ chỗ (không tính đã hủy, vắng mặt) */
export const SEAT_STATUSES = [
  'confirmed',
  'checked_in',
  'checked_out',
  'disputed',
  'completed',
] as const;

export function presentShift(
  row: Omit<ShiftRow, 'period' | 'created_at' | 'updated_at'> | ShiftRow,
) {
  const { period: _period, ...rest } = row as ShiftRow;
  return {
    ...rest,
    fee_rate: Number(rest.fee_rate),
    min_rating: Number(rest.min_rating),
  };
}

export type Shift = ReturnType<typeof presentShift>;

type EstimateInput = z.output<typeof estimateSchema>;

/** POST /shifts/estimate: cùng công thức với fn_publish_shift (lib/money.ts) */
export async function estimate(userId: string, input: EstimateInput) {
  await getOwnedShop(userId, input.shop_id);
  const [settings, wallet] = await Promise.all([
    getSettings(),
    adminClient()
      .from('wallets')
      .select('balance')
      .eq('owner_id', userId)
      .maybeSingle()
      .then(unwrapMaybe),
  ]);
  return estimateShift({
    startAt: new Date(input.start_at),
    endAt: new Date(input.end_at),
    breakMinutes: input.break_minutes,
    hourlyRate: input.hourly_rate,
    headcount: input.headcount,
    isUrgent: input.is_urgent,
    availableBalance: wallet?.balance ?? 0,
    settings: {
      feeRate: settings.fee_rate,
      minHourlyRate: settings.min_hourly_rate,
      minLeadMinutes: settings.min_lead_minutes,
      urgentBoostFee: settings.urgent_boost_fee,
    },
  });
}

/** POST /shifts: đăng ca và tạm giữ tiền (fn_publish_shift). Lỗi được bổ sung chi tiết cho form. */
export async function publish(userId: string, input: z.output<typeof publishShiftSchema>) {
  const { data, error } = await adminClient().rpc('fn_publish_shift', {
    p_actor: userId,
    p_shop_id: input.shop_id,
    p_position_code: input.position_code,
    p_title: input.title,
    p_start_at: input.start_at,
    p_end_at: input.end_at,
    p_hourly_rate: input.hourly_rate,
    p_headcount: input.headcount,
    p_break_minutes: input.break_minutes,
    p_description: input.description ?? undefined,
    p_requirements: input.requirements ?? undefined,
    p_min_rating: input.min_rating,
    p_favorites_only_minutes: input.favorites_only_minutes,
    p_is_urgent: input.is_urgent,
  });
  if (error) {
    const apiError = fromPostgrest(error);
    if (apiError.code === 'INSUFFICIENT_BALANCE') {
      const est = await estimate(userId, input);
      throw new ApiError('INSUFFICIENT_BALANCE', {
        required: est.total_due_now,
        available: est.available_balance,
        shortfall: est.shortfall,
      });
    }
    if (apiError.code === 'RATE_BELOW_MINIMUM' || apiError.code === 'LEAD_TIME_TOO_SHORT') {
      const settings = await getSettings();
      throw new ApiError(apiError.code, {
        min_hourly_rate: settings.min_hourly_rate,
        min_lead_minutes: settings.min_lead_minutes,
      });
    }
    if (apiError.code === 'VALIDATION_ERROR') {
      throw new ApiError('VALIDATION_ERROR', [
        { field: 'position_code', message: 'Vị trí không tồn tại' },
      ]);
    }
    throw apiError;
  }
  return presentShift(data);
}

type SeatPerson = { full_name: string; avatar_url: string | null };

/** Người đang giữ chỗ của các ca (để vẽ SeatSlots) */
async function seatsFor(shiftIds: string[]) {
  const bySeat = new Map<string, { booking_id: string; status: string; worker: SeatPerson }[]>();
  if (shiftIds.length === 0) return bySeat;
  const rows = unwrap(
    await adminClient()
      .from('bookings')
      .select(
        'id, shift_id, status, booked_at, worker:profiles!bookings_worker_id_fkey(full_name, avatar_url)',
      )
      .in('shift_id', shiftIds)
      .in('status', [...SEAT_STATUSES])
      .order('booked_at'),
  );
  for (const row of rows) {
    const list = bySeat.get(row.shift_id) ?? [];
    list.push({ booking_id: row.id, status: row.status, worker: row.worker as SeatPerson });
    bySeat.set(row.shift_id, list);
  }
  return bySeat;
}

/** GET /shops/{id}/shifts: ca của quán kèm chỗ đã lấp và số giờ công chờ duyệt */
export async function listShopShifts(
  userId: string,
  shopId: string,
  options: { statuses?: ShiftStatus[]; from?: string; to?: string; page: number; limit: number },
) {
  await getOwnedShop(userId, shopId);
  let query = adminClient()
    .from('shifts')
    .select(SHIFT_COLUMNS, { count: 'exact' })
    .eq('shop_id', shopId)
    .order('start_at', { ascending: true })
    .range((options.page - 1) * options.limit, options.page * options.limit - 1);
  if (options.statuses?.length) query = query.in('status', options.statuses);
  if (options.from) query = query.gte('start_at', options.from);
  if (options.to) query = query.lt('start_at', options.to);
  const { data, count, error } = await query;
  if (error) throw fromPostgrest(error);
  const shifts = (data ?? []).map(presentShift);
  const seats = await seatsFor(shifts.map((s) => s.id));
  return {
    items: shifts.map((shift) => {
      const holders = seats.get(shift.id) ?? [];
      return {
        ...shift,
        seats: holders.map((h) => h.worker),
        pending_approval_count: holders.filter((h) => h.status === 'checked_out').length,
      };
    }),
    total: count ?? 0,
  };
}

export type ShopShift = Awaited<ReturnType<typeof listShopShifts>>['items'][number];

/** GET /shifts/{id}: chủ quán, admin thấy danh sách booking; người làm thấy `viewer` */
export async function getShiftDetail(user: Pick<ApiUser, 'id' | 'role'>, shiftId: string) {
  const db = adminClient();
  const row = unwrapMaybe(
    await db.from('shifts').select(SHIFT_COLUMNS).eq('id', shiftId).maybeSingle(),
  );
  if (!row) throw new ApiError('NOT_FOUND');
  const shift = presentShift(row);
  const shop = await getShop(shift.shop_id);
  const isOwner = shop.owner_id === user.id;
  const isAdmin = user.role === 'admin';

  const myBooking =
    user.role === 'worker'
      ? unwrapMaybe(
          await db
            .from('bookings')
            .select('id, status, booked_at')
            .eq('shift_id', shiftId)
            .eq('worker_id', user.id)
            .neq('status', 'cancelled')
            .maybeSingle(),
        )
      : null;

  // Giống RLS shifts_select: ca đang mở/đủ người, hoặc ca mình đã nhận
  const visible =
    isOwner || isAdmin || ['open', 'full'].includes(shift.status) || myBooking !== null;
  if (!visible) throw new ApiError('NOT_FOUND');

  const holders = (await seatsFor([shiftId])).get(shiftId) ?? [];
  const result = {
    shift,
    shop: {
      id: shop.id,
      name: shop.name,
      category: shop.category,
      address: shop.address,
      district: shop.district,
      cover_url: shop.cover_url,
      rating_avg: shop.rating_avg,
      rating_count: shop.rating_count,
      lat: shop.lat,
      lng: shop.lng,
      geofence_radius_m: shop.geofence_radius_m,
      // SĐT quán chỉ cho chủ quán, admin và người đã nhận ca
      phone: isOwner || isAdmin || myBooking ? shop.phone : null,
    },
    seats: holders.map((h) => ({ full_name: h.worker.full_name, avatar_url: h.worker.avatar_url })),
    viewer: null as null | {
      my_booking_id: string | null;
      my_booking_status: string | null;
      is_favorite: boolean;
      favorites_only_active: boolean;
    },
    bookings: null as null | Awaited<ReturnType<typeof shiftBookings>>,
  };

  if (isOwner || isAdmin) {
    result.bookings = await shiftBookings(shiftId);
  } else if (user.role === 'worker') {
    const favorite = unwrapMaybe(
      await db
        .from('shop_worker_lists')
        .select('list_type')
        .eq('shop_id', shop.id)
        .eq('worker_id', user.id)
        .maybeSingle(),
    );
    result.viewer = {
      my_booking_id: myBooking?.id ?? null,
      my_booking_status: myBooking?.status ?? null,
      is_favorite: favorite?.list_type === 'favorite',
      favorites_only_active:
        shift.favorites_only_until !== null && new Date(shift.favorites_only_until) > new Date(),
    };
  }
  return result;
}

export type ShiftDetail = Awaited<ReturnType<typeof getShiftDetail>>;

async function shiftBookings(shiftId: string) {
  const rows = unwrap(
    await adminClient()
      .from('bookings')
      .select(
        'id, status, booked_at, check_in_at, check_in_distance_m, check_out_at, is_late, worked_minutes, wage_amount, worker:profiles!bookings_worker_id_fkey(id, full_name, avatar_url, worker_profiles(rating_avg, rating_count, completed_count))',
      )
      .eq('shift_id', shiftId)
      .order('booked_at'),
  );
  return rows.map(({ worker, ...booking }) => {
    const w = worker as unknown as {
      id: string;
      full_name: string;
      avatar_url: string | null;
      worker_profiles: { rating_avg: number; rating_count: number; completed_count: number } | null;
    };
    return {
      ...booking,
      worker: {
        id: w.id,
        full_name: w.full_name,
        avatar_url: w.avatar_url,
        rating_avg: Number(w.worker_profiles?.rating_avg ?? 0),
        rating_count: w.worker_profiles?.rating_count ?? 0,
        completed_count: w.worker_profiles?.completed_count ?? 0,
      },
    };
  });
}

/** GET /shifts: tìm ca bằng search_shifts, gọi bằng JWT người dùng để CSDL biết ai đang tìm */
export async function searchShifts(
  client: SupabaseClient<Database>,
  params: z.output<typeof searchShiftsSchema>,
) {
  const { data, error } = await client.rpc('search_shifts', {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_m: Math.round(params.radius_km * 1000),
    p_from: params.from,
    p_to: params.to,
    p_positions: params.positions,
    p_min_rate: params.min_rate,
    p_sort: params.sort,
    p_limit: params.limit,
    p_offset: (params.page - 1) * params.limit,
  });
  if (error) throw fromPostgrest(error);
  const rows = data ?? [];
  const shopIds = [...new Set(rows.map((r) => r.shop_id))];
  const covers = new Map<string, string | null>();
  if (shopIds.length) {
    const shops = unwrap(
      await adminClient().from('shops').select('id, cover_url').in('id', shopIds),
    );
    for (const shop of shops) covers.set(shop.id, shop.cover_url);
  }
  return {
    items: rows.map(({ total_count: _total, ...row }) => ({
      ...row,
      shop_rating: Number(row.shop_rating),
      match_score: Number(row.match_score),
      shop_cover_url: covers.get(row.shop_id) ?? null,
    })),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export type ShiftSearchItem = Awaited<ReturnType<typeof searchShifts>>['items'][number];
