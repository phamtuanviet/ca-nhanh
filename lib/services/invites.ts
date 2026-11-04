import 'server-only';
import { ApiError, type ApiUser, unwrap } from '@/lib/api';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';

/**
 * POST /shifts/{id}/invites (P3-07, US-17): chỉ người quen hoặc người từng hoàn thành ca ở quán và không
 * bị chặn mới được mời (BR-25); người không đủ điều kiện hoặc đã được mời nằm trong `skipped`.
 */
export async function inviteWorkers(
  user: Pick<ApiUser, 'id'>,
  shiftId: string,
  workerIds: string[],
  message?: string,
) {
  const unique = [...new Set(workerIds)];
  const { data, error } = await adminClient().rpc('fn_invite_workers', {
    p_actor: user.id,
    p_shift_id: shiftId,
    p_worker_ids: unique,
    p_message: message || undefined,
  });
  if (error) throw fromPostgrest(error);
  return { invited: data, skipped: unique.length - data };
}

/** Người đã được mời cho một ca (để hộp thoại mời đánh dấu sẵn) */
export async function invitedWorkerIds(shiftId: string) {
  const rows = unwrap(
    await adminClient().from('shift_invites').select('worker_id, status').eq('shift_id', shiftId),
  );
  return rows;
}

/** GET /invites?status=pending (W9, BKG-09): lời mời của người làm, kèm ca và quán */
export async function listInvites(
  userId: string,
  status?: 'pending' | 'accepted' | 'declined' | 'expired',
) {
  let query = adminClient()
    .from('shift_invites')
    .select(
      'id, status, message, created_at, shift:shifts(id, title, start_at, end_at, hourly_rate, est_wage_per_seat, status), shop:shops(id, name, address, district)',
    )
    .eq('worker_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (status) query = query.eq('status', status);
  const rows = unwrap(await query);
  // Lời mời còn chờ nhưng ca đã bắt đầu, đầy hoặc hủy thì không hiện là "chờ"
  const now = Date.now();
  return rows.filter(
    (r) =>
      status !== 'pending' ||
      (r.shift && r.shift.status === 'open' && new Date(r.shift.start_at).getTime() > now),
  );
}

export type Invite = Awaited<ReturnType<typeof listInvites>>[number];

/** POST /invites/{id}/accept | decline: nhận lời mời tạo booking (dùng chung kiểm tra với nhận ca) */
export async function respondInvite(user: Pick<ApiUser, 'id'>, inviteId: string, accept: boolean) {
  const { data, error } = await adminClient().rpc('fn_respond_invite', {
    p_actor: user.id,
    p_invite_id: inviteId,
    p_accept: accept,
  });
  if (error) throw fromPostgrest(error);
  const result = data as {
    invite: { id: string; status: string };
    booking?: { id: string; status: string; source: string };
  };
  if (!result?.invite) throw new ApiError('INTERNAL_ERROR');
  return {
    invite: { id: result.invite.id, status: result.invite.status },
    ...(result.booking
      ? {
          booking: {
            id: result.booking.id,
            status: result.booking.status,
            source: result.booking.source,
          },
        }
      : {}),
  };
}
