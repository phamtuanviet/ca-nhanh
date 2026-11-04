'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { LivePulse } from '@/components/cn/live-pulse';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { fmtDateTime, vnd } from '@/lib/format';
import { api } from '@/lib/http';
import { TXN_LABEL } from '@/lib/labels';
import { useRealtime } from '@/lib/realtime/use-realtime';
import type { WalletView } from '@/lib/services/wallet';
import { TopupDialog } from './topup-dialog';

export function ShopWallet({
  userId,
  initial,
  demo,
  topupMin,
}: {
  userId: string;
  initial: WalletView;
  demo: boolean;
  topupMin: number;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api<WalletView>('/wallet'),
    initialData: initial,
  });

  // Số dư đổi (nạp tiền, tạm giữ khi đăng ca, hoàn tiền) → cập nhật ngay, không cần tải lại trang
  const status = useRealtime({
    channel: `wallet:${userId}`,
    table: 'wallets',
    event: 'UPDATE',
    filter: `owner_id=eq.${userId}`,
    onChange: () => void queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  });

  return (
    <>
      <PageHeader
        title="Ví quán"
        description="Tiền công của mỗi ca được tạm giữ từ đây khi đăng ca"
        actions={
          <Button
            onClick={() => {
              setSession((n) => n + 1);
              setOpen(true);
            }}
          >
            <Plus aria-hidden /> Nạp tiền
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="cn-wallet">
          <span className="text-sm font-semibold text-text-muted">Số dư khả dụng</span>
          <strong className="cn-num text-5xl text-text" data-testid="wallet-balance">
            {vnd(wallet.balance)}
          </strong>
          <LivePulse status={status} label="Cập nhật trực tiếp" />
        </section>
        <section className="cn-wallet">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted">
            <Lock className="size-4" aria-hidden /> Đang tạm giữ cho ca
          </span>
          <strong className="cn-num text-5xl text-text" data-testid="wallet-held">
            {vnd(wallet.held_balance)}
          </strong>
          <span className="text-sm text-text-muted">
            Trả cho người làm khi duyệt giờ công, phần dư hoàn lại
          </span>
        </section>
      </div>

      <section className="mt-6 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-semibold">Giao dịch gần đây</h2>
        {wallet.recent_transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            Chưa có giao dịch nào. Nạp tiền để đăng ca đầu tiên.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {wallet.recent_transactions.map((t) => {
              const delta = t.balance_delta !== 0 ? t.balance_delta : -t.held_delta;
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
                    {delta > 0 ? '+' : ''}
                    {vnd(delta)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <TopupDialog
        key={session}
        open={open}
        onOpenChange={setOpen}
        demo={demo}
        topupMin={topupMin}
        onPaid={() => void queryClient.invalidateQueries({ queryKey: ['wallet'] })}
      />
    </>
  );
}
