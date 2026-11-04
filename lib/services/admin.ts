import 'server-only';
import { ApiError, unwrap, unwrapMaybe } from '@/lib/api';
import type { Database, Json } from '@/lib/database.types';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import type { SettingKey } from '@/lib/validators';

export type KpiDay = {
  day: string;
  shifts_posted: number;
  seats_posted: number;
  seats_filled: number;
  fill_rate: number | null;
  median_minutes_to_fill: number | null;
  bookings_completed: number;
  no_shows: number;
  late_cancels: number;
  gmv: number;
  fee_revenue: number;
};

export type KpiSummary = {
  from: string;
  to: string;
  shifts_posted: number;
  seats_posted: number;
  seats_filled: number;
  fill_rate: number | null;
  bookings_completed: number;
  no_show_rate: number | null;
  median_minutes_to_fill: number | null;
  gmv: number;
  fee_revenue: number;
  boost_revenue: number;
  active_workers: number;
  active_shops: number;
  rebook_rate: number | null;
  daily: KpiDay[];
};

const DAY = 86_400_000;
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

async function summary(from: string, to: string): Promise<KpiSummary> {
  const { data, error } = await adminClient().rpc('fn_kpi_summary', { p_from: from, p_to: to });
  if (error) throw fromPostgrest(error);
  const s = data as unknown as KpiSummary;
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...s,
    fill_rate: num(s.fill_rate),
    no_show_rate: num(s.no_show_rate),
    rebook_rate: num(s.rebook_rate),
    median_minutes_to_fill: num(s.median_minutes_to_fill),
    daily: (s.daily ?? []).map((d) => ({
      ...d,
      fill_rate: num(d.fill_rate),
      median_minutes_to_fill: num(d.median_minutes_to_fill),
    })),
  };
}

/**
 * GET /admin/kpis?from&to (P3-04, Gherkin 02 §6.10): fn_kpi_summary cho khoảng đã chọn, kèm kỳ liền
 * trước cùng độ dài để thẻ số hiện chênh lệch. Ngày không có ca được thêm vào `daily` với số 0,
 * để biểu đồ luôn đủ một điểm mỗi ngày.
 */
export async function getKpis(from: string, to: string) {
  const start = toDate(from);
  const end = toDate(to);
  const days = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  if (days < 1 || days > 366) {
    throw new ApiError('VALIDATION_ERROR', [
      { field: 'to', message: 'Khoảng ngày từ 1 đến 366 ngày' },
    ]);
  }
  const prevTo = fmt(new Date(start.getTime() - DAY));
  const prevFrom = fmt(new Date(start.getTime() - days * DAY));
  const [current, previous] = await Promise.all([summary(from, to), summary(prevFrom, prevTo)]);
  const byDay = new Map(current.daily.map((d) => [d.day, d]));
  const daily: KpiDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = fmt(new Date(start.getTime() + i * DAY));
    daily.push(
      byDay.get(day) ?? {
        day,
        shifts_posted: 0,
        seats_posted: 0,
        seats_filled: 0,
        fill_rate: null,
        median_minutes_to_fill: null,
        bookings_completed: 0,
        no_shows: 0,
        late_cancels: 0,
        gmv: 0,
        fee_revenue: 0,
      },
    );
  }
  const { daily: _prevDaily, ...prev } = previous;
  return { ...current, daily, previous: prev };
}

export type KpiReport = Awaited<ReturnType<typeof getKpis>>;

/** Mốc đầu của tstzrange Postgres: '["2026-11-04 10:30:10.5+00","…")' → ISO */
function rangeStart(range: string): string | null {
  const m = /^[[(]"?([^",]+)/.exec(range);
  if (!m) return null;
  return m[1].replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
}

// ---------- Người dùng (05 §4.8: GET /admin/users, PATCH /admin/users/{id}) ----------

type Role = Database['public']['Enums']['user_role'];

/** Email nằm ở auth.users: đọc một lần (quy mô demo vài chục tài khoản) */
async function emailMap() {
  const { data, error } = await adminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new ApiError('INTERNAL_ERROR');
  return new Map(data.users.map((u) => [u.id, u.email ?? null]));
}

