import { handle, ok, requireUser } from '@/lib/api';
import { listMyShops } from '@/lib/services/shops';

/** GET /api/v1/shops/mine: các quán của chủ quán đang đăng nhập */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    return ok(await listMyShops(user.id));
  });
}
