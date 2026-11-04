import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { isDemoMode } from '@/lib/env.server';
import { getSettings } from '@/lib/services/settings';
import { getWallet } from '@/lib/services/wallet';
import { ShopWallet } from './shop-wallet';

export const metadata: Metadata = { title: 'Ví quán' };

/** S7: ví quán và nạp tiền VietQR (P1-13) */
export default async function ShopWalletPage() {
  const user = await requireRole('shop_owner');
  const [wallet, settings] = await Promise.all([getWallet(user.id), getSettings()]);
  return (
    <ShopWallet
      userId={user.id}
      initial={wallet}
      demo={isDemoMode() && settings.demo_mode.enabled}
      topupMin={settings.topup_min}
    />
  );
}
