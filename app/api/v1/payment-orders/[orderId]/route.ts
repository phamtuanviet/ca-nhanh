import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { getPaymentOrder } from '@/lib/services/wallet';
import { uuid } from '@/lib/validators';

/** GET /api/v1/payment-orders/{id}: lệnh của chính mình (admin xem mọi lệnh) */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/payment-orders/[orderId]'>) {
  return handle(req, async () => {
    const user = await requireUser(req);
    const { orderId } = z.object({ orderId: uuid }).parse(await ctx.params);
    return ok(await getPaymentOrder(user, orderId));
  });
}
