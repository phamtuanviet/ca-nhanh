import { handle, ok, readJson, requireUser } from '@/lib/api';
import { markNotificationsRead } from '@/lib/services/notifications';
import { notificationReadSchema } from '@/lib/validators';

/** POST /api/v1/notifications/read: { ids: [...] } hoặc { all: true } */
export async function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { allowIncomplete: true });
    return ok(await markNotificationsRead(user.id, await readJson(req, notificationReadSchema)));
  });
}
