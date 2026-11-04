import 'server-only';
import { ApiError, type ApiUser, unwrap, unwrapMaybe } from '@/lib/api';
import type { Database } from '@/lib/database.types';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import { getOwnedShop } from './shops';

type ListType = Database['public']['Enums']['worker_list_type'];

/**
 * Huy hiệu tự sinh từ lịch sử (CV tự động, PRF-05): mỗi vị trí ≥ 10 ca, đúng giờ ≥ 90% (từ 5 ca),
 * chưa vắng mặt (từ 5 ca), được nhiều quán đánh dấu người quen.
 */
function badgesOf(input: {
  byPosition: Map<string, number>;
  positionName: Map<string, string>;
  completed: number;
  late: number;
  noShow: number;
  favoritedBy: number;
}) {
  const badges: string[] = [];
  for (const [code, n] of [...input.byPosition].sort((a, b) => b[1] - a[1])) {
    if (n >= 10)
      badges.push(`${input.positionName.get(code) ?? code} ${Math.floor(n / 10) * 10}+ ca`);
  }
  if (input.completed >= 5 && input.late / input.completed <= 0.1) badges.push('Đúng giờ');
  if (input.completed >= 5 && input.noShow === 0) badges.push('Chưa vắng mặt lần nào');
  if (input.favoritedBy >= 2) badges.push(`${input.favoritedBy} quán muốn mời lại`);
  return badges;
}

/**
 * GET /workers/{id} (P3-07, US-24): hồ sơ năng lực. Chủ quán thấy SĐT nếu quán của họ có booking với
 * người này (BR-28) và đánh dấu người quen/chặn của từng quán mình; admin thấy thêm lịch sử điểm phạt.
 * Người làm xem được hồ sơ của chính mình.
 */
