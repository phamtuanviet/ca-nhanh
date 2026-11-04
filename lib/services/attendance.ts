import 'server-only';
import type { z } from 'zod';
import { ApiError, type ApiUser, unwrap, unwrapMaybe } from '@/lib/api';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import { fromPostgrest, isErrorCode } from '@/lib/errors';
import { vnDate } from '@/lib/format';
import { issueCheckinToken, verifyCheckinToken } from '@/lib/qr-token';
import { adminClient } from '@/lib/supabase/admin';
import type { attendanceSchema } from '@/lib/validators';
import { getSettings } from './settings';
import { getShop } from './shops';

type AttendanceType = 'check_in' | 'check_out';

/** GET /shops/{id}/checkin-token: mã cho cửa sổ 30 giây hiện tại (chủ quán hoặc admin) */
export async function issueShopToken(user: Pick<ApiUser, 'id' | 'role'>, shopId: string) {
  const shop = await getShop(shopId);
  if (shop.owner_id !== user.id && user.role !== 'admin') throw new ApiError('FORBIDDEN');
  const settings = await getSettings();
  const { token, window, expiresAt } = issueCheckinToken(
    serverEnv.qrSigningSecret(),
    shopId,
    Date.now(),
    settings.qr_rotation_seconds,
  );
  return {
    token,
    qr_payload: `${publicEnv().appUrl}/c/${token}`,
    window,
    rotation_seconds: settings.qr_rotation_seconds,
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * POST /bookings/{id}/check-in | check-out (05 §4.5). Thứ tự kiểm tra: API kiểm token (QR_INVALID,
 * QR_EXPIRED) rồi CSDL (WRONG_SHOP → INVALID_STATE → OUTSIDE_CHECKIN_WINDOW → LOCATION_REQUIRED →
 * OUT_OF_GEOFENCE). Mọi lần quét đều được ghi vào attendance_events, kể cả khi bị từ chối.
 */
export async function recordAttendance(
  user: Pick<ApiUser, 'id'>,
  bookingId: string,
  type: AttendanceType,
  input: z.output<typeof attendanceSchema>,
) {
  const db = adminClient();
  const settings = await getSettings();
  const accuracy = input.accuracy_m === undefined ? undefined : Math.round(input.accuracy_m);
  const check = verifyCheckinToken(
    serverEnv.qrSigningSecret(),
    input.token,
    Date.now(),
    settings.qr_rotation_seconds,
  );

  if (!check.ok) {
    const booking = unwrapMaybe(
      await db.from('bookings').select('id, worker_id, shop_id').eq('id', bookingId).maybeSingle(),
    );
    if (booking && booking.worker_id === user.id) {
      await db.from('attendance_events').insert({
        booking_id: booking.id,
        worker_id: booking.worker_id,
        shop_id: booking.shop_id,
        type,
        accepted: false,
        reject_code: check.code,
        token_window: check.window ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        accuracy_m: accuracy ?? null,
      });
    }
    throw new ApiError(check.code);
  }

  const { data, error } = await db.rpc('fn_record_attendance', {
    p_actor: user.id,
    p_booking_id: bookingId,
    p_type: type,
    p_token_shop_id: check.shopId,
    p_token_window: check.window,
    p_lat: input.lat,
    p_lng: input.lng,
    p_accuracy_m: accuracy,
  });
  if (error) throw fromPostgrest(error);

  const result = data as {
    accepted: boolean;
    reject_code?: string;
    distance_m?: number | null;
    booking?: Record<string, unknown>;
  };
  if (!result.accepted) {
    const code =
      result.reject_code && isErrorCode(result.reject_code) ? result.reject_code : 'INVALID_STATE';
    const details: Record<string, unknown> = { distance_m: result.distance_m ?? null };
    if (code === 'OUT_OF_GEOFENCE') {
      const booking = unwrap(
        await db.from('bookings').select('shop_id').eq('id', bookingId).single(),
      );
      const shop = await getShop(booking.shop_id);
      details.allowed_m =
        shop.geofence_radius_m + Math.min(accuracy ?? 0, settings.gps_accuracy_cap_m);
    }
    throw new ApiError(code, details);
  }

  const { period: _period, ...booking } = result.booking ?? {};
  return { accepted: true, distance_m: result.distance_m ?? null, booking };
}

export type CheckinTarget = {
  shop: { id: string; name: string };
  action: 'check_in' | 'check_out' | null;
  booking: {
    id: string;
    status: string;
    shift: { id: string; title: string; start_at: string; end_at: string };
  } | null;
  /** Có ca sắp tới tại quán nhưng chưa tới giờ check-in */
  opens_at: string | null;
};

/**
 * Deep link /c/<token>: tìm booking của người làm tại quán của mã QR. Đang làm thì check-out;
 * ca đang trong cửa sổ check-in (mở trước giờ bắt đầu N phút) thì check-in.
 */
export async function resolveCheckinTarget(userId: string, shopId: string): Promise<CheckinTarget> {
  const shop = await getShop(shopId);
  const settings = await getSettings();
  const rows = unwrap(
    await adminClient()
      .from('bookings')
      .select('id, status, shift:shifts(id, title, start_at, end_at)')
      .eq('worker_id', userId)
      .eq('shop_id', shopId)
      .in('status', ['confirmed', 'checked_in']),
  );
  const now = Date.now();
  const openMs = settings.checkin_open_before_minutes * 60_000;
  const sorted = [...rows].sort(
    (a, b) => new Date(a.shift.start_at).getTime() - new Date(b.shift.start_at).getTime(),
  );
  const working = sorted.find((b) => b.status === 'checked_in');
  const due = sorted.find(
    (b) =>
      b.status === 'confirmed' &&
      new Date(b.shift.start_at).getTime() - openMs <= now &&
      now < new Date(b.shift.end_at).getTime(),
  );
  const later = sorted.find(
    (b) => b.status === 'confirmed' && new Date(b.shift.start_at).getTime() - openMs > now,
  );
  const target = working ?? due ?? null;
  return {
    shop: { id: shop.id, name: shop.name },
    action: working ? 'check_out' : due ? 'check_in' : null,
    booking: target,
    opens_at:
      !target && later
        ? new Date(new Date(later.shift.start_at).getTime() - openMs).toISOString()
        : null,
  };
}

/** Người đã đến quán hôm nay (cho kiosk) */
export async function arrivalsToday(shopId: string) {
  const start = new Date(`${vnDate()}T00:00:00+07:00`).toISOString();
  const rows = unwrap(
    await adminClient()
      .from('bookings')
      .select(
        'id, status, check_in_at, is_late, worker:profiles!bookings_worker_id_fkey(full_name, avatar_url)',
      )
      .eq('shop_id', shopId)
      .gte('check_in_at', start)
      .order('check_in_at', { ascending: false })
      .limit(30),
  );
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    check_in_at: r.check_in_at!,
    is_late: r.is_late,
    full_name: (r.worker as { full_name: string }).full_name,
    avatar_url: (r.worker as { avatar_url: string | null }).avatar_url,
  }));
}

export type Arrival = Awaited<ReturnType<typeof arrivalsToday>>[number];

/** Đọc token QR ở thời điểm hiện tại (deep link /c/<token>): biết quán kể cả khi mã đã hết hạn */
export async function inspectToken(token: string) {
  const settings = await getSettings();
  return verifyCheckinToken(
    serverEnv.qrSigningSecret(),
    token,
    Date.now(),
    settings.qr_rotation_seconds,
  );
}
