import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { arrivalsToday, issueShopToken } from '@/lib/services/attendance';
import { getOwnedShop } from '@/lib/services/shops';
import { Kiosk } from './kiosk';

export const metadata: Metadata = { title: 'Kiosk QR' };

/** S4: kiosk QR xoay vòng (P2-02, US-28) */
export default async function KioskPage({ params }: PageProps<'/shop/kiosk/[shopId]'>) {
  const { shopId } = await params;
  const user = await requireRole('shop_owner');
  const shop = await getOwnedShop(user.id, shopId).catch((error: unknown) => {
    if (error instanceof ApiError) notFound();
    throw error;
  });
  const [token, arrivals] = await Promise.all([
    issueShopToken(user, shopId),
    arrivalsToday(shopId),
  ]);
  return <Kiosk shop={{ id: shop.id, name: shop.name }} initialToken={token} arrivals={arrivals} />;
}
