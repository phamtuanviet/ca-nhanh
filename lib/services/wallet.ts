import 'server-only';
import { ApiError, type ApiUser, unwrap, unwrapMaybe } from '@/lib/api';
import type { Database } from '@/lib/database.types';
import { isDemoMode, platformBank } from '@/lib/env.server';
import { fromPostgrest } from '@/lib/errors';
import { adminClient } from '@/lib/supabase/admin';
import { vietQrImageUrl } from '@/lib/vietqr';
import { extractReference } from '@/lib/webhook';
import { getSettings } from './settings';

type PaymentOrder = Database['public']['Tables']['payment_orders']['Row'];
type TxnType = Database['public']['Enums']['txn_type'];

const TXN_COLUMNS =
  'id, type, balance_delta, held_delta, balance_after, held_after, ref_type, ref_id, note, created_at';

async function walletOf(userId: string) {
  const wallet = unwrapMaybe(
    await adminClient()
      .from('wallets')
      .select('id, type, balance, held_balance, updated_at')
      .eq('owner_id', userId)
      .maybeSingle(),
  );
  if (!wallet) throw new ApiError('NOT_FOUND');
  return wallet;
}

/** GET /wallet: số dư khả dụng, tạm giữ và 10 giao dịch gần nhất */
export async function getWallet(userId: string) {
  const wallet = await walletOf(userId);
  const transactions = unwrap(
    await adminClient()
      .from('wallet_transactions')
      .select(TXN_COLUMNS)
      .eq('wallet_id', wallet.id)
      .order('id', { ascending: false })
      .limit(10),
  );
  return {
    type: wallet.type,
    balance: wallet.balance,
    held_balance: wallet.held_balance,
    updated_at: wallet.updated_at,
    recent_transactions: transactions,
  };
}

export type WalletView = Awaited<ReturnType<typeof getWallet>>;

/** GET /wallet/transactions?type=hold,release */
export async function listTransactions(
  userId: string,
  options: { types?: TxnType[]; page: number; limit: number },
) {
  const wallet = await walletOf(userId);
  let query = adminClient()
    .from('wallet_transactions')
    .select(TXN_COLUMNS, { count: 'exact' })
    .eq('wallet_id', wallet.id)
    .order('id', { ascending: false })
    .range((options.page - 1) * options.limit, options.page * options.limit - 1);
  if (options.types?.length) query = query.in('type', options.types);
  const { data, count, error } = await query;
  if (error) throw fromPostgrest(error);
  return { items: data ?? [], total: count ?? 0 };
}

/** Lệnh thanh toán → JSON trả về (kèm ảnh VietQR cho lệnh nạp còn chờ) */
function presentOrder(order: PaymentOrder) {
  const bank = platformBank();
  const isTopup = order.kind === 'topup';
  return {
    id: order.id,
    kind: order.kind,
    amount: order.amount,
    status: order.status,
    reference_code: order.reference_code,
    expires_at: order.expires_at,
    completed_at: order.completed_at,
    created_at: order.created_at,
    transfer_note: order.reference_code,
    bank: isTopup ? bank : null,
    qr_image_url: isTopup ? vietQrImageUrl(bank, order.amount, order.reference_code) : null,
  };
}

export type PaymentOrderView = ReturnType<typeof presentOrder>;

/** POST /wallet/topups: bắt buộc Idempotency-Key; gửi lại cùng khóa nhận lại đúng lệnh cũ */
export async function createTopup(userId: string, amount: number, idempotencyKey: string) {
  const { data, error } = await adminClient().rpc('fn_create_topup', {
    p_actor: userId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    const apiError = fromPostgrest(error);
    if (apiError.code === 'AMOUNT_OUT_OF_RANGE') {
      const settings = await getSettings();
      throw new ApiError('AMOUNT_OUT_OF_RANGE', { min: settings.topup_min, max: 50_000_000 });
    }
    throw apiError;
  }
  return presentOrder(data);
}

/** Lệnh của chính người gọi (admin xem được mọi lệnh); không có quyền → 404 */
async function orderFor(user: Pick<ApiUser, 'id' | 'role'>, orderId: string) {
  const order = unwrapMaybe(
    await adminClient()
      .from('payment_orders')
      .select('*, wallet:wallets!inner(owner_id)')
      .eq('id', orderId)
      .maybeSingle(),
  );
  if (!order) throw new ApiError('PAYMENT_NOT_FOUND');
  const { wallet, ...rest } = order;
  if (user.role !== 'admin' && wallet.owner_id !== user.id) throw new ApiError('PAYMENT_NOT_FOUND');
  return rest as PaymentOrder;
}

export async function getPaymentOrder(user: Pick<ApiUser, 'id' | 'role'>, orderId: string) {
  return presentOrder(await orderFor(user, orderId));
}

/** POST /payment-orders/{id}/simulate-paid: chỉ ở chế độ demo, đi đúng đường của webhook thật */
export async function simulateTopupPaid(user: Pick<ApiUser, 'id' | 'role'>, orderId: string) {
  const settings = await getSettings();
  if (!isDemoMode() || !settings.demo_mode.enabled) throw new ApiError('DEMO_DISABLED');
  const order = await orderFor(user, orderId);
  if (order.kind !== 'topup') throw new ApiError('INVALID_STATE');
  const { data, error } = await adminClient().rpc('fn_confirm_topup', {
    p_reference_code: order.reference_code,
    p_amount: order.amount,
    p_provider: 'vietqr_sim',
    p_provider_txn_id: `SIM${Date.now()}`,
  });
  if (error) throw fromPostgrest(error);
  return presentOrder(data);
}

/** Webhook báo có (05 §6): credited | duplicate | unmatched */
export async function confirmTopupFromWebhook(payload: {
  provider: string;
  provider_txn_id?: string | null;
  amount: number;
  description?: string | null;
}): Promise<{
  received: true;
  status: 'credited' | 'duplicate' | 'unmatched';
  reference_code?: string;
}> {
  const reference = extractReference(payload.description);
  if (!reference) return { received: true, status: 'unmatched' };

  const existing = unwrapMaybe(
    await adminClient()
      .from('payment_orders')
      .select('status')
      .eq('reference_code', reference)
      .eq('kind', 'topup')
      .maybeSingle(),
  );
  if (!existing) {
    console.warn(`[webhook] không khớp mã tham chiếu ${reference}`);
    return { received: true, status: 'unmatched', reference_code: reference };
  }
  if (existing.status === 'succeeded') {
    return { received: true, status: 'duplicate', reference_code: reference };
  }

  const { error } = await adminClient().rpc('fn_confirm_topup', {
    p_reference_code: reference,
    p_amount: payload.amount,
    p_provider: payload.provider,
    p_provider_txn_id: payload.provider_txn_id ?? undefined,
  });
  if (error) throw fromPostgrest(error);
  return { received: true, status: 'credited', reference_code: reference };
}
