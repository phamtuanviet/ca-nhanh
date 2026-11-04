import pkg from '@/package.json';
import { ApiError, handle, ok } from '@/lib/api';
import { adminClient } from '@/lib/supabase/admin';

/** GET /api/v1/health: kiểm tra ứng dụng và CSDL (05 §4.1). keep-alive.yml gọi endpoint này. */
export async function GET(req: Request) {
  return handle(req, async () => {
    const { error } = await adminClient().from('positions').select('code').limit(1);
    if (error) throw new ApiError('INTERNAL_ERROR', null, 'CSDL không phản hồi', 503);
    return ok(
      { status: 'ok', db: 'ok', time: new Date().toISOString(), version: pkg.version },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  });
}
