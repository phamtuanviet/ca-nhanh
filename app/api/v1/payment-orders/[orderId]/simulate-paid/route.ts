import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { simulateTopupPaid } from '@/lib/services/wallet';
import { uuid } from '@/lib/validators';

/** POST /api/v1/payment-orders/{id}/simulate-paid: chỉ ở chế độ demo, idempotent */
export async function POST(
  req: Request,
  ctx: RouteContext<'/api/v1/payment-orders/[orderId]/simulate-paid'>,
) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: ['shop_owner', 'admin'] });
    const { orderId } = z.object({ orderId: uuid }).parse(await ctx.params);
    return ok(await simulateTopupPaid(user, orderId));
  });
}
