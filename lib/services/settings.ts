import 'server-only';
import { unwrap } from '@/lib/api';
import { adminClient } from '@/lib/supabase/admin';

export type PlatformSettings = {
  fee_rate: number;
  min_hourly_rate: number;
  urgent_boost_fee: number;
  min_lead_minutes: number;
  checkin_open_before_minutes: number;
  qr_rotation_seconds: number;
  topup_min: number;
  withdraw_min: number;
  topup_expire_minutes: number;
  gps_accuracy_cap_m: number;
  late_after_minutes: number;
  no_show_after_minutes: number;
  auto_checkout_after_minutes: number;
  auto_approve_after_hours: number;
  suspension_threshold: number;
  suspension_days: number;
  penalty_window_days: number;
  shop_cancel_compensation_rate: number;
  penalty_points: { cancel_lt_24h: number; cancel_lt_6h: number; no_show: number };
  demo_mode: { enabled: boolean; auto_verify: boolean; skip_geofence: boolean };
};

/** Tham số nền tảng (bảng platform_settings) đã ép kiểu */
export async function getSettings(): Promise<PlatformSettings> {
  const rows = unwrap(await adminClient().from('platform_settings').select('key, value'));
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const num = (key: string, fallback: number) => {
    const value = Number(map.get(key));
    return Number.isFinite(value) ? value : fallback;
  };
  const demo = (map.get('demo_mode') ?? {}) as Partial<PlatformSettings['demo_mode']>;
  const penalty = (map.get('penalty_points') ?? {}) as Partial<PlatformSettings['penalty_points']>;
  return {
    fee_rate: num('fee_rate', 0.2),
    min_hourly_rate: num('min_hourly_rate', 25500),
    urgent_boost_fee: num('urgent_boost_fee', 20000),
    min_lead_minutes: num('min_lead_minutes', 30),
    checkin_open_before_minutes: num('checkin_open_before_minutes', 30),
    qr_rotation_seconds: num('qr_rotation_seconds', 30),
    topup_min: num('topup_min', 50000),
    withdraw_min: num('withdraw_min', 10000),
    topup_expire_minutes: num('topup_expire_minutes', 15),
    gps_accuracy_cap_m: num('gps_accuracy_cap_m', 100),
    late_after_minutes: num('late_after_minutes', 5),
    no_show_after_minutes: num('no_show_after_minutes', 30),
    auto_checkout_after_minutes: num('auto_checkout_after_minutes', 120),
    auto_approve_after_hours: num('auto_approve_after_hours', 12),
    suspension_threshold: num('suspension_threshold', 4),
    suspension_days: num('suspension_days', 7),
    penalty_window_days: num('penalty_window_days', 30),
    shop_cancel_compensation_rate: num('shop_cancel_compensation_rate', 0.5),
    penalty_points: {
      cancel_lt_24h: Number(penalty.cancel_lt_24h ?? 1),
      cancel_lt_6h: Number(penalty.cancel_lt_6h ?? 2),
      no_show: Number(penalty.no_show ?? 4),
    },
    demo_mode: {
      enabled: demo.enabled === true,
      auto_verify: demo.auto_verify === true,
      skip_geofence: demo.skip_geofence === true,
    },
  };
}

/** Chế độ demo bật ở cả biến môi trường DEMO_MODE và cờ demo_mode trong CSDL */
export async function demoEnabled(): Promise<boolean> {
  const { isDemoMode } = await import('@/lib/env.server');
  return isDemoMode() && (await getSettings()).demo_mode.enabled;
}
