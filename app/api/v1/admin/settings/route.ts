import { handle, ok, readJson, requireUser } from '@/lib/api';
import { getAdminSettings, updateSettings } from '@/lib/services/admin';
import { settingsPatchSchema } from '@/lib/validators';

/** GET /api/v1/admin/settings: toàn bộ tham số */
export async function GET(req: Request) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    return ok(await getAdminSettings());
  });
}

/** PATCH /api/v1/admin/settings: { fee_rate: 0.18, min_lead_minutes: 2 }; khóa lạ hoặc sai miền → 400 */
export async function PATCH(req: Request) {
  return handle(req, async () => {
    const admin = await requireUser(req, { role: 'admin' });
    return ok(await updateSettings(admin.id, await readJson(req, settingsPatchSchema)));
  });
}
