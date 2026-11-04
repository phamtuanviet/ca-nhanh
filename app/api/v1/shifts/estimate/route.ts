import { handle, ok, readJson, requireUser } from '@/lib/api';
import { estimate } from '@/lib/services/shifts';
import { estimateSchema } from '@/lib/validators';

/** POST /api/v1/shifts/estimate: chi phí dự kiến và các quy tắc bị vi phạm, không ghi gì */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    return ok(await estimate(user.id, await readJson(req, estimateSchema)));
  });
}
