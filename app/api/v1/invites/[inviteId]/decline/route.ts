import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { respondInvite } from '@/lib/services/invites';
import { uuid } from '@/lib/validators';

/** POST /api/v1/invites/{id}/decline */
export async function POST(req: Request, ctx: RouteContext<'/api/v1/invites/[inviteId]/decline'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'worker' });
    const { inviteId } = z.object({ inviteId: uuid }).parse(await ctx.params);
    return ok(await respondInvite(user, inviteId, false), { status: 200 });
  });
}
