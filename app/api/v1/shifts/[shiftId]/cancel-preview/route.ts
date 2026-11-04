import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/api';
import { shiftCancelPreview } from '@/lib/services/shifts';
import { uuid } from '@/lib/validators';

/** GET /api/v1/shifts/{id}/cancel-preview: bồi thường và tiền hoàn nếu quán hủy cả ca */
export async function GET(
  req: Request,
  ctx: RouteContext<'/api/v1/shifts/[shiftId]/cancel-preview'>,
) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shiftId } = z.object({ shiftId: uuid }).parse(await ctx.params);
    return ok(await shiftCancelPreview(user, shiftId));
  });
}
