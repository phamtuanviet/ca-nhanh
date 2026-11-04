import { z } from 'zod';
import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listTransactions } from '@/lib/services/wallet';
import { paginationSchema } from '@/lib/validators';

const TYPES = [
  'topup',
  'hold',
  'release',
  'shift_payment',
  'earning',
  'platform_fee',
  'boost_fee',
  'compensation',
  'withdrawal',
  'withdrawal_reversal',
  'adjustment',
] as const;
const query = z
  .object({
    type: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(',') : undefined))
      .pipe(z.array(z.enum(TYPES)).optional()),
  })
  .extend(paginationSchema.shape);

/** GET /api/v1/wallet/transactions?type=hold,release */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req);
    const q = readQuery(req, query);
    const { items, total } = await listTransactions(user.id, {
      types: q.type,
      page: q.page,
      limit: q.limit,
    });
    return ok(items, { meta: { page: q.page, limit: q.limit, total } });
  });
}