export async function getWorkerProfile(viewer: Pick<ApiUser, 'id' | 'role'>, workerId: string) {
  const isSelf = viewer.id === workerId;
  if (!isSelf && viewer.role !== 'shop_owner' && viewer.role !== 'admin')
    throw new ApiError('NOT_FOUND');
  const db = adminClient();
  const [profile, wp] = await Promise.all([
    db
      .from('profiles')
      .select('id, role, full_name, avatar_url, phone, status, created_at')
      .eq('id', workerId)
      .maybeSingle()
      .then(unwrapMaybe),
    db
      .from('worker_profiles')
      .select(
        'school, bio, skills, kyc_status, rating_avg, rating_count, completed_count, no_show_count, suspended_until',
      )
      .eq('user_id', workerId)
      .maybeSingle()
      .then(unwrapMaybe),
  ]);
  if (!profile || profile.role !== 'worker' || !wp) throw new ApiError('NOT_FOUND');

  const [positions, completed, reviews, favorites, viewerShops, points] = await Promise.all([
    db.from('positions').select('code, name').then(unwrap),
    db
      .from('bookings')
      .select('shop_id, is_late, shift:shifts(position_code)')
      .eq('worker_id', workerId)
      .eq('status', 'completed')
      .limit(1000)
      .then(unwrap),
    db
      .from('reviews')
      .select('stars, tags, comment, created_at, shop:shops(name)')
      .eq('worker_id', workerId)
      .eq('direction', 'shop_to_worker')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(unwrap),
    db
      .from('shop_worker_lists')
      .select('shop_id, list_type, note')
      .eq('worker_id', workerId)
      .then(unwrap),
    viewer.role === 'shop_owner'
      ? db.from('shops').select('id, name').eq('owner_id', viewer.id).then(unwrap)
      : Promise.resolve([] as { id: string; name: string }[]),
    db.rpc('penalty_points_of', { p_worker: workerId }).then(unwrapMaybe),
  ]);

  const positionName = new Map(positions.map((p) => [p.code, p.name]));
  const byPosition = new Map<string, number>();
  let late = 0;
  for (const b of completed) {
    const code = b.shift?.position_code;
    if (code) byPosition.set(code, (byPosition.get(code) ?? 0) + 1);
    if (b.is_late) late++;
  }
  const favoritedBy = favorites.filter((f) => f.list_type === 'favorite').length;

  // Quan hệ với các quán của người xem (chủ quán)
  const myShopIds = new Set(viewerShops.map((s) => s.id));
  const workedAtMine = completed.filter((b) => myShopIds.has(b.shop_id)).length;
  let hasBookingWithMe = workedAtMine > 0;
  if (!hasBookingWithMe && myShopIds.size > 0) {
    const { count } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', workerId)
      .in('shop_id', [...myShopIds]);
    hasBookingWithMe = (count ?? 0) > 0;
  }
  const lists = viewerShops.map((s) => {
    const mark = favorites.find((f) => f.shop_id === s.id);
    return {
      shop_id: s.id,
      shop_name: s.name,
      list_type: (mark?.list_type ?? null) as ListType | null,
      note: mark?.note ?? null,
    };
  });

  const result = {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    school: wp.school,
    bio: wp.bio,
    skills: (wp.skills ?? []).map((code) => ({ code, name: positionName.get(code) ?? code })),
    kyc_status: wp.kyc_status,
    rating_avg: Number(wp.rating_avg),
    rating_count: wp.rating_count,
    completed_count: wp.completed_count,
    no_show_count: wp.no_show_count,
    badges: badgesOf({
      byPosition,
      positionName,
      completed: completed.length,
      late,
      noShow: wp.no_show_count,
      favoritedBy,
    }),
    phone: isSelf || viewer.role === 'admin' || hasBookingWithMe ? profile.phone : null,
    completed_at_my_shops: workedAtMine,
    list_type: lists.find((l) => l.list_type)?.list_type ?? null,
    lists,
    recent_reviews: reviews.map((r) => ({
      stars: r.stars,
      tags: r.tags,
      comment: r.comment,
      created_at: r.created_at,
      shop_name: r.shop?.name ?? '',
    })),
    // Chỉ admin và chính người làm: điểm phạt, tạm khóa, lịch sử phạt
    standing: null as null | {
      status: string;
      penalty_points: number;
      suspended_until: string | null;
      history: {
        at: string;
        points: number;
        kind: 'no_show' | 'cancel';
        shift_title: string;
        shop_name: string;
      }[];
    },
  };

  if (viewer.role === 'admin' || isSelf) {
    const history = unwrap(
      await db
        .from('bookings')
        .select(
          'status, penalty_points, cancelled_at, shift:shifts(title, start_at), shop:shops(name)',
        )
        .eq('worker_id', workerId)
        .gt('penalty_points', 0)
        .order('created_at', { ascending: false })
        .limit(10),
    );
    result.standing = {
      status: profile.status,
      penalty_points: points ?? 0,
      suspended_until:
        wp.suspended_until && new Date(wp.suspended_until).getTime() > Date.now()
          ? wp.suspended_until
          : null,
      history: history.map((h) => ({
        at: h.cancelled_at ?? h.shift?.start_at ?? '',
        points: h.penalty_points,
        kind: h.status === 'no_show' ? ('no_show' as const) : ('cancel' as const),
        shift_title: h.shift?.title ?? '',
        shop_name: h.shop?.name ?? '',
      })),
    };
  }
  return result;
}

export type WorkerProfile = Awaited<ReturnType<typeof getWorkerProfile>>;

/**
 * GET /shops/{id}/workers (S6, SHP-05): người từng hoàn thành ca ở quán và người được đánh dấu.
 * `shopId` null = mọi quán của chủ quán.
 */
