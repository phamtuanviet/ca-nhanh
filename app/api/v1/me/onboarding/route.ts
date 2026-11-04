import { handle, ok, readJson, requireUser } from '@/lib/api';
import { completeOnboarding } from '@/lib/services/profile';
import { onboardingSchema } from '@/lib/validators';

/** POST /api/v1/me/onboarding: chọn vai trò, hoàn tất hồ sơ (dưới 18 tuổi → 403, đổi vai trò → 409) */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { allowIncomplete: true });
    return ok(await completeOnboarding(user, await readJson(req, onboardingSchema)));
  });
}
