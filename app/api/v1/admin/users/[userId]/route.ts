import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { updateUser } from '@/lib/services/admin';
import { adminUserPatchSchema, uuid } from '@/lib/validators';

/** PATCH /api/v1/admin/users/{id}: { status: 'locked' | 'active' } hoặc { clear_suspension: true } */
export async function PATCH(req: Request, ctx: RouteContext<'/api/v1/admin/users/[userId]'>) {
  return handle(req, async () => {
    const admin = await requireUser(req, { role: 'admin' });
    const { userId } = z.object({ userId: uuid }).parse(await ctx.params);
    return ok(await updateUser(admin.id, userId, await readJson(req, adminUserPatchSchema)));
  });
}
