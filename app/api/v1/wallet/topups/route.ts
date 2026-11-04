import { z } from 'zod';
import { ApiError, handle, ok, readJson, requireUser } from '@/lib/api';
import { createTopup } from '@/lib/services/wallet';
import { topupSchema } from '@/lib/validators';

/** POST /api/v1/wallet/topups: tạo lệnh nạp VietQR. Bắt buộc Idempotency-Key (05 §2.3). */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const key = req.headers.get('idempotency-key')?.trim();
    if (!key) throw new ApiError('IDEMPOTENCY_KEY_REQUIRED');
    z.string().min(8).max(100).parse(key);
    const { amount } = await readJson(req, topupSchema);
    return ok(await createTopup(user.id, amount, key), { status: 201 });
  });
}
