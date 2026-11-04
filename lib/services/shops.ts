import 'server-only';
import type { z } from 'zod';
import { ApiError, unwrap, unwrapMaybe } from '@/lib/api';
import { fromPostgrest } from '@/lib/errors';
import { parsePoint, toEwkt } from '@/lib/geo';
import type { Database } from '@/lib/database.types';
import { adminClient } from '@/lib/supabase/admin';
import type { shopPatchSchema, shopSchema } from '@/lib/validators';
import { getSettings } from './settings';

const SHOP_COLUMNS =
  'id, owner_id, name, category, description, address, district, city, location, geofence_radius_m, phone, cover_url, verification_status, rating_avg, rating_count, is_active, created_at';

type ShopRow = {
  location: unknown;
  rating_avg: number | string;
  [key: string]: unknown;
};

/** Hàng shops → JSON trả về: tách location (EWKB) thành lat, lng */
function present<T extends ShopRow>(row: T) {
  const { location, ...rest } = row;
  const point = parsePoint(location);
  return {
    ...rest,
    rating_avg: Number(row.rating_avg),
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
  } as Omit<T, 'location'> & { lat: number | null; lng: number | null; rating_avg: number };
}

export async function listMyShops(ownerId: string) {
  const rows = unwrap(
    await adminClient()
      .from('shops')
      .select(SHOP_COLUMNS)
      .eq('owner_id', ownerId)
      .order('created_at'),
  );
  return rows.map(present);
}

export type Shop = Awaited<ReturnType<typeof listMyShops>>[number];

export async function getShop(shopId: string) {
  const row = unwrapMaybe(
    await adminClient().from('shops').select(SHOP_COLUMNS).eq('id', shopId).maybeSingle(),
  );
  if (!row) throw new ApiError('NOT_FOUND');
  return present(row);
}

/** Quán của chính người gọi; quán người khác → 403 FORBIDDEN, không tồn tại → 404 */
export async function getOwnedShop(ownerId: string, shopId: string) {
  const shop = await getShop(shopId);
  if (shop.owner_id !== ownerId) throw new ApiError('FORBIDDEN');
  return shop;
}

/** POST /shops: demo tự duyệt (demo_mode.auto_verify), ngược lại chờ admin */
export async function createShop(ownerId: string, input: z.output<typeof shopSchema>) {
  const settings = await getSettings();
  const autoVerify = settings.demo_mode.enabled && settings.demo_mode.auto_verify;
  const { lat, lng, ...fields } = input;
  const { data, error } = await adminClient()
    .from('shops')
    .insert({
      ...fields,
      owner_id: ownerId,
      location: toEwkt({ lat, lng }),
      verification_status: autoVerify ? 'verified' : 'pending',
    })
    .select(SHOP_COLUMNS)
    .single();
  if (error) throw fromPostgrest(error);
  return present(data);
}

/** PATCH /shops/{id}: mọi trường tùy chọn; "Đặt vị trí quán tại đây" gửi { lat, lng } */
export async function updateShop(
  ownerId: string,
  shopId: string,
  input: z.output<typeof shopPatchSchema>,
) {
  await getOwnedShop(ownerId, shopId);
  const { lat, lng, ...fields } = input;
  const patch: Database['public']['Tables']['shops']['Update'] = { ...fields };
  if (lat !== undefined && lng !== undefined) patch.location = toEwkt({ lat, lng });
  if (Object.keys(patch).length === 0) return getShop(shopId);
  const { data, error } = await adminClient()
    .from('shops')
    .update(patch)
    .eq('id', shopId)
    .select(SHOP_COLUMNS)
    .single();
  if (error) throw fromPostgrest(error);
  return present(data);
}
