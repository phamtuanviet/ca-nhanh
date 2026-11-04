import { handle, ok, requireUser, unwrap, unwrapMaybe } from '@/lib/api';
import { adminClient } from '@/lib/supabase/admin';

function maskAccount(accountNo: string | null): string | null {
  return accountNo ? `•••• ${accountNo.slice(-4)}` : null;
}

/** GET /api/v1/me: hồ sơ của người đang đăng nhập (05 §4.2) */
export async function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireUser(req, { allowIncomplete: true, allowLocked: true });
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
        db.rpc('penalty_points_of', { p_worker: user.id }).then(unwrap),
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
    return ok({
      ...rest,
      email: user.email,
      onboarded: onboarded_at !== null,
      worker_profile: workerProfile,
      shops,
      wallet,
    });
  });
}