export async function listUsers(filter: {
  role?: Role;
  status?: 'active' | 'locked';
  q?: string;
  page: number;
  limit: number;
}) {
  const db = adminClient();
  let query = db
    .from('profiles')
    .select('id, role, full_name, phone, avatar_url, status, created_at, onboarded_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (filter.role) query = query.eq('role', filter.role);
  if (filter.status) query = query.eq('status', filter.status);
  const [profiles, emails, settings] = await Promise.all([
    query.then(unwrap),
    emailMap(),
    db
      .from('platform_settings')
      .select('value')
      .eq('key', 'penalty_window_days')
      .single()
      .then(unwrap),
  ]);
  const q = filter.q?.toLowerCase();
  const matched = profiles
    .map((p) => ({ ...p, email: emails.get(p.id) ?? null }))
    .filter(
      (p) =>
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q) ||
        (p.email ?? '').toLowerCase().includes(q),
    );
  const total = matched.length;
  const page = matched.slice((filter.page - 1) * filter.limit, filter.page * filter.limit);
  const ids = page.map((p) => p.id);

  // Thông tin theo vai trò: người làm (điểm, ca, điểm phạt, tạm khóa), chủ quán (số quán)
  const windowDays = Number(settings.value) || 30;
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const [workers, penalties, shops] = await Promise.all([
    db
      .from('worker_profiles')
      .select(
        'user_id, kyc_status, rating_avg, rating_count, completed_count, no_show_count, suspended_until',
      )
      .in('user_id', ids)
      .then(unwrap),
    db
      .from('bookings')
      .select('worker_id, penalty_points, cancelled_at, period')
      .in('worker_id', ids)
      .gt('penalty_points', 0)
      .then(unwrap),
    db.from('shops').select('owner_id').in('owner_id', ids).then(unwrap),
  ]);
  const wp = new Map(workers.map((w) => [w.user_id, w]));
  const points = new Map<string, number>();
  for (const b of penalties) {
    // Giống penalty_points_of: tính theo lúc hủy, hoặc giờ bắt đầu ca (vắng mặt)
    const at = b.cancelled_at ?? rangeStart(String(b.period));
    if (at && new Date(at).toISOString() > since)
      points.set(b.worker_id, (points.get(b.worker_id) ?? 0) + b.penalty_points);
  }
  const shopCount = new Map<string, number>();
  for (const s of shops) shopCount.set(s.owner_id, (shopCount.get(s.owner_id) ?? 0) + 1);
  const now = Date.now();

  return {
    total,
    items: page.map((p) => {
      const w = wp.get(p.id);
      return {
        ...p,
        worker: w
          ? {
              kyc_status: w.kyc_status,
              rating_avg: Number(w.rating_avg),
              rating_count: w.rating_count,
              completed_count: w.completed_count,
              no_show_count: w.no_show_count,
              penalty_points: points.get(p.id) ?? 0,
              suspended_until:
                w.suspended_until && new Date(w.suspended_until).getTime() > now
                  ? w.suspended_until
                  : null,
            }
          : null,
        shop_count: p.role === 'shop_owner' ? (shopCount.get(p.id) ?? 0) : null,
      };
    }),
  };
}

export type AdminUser = Awaited<ReturnType<typeof listUsers>>['items'][number];

/** Khóa/mở khóa tài khoản, gỡ tạm khóa nhận ca. Admin không tự khóa mình. */
export async function updateUser(
  adminId: string,
  userId: string,
  patch: { status?: 'active' | 'locked'; clear_suspension?: true },
) {
  const db = adminClient();
  const profile = unwrapMaybe(
    await db.from('profiles').select('id, role, status').eq('id', userId).maybeSingle(),
  );
  if (!profile) throw new ApiError('NOT_FOUND');
  if (patch.status === 'locked' && userId === adminId) {
    throw new ApiError('VALIDATION_ERROR', [
      { field: 'status', message: 'Không thể tự khóa tài khoản của mình' },
    ]);
  }
  if (patch.status && patch.status !== profile.status) {
    const { error } = await db.from('profiles').update({ status: patch.status }).eq('id', userId);
    if (error) throw fromPostgrest(error);
    await db.rpc('fn_notify', {
      p_user: userId,
      p_type: patch.status === 'locked' ? 'account.locked' : 'account.unlocked',
      p_title: patch.status === 'locked' ? 'Tài khoản đã bị khóa' : 'Tài khoản đã được mở khóa',
      p_body:
        patch.status === 'locked'
          ? 'Liên hệ hỗ trợ Ca Nhanh nếu bạn cho rằng đây là nhầm lẫn.'
          : 'Bạn đã có thể dùng Ca Nhanh bình thường.',
    });
  }
  if (patch.clear_suspension) {
    if (profile.role !== 'worker') throw new ApiError('INVALID_STATE');
    const { error } = await db
      .from('worker_profiles')
      .update({ suspended_until: null })
      .eq('user_id', userId);
    if (error) throw fromPostgrest(error);
    await db.rpc('fn_notify', {
      p_user: userId,
      p_type: 'account.unsuspended',
      p_title: 'Đã gỡ tạm khóa nhận ca',
      p_body: 'Bạn có thể nhận ca trở lại. Hãy giữ lịch đã nhận để tránh điểm phạt.',
    });
  }
  return { id: userId, ...patch };
}

// ---------- Quán (GET /admin/shops, POST /admin/shops/{id}/review) ----------

export async function listShops(status?: Database['public']['Enums']['verification_status']) {
  const db = adminClient();
  let query = db
    .from('shops')
    .select(
      'id, owner_id, name, category, address, district, phone, verification_status, rating_avg, rating_count, is_active, created_at',
    )
    .order('created_at', { ascending: false });
  if (status) query = query.eq('verification_status', status);
  const shops = unwrap(await query);
  const owners = unwrap(
    await db
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', [...new Set(shops.map((s) => s.owner_id))]),
  );
  const byId = new Map(owners.map((o) => [o.id, o]));
  return shops.map((s) => ({
    ...s,
    rating_avg: Number(s.rating_avg),
    owner: byId.get(s.owner_id) ?? null,
  }));
}

