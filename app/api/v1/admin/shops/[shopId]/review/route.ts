import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { reviewShop } from '@/lib/services/admin';
import { shopReviewSchema, uuid } from '@/lib/validators';

/** POST /api/v1/admin/shops/{id}/review: { approve, reason? }; chủ quán được thông báo */
export async function POST(req: Request, ctx: RouteContext<'/api/v1/admin/shops/[shopId]/review'>) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    const { shopId } = z.object({ shopId: uuid }).parse(await ctx.params);
    const { approve, reason } = await readJson(req, shopReviewSchema);
    return ok(await reviewShop(shopId, approve, reason));
  });
}
