import { z } from 'zod';
import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listShopWorkers } from '@/lib/services/workers';
import { uuid } from '@/lib/validators';

const query = z.object({ list: z.enum(['favorite', 'blocked', 'all']).default('all') });

/** GET /api/v1/shops/{id}/workers?list=favorite|blocked|all */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/shops/[shopId]/workers'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shopId } = z.object({ shopId: uuid }).parse(await ctx.params);
    const { list } = readQuery(req, query);
    const items = await listShopWorkers(user.id, shopId, list);
    return ok(items, { meta: { page: 1, limit: items.length, total: items.length } });
  });
}
