import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { issueShopToken } from '@/lib/services/attendance';
import { uuid } from '@/lib/validators';

/** GET /api/v1/shops/{id}/checkin-token: kiosk gọi mỗi khi sang cửa sổ 30 giây mới (05 §4.3, §7) */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/shops/[shopId]/checkin-token'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: ['shop_owner', 'admin'] });
    const { shopId } = z.object({ shopId: uuid }).parse(await ctx.params);
    return ok(await issueShopToken(user, shopId), { headers: { 'Cache-Control': 'no-store' } });
  });
}
