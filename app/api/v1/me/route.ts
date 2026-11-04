import { handle, ok, readJson, requireUser } from '@/lib/api';
import { getMe, updateMe } from '@/lib/services/profile';
import { updateMeSchema } from '@/lib/validators';

/** GET /api/v1/me: hồ sơ của người đang đăng nhập (05 §4.2) */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { allowIncomplete: true, allowLocked: true });
    return ok(await getMe(user));
  });
}

/** PATCH /api/v1/me: họ tên, SĐT, ảnh đại diện */
export async function PATCH(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { allowIncomplete: true });
    return ok(await updateMe(user, await readJson(req, updateMeSchema)));
  });
}