export type AdminShop = Awaited<ReturnType<typeof listShops>>[number];

export async function reviewShop(shopId: string, approve: boolean, reason?: string) {
  const db = adminClient();
  const shop = unwrapMaybe(
    await db.from('shops').select('id, owner_id, name').eq('id', shopId).maybeSingle(),
  );
  if (!shop) throw new ApiError('NOT_FOUND');
  const { data, error } = await db
    .from('shops')
    .update({ verification_status: approve ? 'verified' : 'rejected' })
    .eq('id', shopId)
    .select('id, name, verification_status')
    .single();
  if (error) throw fromPostgrest(error);
  await db.rpc('fn_notify', {
    p_user: shop.owner_id,
    p_type: 'shop.reviewed',
    p_title: approve ? `${shop.name} đã được xác minh` : `${shop.name} chưa được duyệt`,
    p_body: approve ? 'Quán đã có thể đăng ca.' : `Lý do: ${reason}`,
    p_data: { shop_id: shop.id },
  });
  return data;
}

// ---------- Lệnh thanh toán (GET /admin/payment-orders, POST …/complete) ----------

export async function listPaymentOrders(filter: {
  kind?: Database['public']['Enums']['payment_kind'];
  status?: Database['public']['Enums']['payment_status'];
  page: number;
  limit: number;
}) {
  const db = adminClient();
  let query = db
    .from('payment_orders')
    .select(
      'id, kind, amount, status, reference_code, provider, provider_txn_id, failure_reason, bank_snapshot, created_at, completed_at, expires_at, wallet:wallets(owner_id, type)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range((filter.page - 1) * filter.limit, filter.page * filter.limit - 1);
  if (filter.kind) query = query.eq('kind', filter.kind);
  if (filter.status) query = query.eq('status', filter.status);
  const { data, count, error } = await query;
  if (error) throw fromPostgrest(error);
  const rows = data ?? [];
  const ownerIds = [
    ...new Set(rows.map((r) => r.wallet?.owner_id).filter((id): id is string => !!id)),
  ];
  const owners = ownerIds.length
    ? unwrap(await db.from('profiles').select('id, full_name, role').in('id', ownerIds))
    : [];
  const byId = new Map(owners.map((o) => [o.id, o]));
  return {
    total: count ?? 0,
    items: rows.map(({ wallet, bank_snapshot, ...r }) => {
      const bank = bank_snapshot as {
        bank_bin: string;
        account_no: string;
        account_name: string;
      } | null;
      return {
        ...r,
        owner: wallet?.owner_id ? (byId.get(wallet.owner_id) ?? null) : null,
        bank: bank
          ? {
              bank_bin: bank.bank_bin,
              account_no_last4: bank.account_no.slice(-4),
              account_name: bank.account_name,
            }
          : null,
      };
    }),
  };
}

export type AdminPaymentOrder = Awaited<ReturnType<typeof listPaymentOrders>>['items'][number];

/** Xác nhận lệnh rút đã chuyển hoặc thất bại (thất bại thì tiền tự hoàn về ví) */
export async function completeWithdrawal(orderId: string, success: boolean, reason?: string) {
  const db = adminClient();
  const order = unwrapMaybe(
    await db.from('payment_orders').select('id, kind, status').eq('id', orderId).maybeSingle(),
  );
  if (!order) throw new ApiError('NOT_FOUND');
  if (order.kind !== 'withdrawal' || order.status !== 'pending')
    throw new ApiError('INVALID_STATE');
  const { data, error } = await db.rpc('fn_complete_withdrawal', {
    p_order_id: orderId,
    p_success: success,
    p_provider_txn_id: success ? `ADM${Date.now()}` : undefined,
    p_reason: success ? undefined : reason,
  });
  if (error) throw fromPostgrest(error);
  return { id: data.id, status: data.status, completed_at: data.completed_at };
}

// ---------- Cấu hình (GET|PATCH /admin/settings) ----------

export async function getAdminSettings() {
  const rows = unwrap(
    await adminClient()
      .from('platform_settings')
      .select('key, value, description, is_public, updated_at, updated_by')
      .order('key'),
  );
  return rows;
}

export type AdminSetting = Awaited<ReturnType<typeof getAdminSettings>>[number];

export async function updateSettings(adminId: string, patch: Partial<Record<SettingKey, unknown>>) {
  const db = adminClient();
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(patch)) {
    const { error, data } = await db
      .from('platform_settings')
      .update({ value: value as NonNullable<Json>, updated_at: now, updated_by: adminId })
      .eq('key', key)
      .select('key');
    if (error) throw fromPostgrest(error);
    if (!data?.length)
      throw new ApiError('VALIDATION_ERROR', [{ field: key, message: 'Không có tham số này' }]);
  }
  return getAdminSettings();
}
