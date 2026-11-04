import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { removeWorkerList, setWorkerList } from '@/lib/services/workers';
import { uuid, workerListSchema } from '@/lib/validators';

type Ctx = RouteContext<'/api/v1/shops/[shopId]/workers/[workerId]/list'>;
const params = z.object({ shopId: uuid, workerId: uuid });

/** PUT: đánh dấu người quen hoặc chặn */
export async function PUT(req: Request, ctx: Ctx) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shopId, workerId } = params.parse(await ctx.params);
    return ok(
      await setWorkerList(user.id, shopId, workerId, await readJson(req, workerListSchema)),
    );
  });
}

/** DELETE: bỏ đánh dấu → 204 */
export async function DELETE(req: Request, ctx: Ctx) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shopId, workerId } = params.parse(await ctx.params);
    await removeWorkerList(user.id, shopId, workerId);
    return new Response(null, { status: 204 });
  });
}
