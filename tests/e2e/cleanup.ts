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
    // Test hỏng giữa chừng sau khi đã check-in: fn_cancel_shift chỉ hủy booking "confirmed", nên hủy
    // trước booking đang làm (không có dòng tiền riêng; tạm giữ của chỗ được hoàn cùng cả ca bên dưới)
    await db
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'shop',
        cancel_reason: 'Dọn dữ liệu E2E',
        seat_hold: 0,
      })
      .eq('shift_id', id)
      .eq('status', 'checked_in');
    await db.rpc('fn_cancel_shift', {
      p_actor: shop.owner_id,
      p_shift_id: id,
      p_reason: 'Dọn dữ liệu E2E',
    });
  }
}

/**
 * Xóa điểm phạt do E2E tạo (người làm hủy sát giờ) và gỡ tạm khóa nếu có, để chạy lại nhiều lần
 * không làm tài khoản demo bị khóa nhận ca (4 điểm trong 30 ngày → khóa 7 ngày).
 */
export async function forgivePenalties(bookingIds: string[]) {
  if (bookingIds.length === 0) return;
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await db
    .from('bookings')
    .update({ penalty_points: 0 })
    .in('id', bookingIds)
    .select('worker_id');
  const workers = [...new Set((data ?? []).map((b) => b.worker_id))];
  if (workers.length > 0)
    await db.from('worker_profiles').update({ suspended_until: null }).in('user_id', workers);
}
