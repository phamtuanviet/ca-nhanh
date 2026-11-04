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
    demo_mode: {
      enabled: demo.enabled === true,
      auto_verify: demo.auto_verify === true,
      skip_geofence: demo.skip_geofence === true,
    },
  };
}
