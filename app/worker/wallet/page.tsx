import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { getMe } from '@/lib/services/profile';
import { getSettings } from '@/lib/services/settings';
import { getWallet } from '@/lib/services/wallet';
import { WorkerWallet } from './worker-wallet';

export const metadata: Metadata = { title: 'Ví' };

/** W7: ví người làm, tài khoản ngân hàng, rút tiền (P2-06, US-06, US-34) */
export default async function WorkerWalletPage() {
  const user = await requireRole('worker');
  const [wallet, me, settings] = await Promise.all([
    getWallet(user.id),
    getMe(user),
    getSettings(),
  ]);
  const bank = me.worker_profile?.bank ?? null;
  return (
    <WorkerWallet
      userId={user.id}
      initial={wallet}
      bank={bank}
      fullName={me.full_name}
      withdrawMin={settings.withdraw_min}
    />
  );
}
