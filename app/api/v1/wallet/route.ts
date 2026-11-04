import { handle, ok, requireUser } from '@/lib/api';
import { getWallet } from '@/lib/services/wallet';

/** GET /api/v1/wallet: số dư khả dụng, tạm giữ và giao dịch gần đây */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req);
    return ok(await getWallet(user.id), { headers: { 'Cache-Control': 'no-store' } });
  });
}
