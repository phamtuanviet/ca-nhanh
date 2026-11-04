/**
 * Kiểm bất biến tiền (04 §6.3) trên CSDL đang chạy:
 *   I1  Σ(khả dụng + tạm giữ) mọi ví = Σ nạp thành công − Σ rút (đang xử lý + thành công) + Σ điều chỉnh
 *   I2  Tạm giữ của mỗi chủ quán = Σ shifts.hold_amount các ca của họ
 *   I3  Số dư mỗi ví = tổng các dòng sổ cái của ví đó (khả dụng và tạm giữ)
 *   I4  Ca chưa bắt đầu: hold_amount = headcount × (est_wage_per_seat + est_fee_per_seat)
 *   I5  Ca chưa bắt đầu: filled_count = số booking chưa hủy
 *
 *   npm run ledger:check          # đọc .env.local; SEED_ENV_FILE để trỏ sang dự án khác
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../lib/database.types';

config({ path: process.env.SEED_ENV_FILE ?? '.env.local', quiet: true });

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

/** Đọc toàn bộ bảng theo trang 1000 dòng (giới hạn mặc định của PostgREST) */
async function all<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function main() {
  const wallets = await all((a, b) =>
    db.from('wallets').select('id, owner_id, type, balance, held_balance').order('id').range(a, b),
  );
  const txns = await all((a, b) =>
    db
      .from('wallet_transactions')
      .select('wallet_id, type, balance_delta, held_delta')
      .order('id')
      .range(a, b),
  );
  const orders = await all((a, b) =>
    db.from('payment_orders').select('kind, status, amount').order('id').range(a, b),
  );
  const shops = await all((a, b) =>
    db.from('shops').select('id, owner_id').order('id').range(a, b),
  );
  const shifts = await all((a, b) =>
    db
      .from('shifts')
      .select(
        'id, shop_id, status, start_at, headcount, filled_count, hold_amount, est_wage_per_seat, est_fee_per_seat',
      )
      .order('id')
      .range(a, b),
  );
  const bookings = await all((a, b) =>
    db
      .from('bookings')
      .select('shift_id, status')
      .neq('status', 'cancelled')
      .order('id')
      .range(a, b),
  );

  const failures: string[] = [];

  // I1
  const totalMoney = wallets.reduce((n, w) => n + w.balance + w.held_balance, 0);
  const topups = orders
    .filter((o) => o.kind === 'topup' && o.status === 'succeeded')
    .reduce((n, o) => n + o.amount, 0);
  const withdrawals = orders
    .filter((o) => o.kind === 'withdrawal' && ['pending', 'succeeded'].includes(o.status))
    .reduce((n, o) => n + o.amount, 0);
  const adjustments = txns
    .filter((t) => t.type === 'adjustment')
    .reduce((n, t) => n + t.balance_delta + t.held_delta, 0);
  if (totalMoney !== topups - withdrawals + adjustments) {
    failures.push(
      `I1: tổng ví ${totalMoney} ≠ nạp ${topups} − rút ${withdrawals} + điều chỉnh ${adjustments}`,
    );
  }

  // I2
  const ownerOf = new Map(shops.map((s) => [s.id, s.owner_id]));
  const holdByOwner = new Map<string, number>();
  for (const s of shifts) {
    const owner = ownerOf.get(s.shop_id)!;
    holdByOwner.set(owner, (holdByOwner.get(owner) ?? 0) + s.hold_amount);
  }
  for (const w of wallets.filter((x) => x.type === 'shop')) {
    const expected = holdByOwner.get(w.owner_id!) ?? 0;
    if (w.held_balance !== expected)
      failures.push(`I2: ví quán ${w.id} tạm giữ ${w.held_balance} ≠ Σ hold ${expected}`);
  }

  // I3
  const sums = new Map<string, { balance: number; held: number }>();
  for (const t of txns) {
    const s = sums.get(t.wallet_id) ?? { balance: 0, held: 0 };
    s.balance += t.balance_delta;
    s.held += t.held_delta;
    sums.set(t.wallet_id, s);
  }
  for (const w of wallets) {
    const s = sums.get(w.id) ?? { balance: 0, held: 0 };
    if (w.balance !== s.balance || w.held_balance !== s.held) {
      failures.push(
        `I3: ví ${w.id} (${w.type}) ${w.balance}/${w.held_balance} ≠ sổ cái ${s.balance}/${s.held}`,
      );
    }
  }

  // I4, I5 cho ca chưa bắt đầu và còn mở
  const now = Date.now();
  const active = new Map<string, number>();
  for (const b of bookings) active.set(b.shift_id, (active.get(b.shift_id) ?? 0) + 1);
  for (const s of shifts.filter(
    (x) => ['open', 'full'].includes(x.status) && new Date(x.start_at).getTime() > now,
  )) {
    const expectedHold = s.headcount * (s.est_wage_per_seat + s.est_fee_per_seat);
    if (s.hold_amount !== expectedHold)
      failures.push(`I4: ca ${s.id} hold ${s.hold_amount} ≠ ${expectedHold}`);
    if (s.filled_count !== (active.get(s.id) ?? 0)) {
      failures.push(
        `I5: ca ${s.id} filled_count ${s.filled_count} ≠ ${active.get(s.id) ?? 0} booking`,
      );
    }
  }

  console.log(
    `Ví: ${wallets.length}, sổ cái: ${txns.length} dòng, lệnh thanh toán: ${orders.length}, ca: ${shifts.length}`,
  );
  console.log(`Tổng tiền trong hệ thống: ${totalMoney.toLocaleString('vi-VN')}đ`);
  if (failures.length) {
    console.log(`KHÔNG ĐẠT (${failures.length}):\n${failures.slice(0, 20).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(
      'ĐẠT: I1 bảo toàn tiền, I2 tạm giữ khớp ca, I3 số dư khớp sổ cái, I4–I5 ca chưa bắt đầu',
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
