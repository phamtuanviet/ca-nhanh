'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Building2, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { LivePulse } from '@/components/cn/live-pulse';
import { WalletOdometer } from '@/components/cn/wallet-odometer';
import { PageHeader } from '@/components/layout/page';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BANKS, bankByBin } from '@/lib/banks';
import { asciiUpper, fmtDateTime, vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import { TXN_LABEL } from '@/lib/labels';
import { useRealtime } from '@/lib/realtime/use-realtime';
import type { PaymentOrderView, WalletView } from '@/lib/services/wallet';

type Bank = { bin: string; account_no_masked: string | null; account_name: string | null } | null;

export function WorkerWallet({
  userId,
  initial,
  bank,
  fullName,
  withdrawMin,
}: {
  userId: string;
  initial: WalletView;
  bank: Bank;
  fullName: string;
  withdrawMin: number;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [dialog, setDialog] = useState<'bank' | 'withdraw' | null>(null);
  const [session, setSession] = useState(0);
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api<WalletView>('/wallet'),
    initialData: initial,
  });

  // Quán duyệt giờ công → tiền vào ví: số lăn, "+tiền", pháo giấy (lần đầu)
  const status = useRealtime({
    channel: `wallet:${userId}`,
    table: 'wallets',
    event: 'UPDATE',
    filter: `owner_id=eq.${userId}`,
    onChange: () => void queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  });

  function openWithdraw() {
    setSession((n) => n + 1);
    // Gherkin 6.8: chưa có tài khoản ngân hàng thì mở form thêm tài khoản
    setDialog(bank ? 'withdraw' : 'bank');
  }

  const bankInfo = bank ? bankByBin(bank.bin) : undefined;

  return (
    <>
      <PageHeader title="Ví" description="Tiền công vào ví ngay khi quán duyệt giờ công" />
      <section className="cn-wallet">
        <span className="text-sm font-semibold text-text-muted">Số dư khả dụng</span>
        <WalletOdometer balance={wallet.balance} />
        <LivePulse status={status} label="Cập nhật trực tiếp" />
        <Button
          size="lg"
          onClick={openWithdraw}
          disabled={bank !== null && wallet.balance < withdrawMin}
        >
          Rút về ngân hàng
        </Button>
        {bank !== null && wallet.balance < withdrawMin ? (
          <p className="text-xs text-text-muted">Rút tối thiểu {vnd(withdrawMin)}.</p>
        ) : null}
      </section>

      <section className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
        <span className="flex min-w-0 items-center gap-3">
          <Building2 className="size-5 shrink-0 text-primary" aria-hidden />
          {bank ? (
            <span className="grid min-w-0 text-sm">
              <span className="font-semibold">
                {bankInfo?.shortName ?? bank.bin} {bank.account_no_masked}
              </span>
              <span className="truncate text-text-muted">{bank.account_name}</span>
            </span>
          ) : (
            <span className="text-sm text-text-muted">Chưa có tài khoản nhận tiền</span>
          )}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSession((n) => n + 1);
            setDialog('bank');
          }}
        >
          {bank ? 'Đổi' : 'Thêm tài khoản'}
        </Button>
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-semibold">Giao dịch gần đây</h2>
        {wallet.recent_transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            Chưa có giao dịch nào. Làm ca đầu tiên để nhận tiền công.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {wallet.recent_transactions.map((t) => {
              const incoming = t.balance_delta > 0;
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                      incoming ? 'bg-money-soft text-money' : 'bg-surface-sunken text-text-muted'
                    }`}
                  >
                    {incoming ? (
                      <ArrowDownLeft className="size-4" aria-hidden />
                    ) : (
                      <ArrowUpRight className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-sm font-medium">
                      {t.note ?? TXN_LABEL[t.type] ?? t.type}
                    </span>
                    <span className="text-xs text-text-muted">
                      {TXN_LABEL[t.type] ?? t.type} · {fmtDateTime(t.created_at)}
                    </span>
                  </span>
                  <span className={`cn-num text-lg ${incoming ? 'text-money' : 'text-text'}`}>
                    {incoming ? '+' : ''}
                    {vnd(t.balance_delta)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BankDialog
        key={`bank-${session}`}
        open={dialog === 'bank'}
        fullName={fullName}
        firstTime={!bank}
        onOpenChange={(open) => setDialog(open ? 'bank' : null)}
        onSaved={() => {
          router.refresh();
          setDialog(bank ? null : 'withdraw');
        }}
      />
      <WithdrawDialog
        key={`withdraw-${session}`}
        open={dialog === 'withdraw'}
        balance={wallet.balance}
        min={withdrawMin}
        onOpenChange={(open) => setDialog(open ? 'withdraw' : null)}
        onDone={() => void queryClient.invalidateQueries({ queryKey: ['wallet'] })}
      />
    </>
  );
}

/** Thêm hoặc đổi tài khoản ngân hàng nhận tiền (US-06) */
function BankDialog({
  open,
  fullName,
  firstTime,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  fullName: string;
  firstTime: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [bin, setBin] = useState('970436');
  const [name, setName] = useState(asciiUpper(fullName));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accountNo = String(new FormData(event.currentTarget).get('account_no') ?? '').replace(
      /\s/g,
      '',
    );
    setSaving(true);
    setError(null);
    try {
      await api('/me/worker-profile', {
        method: 'PATCH',
        body: { bank: { bin, account_no: accountNo, account_name: name } },
      });
      toast.success('Đã lưu tài khoản ngân hàng');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không lưu được, thử lại sau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tài khoản nhận tiền</DialogTitle>
          <DialogDescription>
            {firstTime
              ? 'Thêm tài khoản ngân hàng để rút tiền về trong ngày.'
              : 'Tiền rút sẽ chuyển vào tài khoản này.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label>Ngân hàng</Label>
            <Select value={bin} onValueChange={setBin}>
              <SelectTrigger className="h-11 w-full" aria-label="Ngân hàng">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {BANKS.map((b) => (
                  <SelectItem key={b.bin} value={b.bin}>
                    {b.shortName} · {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account_no">Số tài khoản</Label>
            <Input
              id="account_no"
              name="account_no"
              inputMode="numeric"
              autoComplete="off"
              required
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account_name">Tên chủ tài khoản</Label>
            <Input
              id="account_name"
              value={name}
              onChange={(e) => setName(asciiUpper(e.target.value))}
              required
              className="h-11 uppercase"
            />
            <p className="text-xs text-text-muted">Viết hoa không dấu, giống trên thẻ ngân hàng.</p>
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu tài khoản'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Rút tiền: "Đang xử lý" khoảng 2 giây rồi "Thành công" kèm biên nhận (Gherkin 6.8) */
function WithdrawDialog({
  open,
  balance,
  min,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  balance: number;
  min: number;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(balance);
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form');
  const [receipt, setReceipt] = useState<PaymentOrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Một khóa cho mỗi lần mở hộp thoại: bấm hai lần vẫn chỉ ra một lệnh rút
  const key = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (amount < min || amount > balance) {
      setError(`Số tiền rút từ ${vnd(min)} đến ${vnd(balance)}`);
      return;
    }
    key.current ??= crypto.randomUUID();
    setError(null);
    setStep('processing');
    try {
      const [order] = await Promise.all([
        api<PaymentOrderView>('/wallet/withdrawals', {
          body: { amount },
          headers: { 'Idempotency-Key': key.current },
        }),
        new Promise((r) => setTimeout(r, 1800)),
      ]);
      setReceipt(order);
      setStep('done');
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không rút được, thử lại sau');
      setStep('form');
    }
  }

  const bank = receipt?.bank_snapshot;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rút về ngân hàng</DialogTitle>
          <DialogDescription>Ca Nhanh chuyển khoản ngay trong ngày, miễn phí.</DialogDescription>
        </DialogHeader>
        {step === 'form' ? (
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="withdraw-amount">Số tiền (đ)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                inputMode="numeric"
                min={min}
                max={balance}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-11"
              />
              <button
                type="button"
                className="w-fit text-xs font-medium text-primary hover:underline"
                onClick={() => setAmount(balance)}
              >
                Rút hết {vnd(balance)}
              </button>
            </div>
            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg">
              Rút {vnd(amount)}
            </Button>
          </form>
        ) : step === 'processing' ? (
          <div className="grid justify-items-center gap-3 py-8 text-center" role="status">
            <LoaderCircle className="size-12 animate-spin text-primary" aria-hidden />
            <p className="font-semibold">Đang xử lý</p>
            <p className="text-sm text-text-muted">Đang chuyển {vnd(amount)} về ngân hàng…</p>
          </div>
        ) : (
          <div className="grid gap-4" role="status">
            <div className="grid justify-items-center gap-2 text-center">
              <CheckCircle2 className="size-12 text-money" aria-hidden />
              <p className="text-lg font-bold">Thành công</p>
              <p className="cn-num text-4xl text-money">{vnd(receipt?.amount ?? amount)}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[var(--radius-control)] bg-surface-sunken p-4 text-sm">
              <dt className="text-text-muted">Mã giao dịch</dt>
              <dd className="text-right font-semibold" data-testid="withdraw-reference">
                {receipt?.reference_code}
              </dd>
              {bank ? (
                <>
                  <dt className="text-text-muted">Đến</dt>
                  <dd className="text-right">
                    {bankByBin(bank.bank_bin)?.shortName ?? bank.bank_bin} ••••{' '}
                    {bank.account_no.slice(-4)}
                  </dd>
                  <dt className="text-text-muted">Chủ tài khoản</dt>
                  <dd className="text-right">{bank.account_name}</dd>
                </>
              ) : null}
              <dt className="text-text-muted">Thời gian</dt>
              <dd className="text-right">
                {receipt?.completed_at ? fmtDateTime(receipt.completed_at) : '—'}
              </dd>
            </dl>
            <Button onClick={() => onOpenChange(false)}>Xong</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
