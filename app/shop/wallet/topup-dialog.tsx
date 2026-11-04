'use client';

import { CheckCircle2, Copy } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Countdown } from '@/components/cn/countdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import { useRealtime } from '@/lib/realtime/use-realtime';
import type { PaymentOrderView } from '@/lib/services/wallet';

const PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000];

/** Hộp thoại nạp ví VietQR (US-09, Gherkin 02 §6.1) */
export function TopupDialog({
  open,
  onOpenChange,
  demo,
  topupMin,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demo: boolean;
  topupMin: number;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState(2_000_000);
  const [order, setOrder] = useState<PaymentOrderView | null>(null);
  const [pending, setPending] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mỗi lần mở hộp thoại là một phiên mới (ShopWallet đổi `key`) với một khóa riêng:
  // bấm "Tạo mã nạp" hai lần vẫn chỉ ra một lệnh (05 §2.3)
  const idempotencyKey = useRef<string | null>(null);

  function markPaid(paidOrder: PaymentOrderView) {
    if (paid) return;
    setPaid(true);
    onPaid();
    toast.success(`Nạp tiền thành công +${vnd(paidOrder.amount)}`);
    setTimeout(() => onOpenChange(false), 1600);
  }

  // Ngân hàng báo có (webhook hoặc giả lập) → lệnh chuyển sang succeeded qua Realtime
  useRealtime({
    channel: `payment-order:${order?.id ?? 'none'}`,
    table: 'payment_orders',
    event: 'UPDATE',
    filter: order ? `id=eq.${order.id}` : undefined,
    enabled: Boolean(order) && !paid,
    onChange: (payload) => {
      const row = payload.new as { status?: string };
      if (row.status === 'succeeded' && order) markPaid({ ...order, status: 'succeeded' });
    },
  });

  async function create() {
    if (amount < topupMin || amount > 50_000_000) {
      setError(`Số tiền nạp từ ${vnd(topupMin)} đến ${vnd(50_000_000)}`);
      return;
    }
    setPending(true);
    setError(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const created = await api<PaymentOrderView>('/wallet/topups', {
        body: { amount },
        headers: { 'Idempotency-Key': idempotencyKey.current },
      });
      setOrder(created);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không tạo được mã nạp');
    } finally {
      setPending(false);
    }
  }

  async function simulate() {
    if (!order) return;
    setSimulating(true);
    try {
      const result = await api<PaymentOrderView>(`/payment-orders/${order.id}/simulate-paid`, {
        method: 'POST',
      });
      if (result.status === 'succeeded') markPaid(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Giả lập thất bại');
    } finally {
      setSimulating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nạp ví bằng VietQR</DialogTitle>
          <DialogDescription>
            Quét mã bằng ứng dụng ngân hàng. Giữ nguyên nội dung chuyển khoản để tiền tự vào ví.
          </DialogDescription>
        </DialogHeader>

        {paid ? (
          <div className="grid justify-items-center gap-2 py-8 text-center" role="status">
            <CheckCircle2 className="size-14 text-money" aria-hidden />
            <p className="cn-num text-4xl text-money">+{vnd(order?.amount ?? amount)}</p>
            <p className="text-sm text-text-muted">Đã vào ví quán</p>
          </div>
        ) : !order ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={amount === p}
                  onClick={() => setAmount(p)}
                  className="h-12 rounded-[var(--radius-control)] border border-border bg-surface font-semibold transition-colors aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-on-primary-soft"
                >
                  <span className="cn-num text-lg">{vnd(p)}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topup-amount">Số tiền khác (đ)</Label>
              <Input
                id="topup-amount"
                type="number"
                inputMode="numeric"
                min={topupMin}
                max={50_000_000}
                step={10_000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-11"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
            <Button size="lg" onClick={create} disabled={pending}>
              {pending ? 'Đang tạo mã…' : 'Tạo mã nạp'}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {order.qr_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh QR do img.vietqr.io sinh theo lệnh
              <img
                src={order.qr_image_url}
                alt={`Mã VietQR chuyển ${vnd(order.amount)}, nội dung ${order.transfer_note}`}
                className="mx-auto aspect-square w-full max-w-64 rounded-[var(--radius-control)] border border-border bg-white object-contain"
              />
            ) : null}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-text-muted">Số tiền</dt>
              <dd className="cn-num text-right text-xl">{vnd(order.amount)}</dd>
              <dt className="text-text-muted">Nội dung</dt>
              <dd className="flex items-center justify-end gap-2">
                <code className="text-base font-bold" data-testid="topup-reference">
                  {order.transfer_note}
                </code>
                <button
                  type="button"
                  aria-label="Sao chép nội dung"
                  className="rounded p-1 text-text-muted hover:bg-surface-sunken hover:text-text"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(order.transfer_note)
                      .then(() => toast('Đã sao chép nội dung'));
                  }}
                >
                  <Copy className="size-4" aria-hidden />
                </button>
              </dd>
              {order.bank ? (
                <>
                  <dt className="text-text-muted">Tài khoản</dt>
                  <dd className="text-right">
                    {order.bank.account_no} · {order.bank.account_name}
                  </dd>
                </>
              ) : null}
            </dl>
            {order.expires_at ? (
              <div className="flex justify-center">
                <Countdown
                  target={order.expires_at}
                  label="Mã hết hạn sau"
                  doneLabel="Mã đã hết hạn"
                  soonMinutes={3}
                />
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
            {demo ? (
              <Button variant="spark" size="lg" onClick={simulate} disabled={simulating}>
                {simulating ? 'Đang xác nhận…' : 'Giả lập đã chuyển khoản'}
              </Button>
            ) : (
              <p className="text-center text-sm text-text-muted">Đang chờ ngân hàng báo có…</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
