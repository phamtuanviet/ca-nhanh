import { handle, ok, readJson, requireUser } from '@/lib/api';
import { createShop } from '@/lib/services/shops';
import { shopSchema } from '@/lib/validators';

/** POST /api/v1/shops: tạo quán (demo tự duyệt) */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    return ok(await createShop(user.id, await readJson(req, shopSchema)), { status: 201 });
  });
}
