import 'server-only';
import type { z } from 'zod';
import { ApiError, type ApiUser, unwrap, unwrapMaybe } from '@/lib/api';
import { fromPostgrest } from '@/lib/errors';
import { asciiUpper } from '@/lib/format';
import { toEwkt } from '@/lib/geo';
import type { Database } from '@/lib/database.types';
import { adminClient } from '@/lib/supabase/admin';
import type { onboardingSchema, updateMeSchema, workerProfileSchema } from '@/lib/validators';

export { asciiUpper };

function maskAccount(accountNo: string | null): string | null {
  return accountNo ? `•••• ${accountNo.slice(-4)}` : null;
}

/** Hồ sơ đầy đủ của người đang đăng nhập (GET /me, 05 §4.2) */
export async function getMe(user: Pick<ApiUser, 'id' | 'email'>) {
  const db = adminClient();
  const [profile, wallet] = await Promise.all([
    db
      .from('profiles')
      .select('id, role, full_name, phone, avatar_url, status, onboarded_at')
      .eq('id', user.id)
      .single()
      .then(unwrap),
    db
      .from('wallets')
      .select('type, balance, held_balance')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(unwrapMaybe),
  ]);

  let workerProfile = null;
  if (profile.role === 'worker') {
    const [wp, penalty] = await Promise.all([
      db
        .from('worker_profiles')
        .select(
          'date_of_birth, school, bio, skills, kyc_status, rating_avg, rating_count, completed_count, no_show_count, suspended_until, bank_bin, bank_account_no, bank_account_name',
        )
        .eq('user_id', user.id)
        .maybeSingle()
        .then(unwrapMaybe),
      db.rpc('penalty_points_of', { p_worker: user.id }).then(unwrapMaybe),
    ]);
    if (wp) {
      const { bank_bin, bank_account_no, bank_account_name, ...rest } = wp;
      workerProfile = {
        ...rest,
        rating_avg: Number(rest.rating_avg),
        penalty_points: penalty ?? 0,
        bank: bank_bin
          ? {
              bin: bank_bin,
              account_no_masked: maskAccount(bank_account_no),
              account_name: bank_account_name,
            }
          : null,
      };
    }
  }

  const shops =
    profile.role === 'shop_owner'
      ? unwrap(
          await db
            .from('shops')
            .select('id, name, verification_status')
            .eq('owner_id', user.id)
            .order('created_at'),
        )
      : null;

  const { onboarded_at, ...rest } = profile;
  return {
    ...rest,
    email: user.email,
    onboarded: onboarded_at !== null,
    worker_profile: workerProfile,
    shops,
    wallet,
  };
}

export type Me = Awaited<ReturnType<typeof getMe>>;

/** Hoàn tất onboarding (P1-01): vai trò, họ tên, SĐT, ngày sinh (người làm) */
export async function completeOnboarding(
  user: Pick<ApiUser, 'id' | 'email'>,
  input: z.output<typeof onboardingSchema>,
) {
  if (input.role === 'worker' && !input.date_of_birth) throw new ApiError('PROFILE_INCOMPLETE');
  const { error } = await adminClient().rpc('fn_complete_onboarding', {
    p_actor: user.id,
    p_role: input.role,
    p_full_name: input.full_name,
    p_phone: input.phone,
    p_date_of_birth: input.date_of_birth,
  });
  if (error) throw fromPostgrest(error);
  return getMe(user);
}

/** PATCH /me: họ tên, SĐT, ảnh đại diện */
export async function updateMe(
  user: Pick<ApiUser, 'id' | 'email'>,
  input: z.output<typeof updateMeSchema>,
) {
  if (Object.keys(input).length > 0) {
    const { error } = await adminClient().from('profiles').update(input).eq('id', user.id);
    if (error) throw fromPostgrest(error);
  }
  return getMe(user);
}

/** PATCH /me/worker-profile: kỹ năng phải thuộc danh mục positions; tên tài khoản in hoa, bỏ dấu */
export async function updateWorkerProfile(
  user: Pick<ApiUser, 'id' | 'email'>,
  input: z.output<typeof workerProfileSchema>,
) {
  const db = adminClient();
  const patch: Database['public']['Tables']['worker_profiles']['Update'] = {};
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.school !== undefined) patch.school = input.school;
  if (input.skills !== undefined) {
    const codes = unwrap(await db.from('positions').select('code')).map((row) => row.code);
    const unknown = input.skills.filter((skill) => !codes.includes(skill));
    if (unknown.length > 0) {
      throw new ApiError('VALIDATION_ERROR', [
        { field: 'skills', message: `Không có vị trí: ${unknown.join(', ')}` },
      ]);
    }
    patch.skills = [...new Set(input.skills)];
  }
  if (input.home_location !== undefined) {
    patch.home_location = input.home_location ? toEwkt(input.home_location) : null;
  }
  if (input.bank !== undefined) {
    patch.bank_bin = input.bank?.bin ?? null;
    patch.bank_account_no = input.bank?.account_no ?? null;
    patch.bank_account_name = input.bank ? asciiUpper(input.bank.account_name) : null;
  }
  if (Object.keys(patch).length > 0) {
    const { data, error } = await db
      .from('worker_profiles')
      .update(patch)
      .eq('user_id', user.id)
      .select('user_id');
    if (error) throw fromPostgrest(error);
    if (!data?.length) throw new ApiError('PROFILE_INCOMPLETE');
  }
  return getMe(user);
}

/** Banner tạm khóa nhận ca (P2-07, BR-11): còn bị khóa không, đến bao giờ, bao nhiêu điểm phạt */
export async function workerStanding(userId: string) {
  const db = adminClient();
  const [wp, points] = await Promise.all([
    db
      .from('worker_profiles')
      .select('suspended_until')
      .eq('user_id', userId)
      .maybeSingle()
      .then(unwrapMaybe),
    db.rpc('penalty_points_of', { p_worker: userId }).then(unwrapMaybe),
  ]);
  const until = wp?.suspended_until ?? null;
  return {
    suspended_until: until && new Date(until).getTime() > Date.now() ? until : null,
    penalty_points: points ?? 0,
  };
}
