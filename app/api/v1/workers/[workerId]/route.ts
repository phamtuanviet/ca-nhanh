import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { getWorkerProfile } from '@/lib/services/workers';
import { uuid } from '@/lib/validators';

/** GET /api/v1/workers/{id}: hồ sơ năng lực (chủ quán, admin, chính người làm) */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/workers/[workerId]'>) {
  return handle(req, async () => {
    const user = await requireUser(req);
    const { workerId } = z.object({ workerId: uuid }).parse(await ctx.params);
    return ok(await getWorkerProfile(user, workerId));
  });
}
