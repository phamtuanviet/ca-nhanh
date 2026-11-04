import { handle, ok, readJson, requireUser } from '@/lib/api';
import { updateWorkerProfile } from '@/lib/services/profile';
import { workerProfileSchema } from '@/lib/validators';

/** PATCH /api/v1/me/worker-profile: kỹ năng, trường, giới thiệu, vị trí nhà, tài khoản ngân hàng */
export async function PATCH(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'worker' });
    return ok(await updateWorkerProfile(user, await readJson(req, workerProfileSchema)));
  });
}
