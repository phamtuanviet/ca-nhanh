import { handle, ok, readJson, requireUser } from '@/lib/api';
import { resetDemo } from '@/lib/services/demo';
import { demoResetSchema } from '@/lib/validators';

/** POST /api/v1/admin/demo/reset: { days, shop_balance } */
export async function POST(req: Request) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    const { days, shop_balance } = await readJson(req, demoResetSchema);
    return ok(await resetDemo(days, shop_balance));
  });
}
