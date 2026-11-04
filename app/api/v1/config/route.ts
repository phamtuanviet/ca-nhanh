import { handle, ok, unwrap } from '@/lib/api';
import { adminClient } from '@/lib/supabase/admin';

/** GET /api/v1/config: tham số nền tảng công khai (bảng platform_settings, is_public = true) */
export async function GET(req: Request) {
  return handle(req, async () => {
    const rows = unwrap(
      await adminClient().from('platform_settings').select('key, value').eq('is_public', true),
    );
    const config = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return ok(config, { headers: { 'Cache-Control': 'public, max-age=60' } });
  });
}
