import { z } from 'zod';
import { ApiError, handle, ok, readJson, requireUser } from '@/lib/api';
import { requestWithdrawal } from '@/lib/services/wallet';
import { withdrawalSchema } from '@/lib/validators';

/** POST /api/v1/wallet/withdrawals: rút tiền về ngân hàng. Bắt buộc Idempotency-Key (05 §2.3). */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'worker' });
    const key = req.headers.get('idempotency-key')?.trim();
    if (!key) throw new ApiError('IDEMPOTENCY_KEY_REQUIRED');
    z.string().min(8).max(100).parse(key);
    const { amount } = await readJson(req, withdrawalSchema);
    return ok(await requestWithdrawal(user.id, amount, key), { status: 201 });
  });
}
