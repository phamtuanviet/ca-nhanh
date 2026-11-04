/**
 * Kiểm thử tranh chỗ (07 P1-18): N người làm khác nhau cùng bấm "Nhận ca" vào một ca còn 1 chỗ.
 * Kỳ vọng: đúng 1 × 201, còn lại 409 SHIFT_FULL (fn_book_shift khóa dòng ca, chỉ một người thắng).
 *
 *   npm run race                      # 20 yêu cầu vào server http://localhost:3000
 *   RACE_N=30 API_URL=https://… npm run race
 *
 * Cần: server đang chạy, dữ liệu seed (npm run seed), .env.local (hoặc SEED_ENV_FILE).
 * Script tự hủy ca sau khi chạy để hoàn tiền tạm giữ.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../lib/database.types';
import { DEMO_ACCOUNTS } from '../lib/demo';

config({ path: process.env.SEED_ENV_FILE ?? '.env.local', quiet: true });

const API = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const N = Number(process.env.RACE_N ?? 20);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const password = process.env.DEMO_PASSWORD!;
if (!url || !publishable || !secret || !password) {
  console.error('Thiếu biến môi trường Supabase hoặc DEMO_PASSWORD (xem .env.example).');
  process.exit(1);
}

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function token(email: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishable, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string; error_description?: string };
  if (!body.access_token)
    throw new Error(`Không đăng nhập được ${email}: ${body.error_description ?? res.status}`);
  return body.access_token;
}

async function main() {
  // Chủ quán demo và quán đầu tiên của chị
  const { data: users, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const byEmail = new Map(users.users.map((u) => [u.email ?? '', u.id]));
  const ownerId = byEmail.get(DEMO_ACCOUNTS.owner.email);
  if (!ownerId) throw new Error('Chưa có dữ liệu demo, chạy `npm run seed` trước.');
  const { data: shop } = await db
    .from('shops')
    .select('id, name')
    .eq('owner_id', ownerId)
    .order('created_at')
    .limit(1)
    .single();
  if (!shop) throw new Error('Chủ quán demo chưa có quán.');

  // N người làm đã xác minh, không bị tạm khóa
  const { data: workers } = await db
    .from('profiles')
    .select('id, full_name, worker_profiles!inner(kyc_status, suspended_until)')
    .eq('role', 'worker')
    .eq('status', 'active')
    .eq('worker_profiles.kyc_status', 'verified')
    .limit(200);
  const emails = (workers ?? [])
    .filter((w) => {
      const wp = w.worker_profiles as unknown as { suspended_until: string | null };
      return !wp.suspended_until || new Date(wp.suspended_until) < new Date();
    })
    .map((w) => users.users.find((u) => u.id === w.id)?.email)
    .filter((e): e is string => Boolean(e?.endsWith('@demo.vn')))
    .slice(0, N);
  if (emails.length < N)
    throw new Error(`Chỉ có ${emails.length} người làm đủ điều kiện, cần ${N}.`);

  // Ca 1 chỗ ở một khung giờ ngẫu nhiên 20–28 ngày tới để không trùng giờ với ca khác
  const start = new Date(Date.now() + (20 + Math.random() * 8) * 86_400_000);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 3 * 3_600_000);
  const { data: shift, error: publishError } = await db.rpc('fn_publish_shift', {
    p_actor: ownerId,
    p_shop_id: shop.id,
    p_position_code: 'server',
    p_title: 'Kiểm thử tranh chỗ',
    p_start_at: start.toISOString(),
    p_end_at: end.toISOString(),
    p_hourly_rate: 30000,
    p_headcount: 1,
  });
  if (publishError) throw new Error(`Không đăng được ca: ${publishError.message}`);

  try {
    const tokens = await Promise.all(emails.map(token));
    console.log(
      `Ca ${shift.id} tại ${shop.name}, 1 chỗ. Bắn ${N} yêu cầu nhận ca cùng lúc vào ${API}…`,
    );

    const t0 = performance.now();
    const results = await Promise.all(
      tokens.map(async (t, i) => {
        const res = await fetch(`${API}/api/v1/shifts/${shift.id}/bookings`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}` },
        });
        const body = (await res.json().catch(() => null)) as { error?: { code: string } } | null;
        return {
          email: emails[i],
          status: res.status,
          code: body?.error?.code ?? null,
          ms: performance.now() - t0,
        };
      }),
    );
    const elapsed = performance.now() - t0;

    const won = results.filter((r) => r.status === 201);
    const full = results.filter((r) => r.status === 409 && r.code === 'SHIFT_FULL');
    const other = results.filter((r) => !won.includes(r) && !full.includes(r));
    const { data: after } = await db
      .from('shifts')
      .select('status, filled_count')
      .eq('id', shift.id)
      .single();
    const { count: bookings } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('shift_id', shift.id)
      .neq('status', 'cancelled');

    console.log(`201 Created: ${won.length} (${won.map((r) => r.email).join(', ')})`);
    console.log(`409 SHIFT_FULL: ${full.length}`);
    if (other.length)
      console.log(`Khác: ${other.map((r) => `${r.email} ${r.status} ${r.code}`).join('; ')}`);
    console.log(
      `CSDL: ca ${after?.status}, filled_count ${after?.filled_count}, ${bookings} booking còn hiệu lực`,
    );
    console.log(`Tổng thời gian ${elapsed.toFixed(0)} ms`);

    const ok =
      won.length === 1 &&
      full.length === N - 1 &&
      after?.filled_count === 1 &&
      after?.status === 'full' &&
      bookings === 1;
    console.log(ok ? `ĐẠT: đúng 1 × 201 và ${N - 1} × 409 SHIFT_FULL` : 'KHÔNG ĐẠT');
    process.exitCode = ok ? 0 : 1;
  } finally {
    // Hủy ca (còn hơn 24 giờ nên không phát sinh bồi thường), hoàn tiền tạm giữ về ví quán
    const { error } = await db.rpc('fn_cancel_shift', {
      p_actor: ownerId,
      p_shift_id: shift.id,
      p_reason: 'Dọn dữ liệu sau kiểm thử tranh chỗ',
    });
    if (error) console.warn(`Không hủy được ca kiểm thử: ${error.message}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
