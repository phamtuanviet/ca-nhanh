import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listPaymentOrders } from '@/lib/services/admin';
import { paymentOrdersQuerySchema } from '@/lib/validators';

/** GET /api/v1/admin/payment-orders?kind=withdrawal&status=pending */
export async function GET(req: Request) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    const q = readQuery(req, paymentOrdersQuerySchema);
    const { items, total } = await listPaymentOrders(q);
    return ok(items, { meta: { page: q.page, limit: q.limit, total } });
  });
}
