import { handle, ok, requireUser } from '@/lib/api';
import { runTick } from '@/lib/services/demo';

/** POST /api/v1/admin/demo/tick: chạy bộ hẹn giờ ngay thay vì chờ pg_cron (mỗi phút) */
export async function POST(req: Request) {
  return handle(req, async () => {
    await requireUser(req, { role: 'admin' });
    return ok(await runTick());
  });
}
