import 'server-only';
import { ApiError, type ApiUser, unwrapMaybe } from '@/lib/api';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import { demoEnabled } from './settings';
import { presentShift } from './shifts';

async function assertDemo() {
  if (!(await demoEnabled())) throw new ApiError('DEMO_DISABLED');
}

/**
 * POST /admin/demo/fast-forward: dời ca để "bắt đầu sau 1 phút" (start) hoặc "vừa kết thúc 1 phút" (end).
 * Admin hoặc chủ quán của ca; chỉ ở chế độ demo (US-45).
 */
export async function fastForward(
  user: Pick<ApiUser, 'id' | 'role'>,
  shiftId: string,
  to: 'start' | 'end',
) {
  await assertDemo();
  const db = adminClient();
  const shift = unwrapMaybe(
    await db.from('shifts').select('shop_id').eq('id', shiftId).maybeSingle(),
  );
  if (!shift) throw new ApiError('NOT_FOUND');
  if (user.role !== 'admin') {
    const shop = unwrapMaybe(
      await db.from('shops').select('owner_id').eq('id', shift.shop_id).maybeSingle(),
    );
    if (shop?.owner_id !== user.id) throw new ApiError('FORBIDDEN');
  }
  const { data, error } = await db.rpc('fn_demo_fast_forward', { p_shift_id: shiftId, p_to: to });
  if (error) throw fromPostgrest(error);
  return presentShift(data);
}

/** POST /admin/demo/tick: chạy bộ hẹn giờ ngay (nhắc ca, bắt đầu ca, vắng mặt, tự check-out, tự duyệt) */
export async function runTick() {
  await assertDemo();
  const { data, error } = await adminClient().rpc('fn_cron_tick');
  if (error) throw fromPostgrest(error);
  return data;
}

/** POST /admin/demo/reset: xóa giao dịch, sinh lại lịch sử, nạp sẵn số dư cho mỗi ví quán */
export async function resetDemo(days: number, shopBalance: number) {
  await assertDemo();
  const { data, error } = await adminClient().rpc('fn_demo_reset', {
    p_days: days,
    p_shop_balance: shopBalance,
  });
  if (error) throw fromPostgrest(error);
  return data;
}
