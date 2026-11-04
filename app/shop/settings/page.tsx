import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { listMyShops } from '@/lib/services/shops';
import { ShopEditor } from './shop-editor';

export const metadata: Metadata = { title: 'Quán' };

/** S8: hồ sơ quán, ghim bản đồ, bán kính chấm công (P1-12) */
export default async function ShopSettingsPage({ searchParams }: PageProps<'/shop/settings'>) {
  const user = await requireRole('shop_owner');
  const query = await searchParams;
  const shops = await listMyShops(user.id);
  const creating = query.new === '1' || shops.length === 0;
  const selected = creating ? null : (shops.find((s) => s.id === query.shop) ?? shops[0] ?? null);

  return (
    <ShopEditor
      key={selected?.id ?? 'new'}
      shops={shops.map((s) => ({ id: s.id, name: s.name }))}
      shop={
        selected && {
          id: selected.id,
          name: selected.name,
          category: selected.category as string,
          address: selected.address as string,
          district: (selected.district as string | null) ?? '',
          phone: (selected.phone as string | null) ?? '',
          description: (selected.description as string | null) ?? '',
          geofence_radius_m: selected.geofence_radius_m as number,
          lat: selected.lat,
          lng: selected.lng,
          verification_status: selected.verification_status as string,
        }
      }
    />
  );
}
