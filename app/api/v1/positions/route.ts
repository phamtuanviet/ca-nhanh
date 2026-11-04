import { handle, ok, unwrap } from '@/lib/api';
import { adminClient } from '@/lib/supabase/admin';

/** GET /api/v1/positions: danh mục vị trí công việc (dùng cho kỹ năng và bộ lọc) */
export async function GET(req: Request) {
  return handle(req, async () => {
    const rows = unwrap(
      await adminClient().from('positions').select('code, name, icon').order('sort_order'),
    );
    return ok(rows, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  });
}
