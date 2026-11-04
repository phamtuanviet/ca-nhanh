'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { LivePulse } from '@/components/cn/live-pulse';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { TransactionHistory } from '@/components/wallet/transaction-history';
import { vnd } from '@/lib/format';
import { api } from '@/lib/http';
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

      <div className="mt-6">
        <TransactionHistory variant="shop" />
      </div>

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
