import { handle, ok, readJson, readQuery, requestClient, requireUser } from '@/lib/api';
import { publish, searchShifts } from '@/lib/services/shifts';
import { publishShiftSchema, searchShiftsSchema } from '@/lib/validators';

/** GET /api/v1/shifts: tìm ca gần vị trí (search_shifts, ẩn ca của quán đã chặn người gọi) */
export async function GET(req: Request) {
  return handle(req, async () => {
    await requireUser(req);
    const params = readQuery(req, searchShiftsSchema);
    const { items, total } = await searchShifts(await requestClient(req), params);
    return ok(items, { meta: { page: params.page, limit: params.limit, total } });
  });
}

/** POST /api/v1/shifts: đăng ca và tạm giữ tiền (fn_publish_shift) */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'shop_owner' });
    return ok(await publish(user.id, await readJson(req, publishShiftSchema)), { status: 201 });
  });
}
