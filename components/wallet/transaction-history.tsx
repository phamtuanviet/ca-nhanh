'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Lock, LockOpen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fmtDay, fmtTime, vnd } from '@/lib/format';
import { apiList } from '@/lib/http';
import { TXN_LABEL } from '@/lib/labels';

export type Txn = {
  id: number;
  type: string;
  balance_delta: number;
  held_delta: number;
  balance_after: number;
  held_after: number;
  note: string | null;
  created_at: string;
};

type Filter = { key: string; label: string; types: string | null };

const SHOP_FILTERS: Filter[] = [
  { key: 'all', label: 'Tất cả', types: null },
  { key: 'money', label: 'Nạp, rút', types: 'topup,withdrawal,withdrawal_reversal,adjustment' },
  { key: 'hold', label: 'Tạm giữ, hoàn', types: 'hold,release' },
  { key: 'pay', label: 'Trả công, phí', types: 'shift_payment,platform_fee,boost_fee' },
  { key: 'comp', label: 'Bồi thường', types: 'compensation' },
];

const WORKER_FILTERS: Filter[] = [
  { key: 'all', label: 'Tất cả', types: null },
  { key: 'earning', label: 'Tiền công', types: 'earning,compensation' },
  { key: 'money', label: 'Rút tiền', types: 'withdrawal,withdrawal_reversal' },
];

const PAGE = 20;

/** Lịch sử sổ cái của ví (P3-02, US-10): lọc theo loại, nhóm theo ngày, tải thêm từng trang */
export function TransactionHistory({ variant }: { variant: 'shop' | 'worker' }) {
  const filters = variant === 'shop' ? SHOP_FILTERS : WORKER_FILTERS;
  const [filter, setFilter] = useState(filters[0]);
  const query = useInfiniteQuery({
    // Cùng tiền tố ['wallet']: số dư đổi (realtime) thì lịch sử cũng tải lại
    queryKey: ['wallet', 'transactions', filter.key],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const q = new URLSearchParams({ page: String(pageParam), limit: String(PAGE) });
      if (filter.types) q.set('type', filter.types);
      return apiList<Txn>(`/wallet/transactions?${q}`, signal);
    },
    getNextPageParam: (last) =>
      last.meta.page * last.meta.limit < last.meta.total ? last.meta.page + 1 : undefined,
  });
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  // Nhóm theo ngày (giờ Việt Nam), giữ thứ tự mới nhất trước
  const groups: { day: string; rows: Txn[] }[] = [];
  for (const t of items) {
    const day = fmtDay(t.created_at);
    const last = groups.at(-1);
    if (last?.day === day) last.rows.push(t);
    else groups.push({ day, rows: [t] });
  }

  return (
    <section
      className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
      aria-labelledby="txn-title"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="txn-title" className="font-semibold">
          Lịch sử giao dịch
        </h2>
        {query.isSuccess ? (
          <span className="text-xs text-text-muted">{total} giao dịch</span>
        ) : null}
      </div>
      <div
        className="mb-3 flex gap-1.5 overflow-x-auto pb-1"
        role="group"
        aria-label="Lọc giao dịch"
      >
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter.key === f.key}
            onClick={() => setFilter(f)}
            className="h-8 shrink-0 rounded-full border border-border px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-sunken aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-on-primary-soft"
          >
            {f.label}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="grid gap-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="cn-skel h-12 rounded-[var(--radius-control)]" />
          ))}
        </div>
      ) : query.isError ? (
        <p role="alert" className="py-6 text-center text-sm text-danger">
          Không tải được lịch sử giao dịch.
        </p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          {variant === 'shop'
            ? 'Chưa có giao dịch nào. Nạp tiền để đăng ca đầu tiên.'
            : 'Chưa có giao dịch nào. Làm ca đầu tiên để nhận tiền công.'}
        </p>
      ) : (
        <div className="grid gap-4" data-testid="txn-history">
          {groups.map((g) => (
            <div key={g.day}>
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                {g.day}
              </h3>
              <ul className="divide-y divide-border">
                {g.rows.map((t) => (
                  <TxnRow key={t.id} t={t} showHeld={variant === 'shop'} />
                ))}
              </ul>
            </div>
          ))}
          {query.hasNextPage ? (
            <Button
              variant="outline"
              onClick={() => void query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function TxnRow({ t, showHeld }: { t: Txn; showHeld: boolean }) {
  const incoming = t.balance_delta > 0;
  const onlyHeld = t.balance_delta === 0 && t.held_delta !== 0;
  const Icon = onlyHeld
    ? t.held_delta > 0
      ? Lock
      : LockOpen
    : t.type === 'hold'
      ? Lock
      : t.type === 'release'
        ? LockOpen
        : incoming
          ? ArrowDownLeft
          : ArrowUpRight;
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          incoming ? 'bg-money-soft text-money' : 'bg-surface-sunken text-text-muted'
        }`}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-medium">
          {t.note ?? TXN_LABEL[t.type] ?? t.type}
        </span>
        <span className="text-xs text-text-muted">
          {TXN_LABEL[t.type] ?? t.type} · {fmtTime(t.created_at)}
          {showHeld && t.held_delta !== 0
            ? ` · tạm giữ ${sign(t.held_delta)}${vnd(Math.abs(t.held_delta))}`
            : ''}
        </span>
      </span>
      <span className="grid justify-items-end">
        {t.balance_delta !== 0 ? (
          <span className={`cn-num text-lg ${incoming ? 'text-money' : 'text-text'}`}>
            {sign(t.balance_delta)}
            {vnd(Math.abs(t.balance_delta))}
          </span>
        ) : (
          <span className="cn-num text-lg text-text-muted">
            {sign(t.held_delta)}
            {vnd(Math.abs(t.held_delta))}
          </span>
        )}
        <span className="text-[11px] text-text-muted">Còn {vnd(t.balance_after)}</span>
      </span>
    </li>
  );
}
