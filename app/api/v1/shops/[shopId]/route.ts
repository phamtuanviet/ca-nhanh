import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { getShop, updateShop } from '@/lib/services/shops';
import { shopPatchSchema, uuid } from '@/lib/validators';

const params = z.object({ shopId: uuid });

/** GET /api/v1/shops/{id}: thông tin quán; SĐT chỉ chủ quán thấy ở đây */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/shops/[shopId]'>) {
  return handle(req, async () => {
    const user = await requireUser(req);
    const { shopId } = params.parse(await ctx.params);
    const { owner_id, phone, ...shop } = await getShop(shopId);
    return ok({ ...shop, phone: owner_id === user.id || user.role === 'admin' ? phone : null });
  });
}

/** PATCH /api/v1/shops/{id}: sửa quán, "Đặt vị trí quán tại đây" gửi { lat, lng } */
export async function PATCH(req: Request, ctx: RouteContext<'/api/v1/shops/[shopId]'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shopId } = params.parse(await ctx.params);
    return ok(await updateShop(user.id, shopId, await readJson(req, shopPatchSchema)));
  });
}
