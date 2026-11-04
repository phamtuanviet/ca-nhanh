import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { completeWithdrawal } from '@/lib/services/admin';
import { completeWithdrawalSchema, uuid } from '@/lib/validators';

/** POST /api/v1/admin/payment-orders/{id}/complete: { success, reason? }; thất bại thì tiền hoàn về ví */
export async function POST(
  req: Request,
  ctx: RouteContext<'/api/v1/admin/payment-orders/[orderId]/complete'>,
) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    const { orderId } = z.object({ orderId: uuid }).parse(await ctx.params);
    const { success, reason } = await readJson(req, completeWithdrawalSchema);
    return ok(await completeWithdrawal(orderId, success, reason));
  });
}