export async function listShopWorkers(
  ownerId: string,
  shopId: string | null,
  list: 'favorite' | 'blocked' | 'all',
) {
  const db = adminClient();
  const shops = shopId
    ? [await getOwnedShop(ownerId, shopId)].map((s) => ({ id: s.id, name: s.name }))
    : unwrap(await db.from('shops').select('id, name').eq('owner_id', ownerId));
  if (shops.length === 0) return [];
  const ids = shops.map((s) => s.id);
  const names = new Map(shops.map((s) => [s.id, s.name]));
  const [done, marks] = await Promise.all([
    db
      .from('bookings')
      .select('shop_id, worker_id, check_out_at, settled_at')
      .in('shop_id', ids)
      .eq('status', 'completed')
      .limit(5000)
      .then(unwrap),
    db
      .from('shop_worker_lists')
      .select('shop_id, worker_id, list_type, note, created_at')
      .in('shop_id', ids)
      .then(unwrap),
  ]);
  type Row = {
    shop_id: string;
    worker_id: string;
    completed_at_shop: number;
    last_worked_at: string | null;
    list_type: ListType | null;
    note: string | null;
  };
  const rows = new Map<string, Row>();
  const keyOf = (s: string, w: string) => `${s}:${w}`;
  for (const b of done) {
    const k = keyOf(b.shop_id, b.worker_id);
    const r = rows.get(k) ?? {
      shop_id: b.shop_id,
      worker_id: b.worker_id,
      completed_at_shop: 0,
      last_worked_at: null,
      list_type: null,
      note: null,
    };
    r.completed_at_shop++;
    const at = b.check_out_at ?? b.settled_at;
    if (at && (!r.last_worked_at || at > r.last_worked_at)) r.last_worked_at = at;
    rows.set(k, r);
  }
  for (const m of marks) {
    const k = keyOf(m.shop_id, m.worker_id);
    const r = rows.get(k) ?? {
      shop_id: m.shop_id,
      worker_id: m.worker_id,
      completed_at_shop: 0,
      last_worked_at: null,
      list_type: null,
      note: null,
    };
    r.list_type = m.list_type;
    r.note = m.note;
    rows.set(k, r);
  }
  const filtered = [...rows.values()].filter((r) =>
    list === 'all' ? r.list_type !== 'blocked' : r.list_type === list,
  );
  const workerIds = [...new Set(filtered.map((r) => r.worker_id))];
  if (workerIds.length === 0) return [];
  const [profiles, wps] = await Promise.all([
    db.from('profiles').select('id, full_name, avatar_url').in('id', workerIds).then(unwrap),
    db
      .from('worker_profiles')
      .select('user_id, rating_avg, rating_count, skills')
      .in('user_id', workerIds)
      .then(unwrap),
  ]);
  const p = new Map(profiles.map((x) => [x.id, x]));
  const w = new Map(wps.map((x) => [x.user_id, x]));
  return filtered
    .map((r) => ({
      ...r,
      shop_name: names.get(r.shop_id) ?? '',
      full_name: p.get(r.worker_id)?.full_name ?? '',
      avatar_url: p.get(r.worker_id)?.avatar_url ?? null,
      rating_avg: Number(w.get(r.worker_id)?.rating_avg ?? 0),
      rating_count: w.get(r.worker_id)?.rating_count ?? 0,
      skills: w.get(r.worker_id)?.skills ?? [],
    }))
    .sort(
      (a, b) =>
        Number(b.list_type === 'favorite') - Number(a.list_type === 'favorite') ||
        b.completed_at_shop - a.completed_at_shop ||
        a.full_name.localeCompare(b.full_name, 'vi'),
    );
}

export type ShopWorker = Awaited<ReturnType<typeof listShopWorkers>>[number];

/** PUT /shops/{id}/workers/{workerId}/list: đánh dấu người quen hoặc chặn */
export async function setWorkerList(
  ownerId: string,
  shopId: string,
  workerId: string,
  input: { list_type: ListType; note?: string },
) {
  await getOwnedShop(ownerId, shopId);
  const worker = unwrapMaybe(
    await adminClient().from('profiles').select('id, role').eq('id', workerId).maybeSingle(),
  );
  if (!worker || worker.role !== 'worker') throw new ApiError('NOT_FOUND');
  const { data, error } = await adminClient()
    .from('shop_worker_lists')
    .upsert(
      {
        shop_id: shopId,
        worker_id: workerId,
        list_type: input.list_type,
        note: input.note ?? null,
      },
      { onConflict: 'shop_id,worker_id' },
    )
    .select('shop_id, worker_id, list_type, note, created_at')
    .single();
  if (error) throw fromPostgrest(error);
  return data;
}

/** DELETE /shops/{id}/workers/{workerId}/list */
export async function removeWorkerList(ownerId: string, shopId: string, workerId: string) {
  await getOwnedShop(ownerId, shopId);
  const { error } = await adminClient()
    .from('shop_worker_lists')
    .delete()
    .eq('shop_id', shopId)
    .eq('worker_id', workerId);
  if (error) throw fromPostgrest(error);
}
