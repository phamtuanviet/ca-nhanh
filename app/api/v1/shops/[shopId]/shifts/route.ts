import { z } from 'zod';
import { handle, ok, readQuery, requireUser } from '@/lib/api';
import { listShopShifts } from '@/lib/services/shifts';
import { paginationSchema, uuid } from '@/lib/validators';

const STATUSES = ['open', 'full', 'in_progress', 'completed', 'cancelled', 'expired'] as const;
const query = z
  .object({
    status: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(',') : undefined))
      .pipe(z.array(z.enum(STATUSES)).optional()),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .extend(paginationSchema.shape);

/** GET /api/v1/shops/{id}/shifts: ca của quán kèm chỗ đã lấp, giờ công chờ duyệt */
export async function GET(req: Request, ctx: RouteContext<'/api/v1/shops/[shopId]/shifts'>) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    const { shopId } = z.object({ shopId: uuid }).parse(await ctx.params);
    const q = readQuery(req, query);
    const toIso = (date?: string) =>
      date ? new Date(`${date}T00:00:00+07:00`).toISOString() : undefined;
    const { items, total } = await listShopShifts(user.id, shopId, {
      statuses: q.status,
      from: toIso(q.from),
      to: q.to
        ? new Date(new Date(`${q.to}T00:00:00+07:00`).getTime() + 86_400_000).toISOString()
        : undefined,
      page: q.page,
      limit: q.limit,
    });
    return ok(items, { meta: { page: q.page, limit: q.limit, total } });
  });
}
