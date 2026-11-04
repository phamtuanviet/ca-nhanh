import 'server-only';
import { unwrap } from '@/lib/api';
import { adminClient } from '@/lib/supabase/admin';

export type Position = { code: string; name: string; icon: string | null };

/** Danh mục vị trí công việc (bảng positions) */
export async function getPositions(): Promise<Position[]> {
  return unwrap(
    await adminClient().from('positions').select('code, name, icon').order('sort_order'),
  );
}
