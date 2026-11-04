import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../../lib/database.types';

config({ path: process.env.SEED_ENV_FILE ?? '.env.local', quiet: true });

/**
 * Hủy ca do E2E tạo (fn_cancel_shift với tư cách chủ quán): booking bị hủy, tiền tạm giữ hoàn về ví,
 * để lần chạy sau người làm không vướng "Bạn đã có ca trùng giờ".
 */
export async function cancelShifts(shiftIds: string[]) {
  if (shiftIds.length === 0) return;
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  for (const id of shiftIds) {
    const { data: shift } = await db
      .from('shifts')
      .select('shop_id, status')
      .eq('id', id)
      .maybeSingle();
    if (!shift || !['open', 'full'].includes(shift.status)) continue;
    const { data: shop } = await db
      .from('shops')
      .select('owner_id')
      .eq('id', shift.shop_id)
      .single();
    if (!shop) continue;
    await db.rpc('fn_cancel_shift', {
      p_actor: shop.owner_id,
      p_shift_id: id,
      p_reason: 'Dọn dữ liệu E2E',
    });
  }
}
