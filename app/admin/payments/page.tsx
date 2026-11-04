import { Check, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminAction } from '@/components/admin/admin-action';
import { FilterLinks, withQuery } from '@/components/admin/filter-links';
import { Badge, type BadgeTone } from '@/components/cn/badge';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { bankByBin } from '@/lib/banks';
import { fmtDateTime, vnd } from '@/lib/format';
import { listPaymentOrders } from '@/lib/services/admin';
import { paymentOrdersQuerySchema } from '@/lib/validators';

export const metadata: Metadata = { title: 'Thanh toán' };

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Đang xử lý', tone: 'warn' },
  succeeded: { label: 'Thành công', tone: 'deposit' },
  failed: { label: 'Thất bại', tone: 'danger' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
};
const LIMIT = 25;

/** Lệnh nạp và rút (P3-05, US-44): lọc theo loại, trạng thái; xác nhận lệnh rút đang chờ */
export default async function AdminPaymentsPage({ searchParams }: PageProps<'/admin/payments'>) {
  await requireRole('admin');
  const raw = await searchParams;
  const parsed = paymentOrdersQuerySchema.safeParse({ ...raw, limit: LIMIT });
  const f = parsed.success ? parsed.data : { page: 1, limit: LIMIT };
  const { items, total } = await listPaymentOrders(f);
  const kind = f.kind ?? 'all';
  const status = f.status ?? 'all';
  const base = { kind: f.kind, status: f.status };
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageHeader
        title="Thanh toán"
        description="Lệnh nạp VietQR và lệnh rút về ngân hàng. Chế độ demo tự hoàn tất lệnh rút."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <FilterLinks
          label="Loại lệnh"
          current={kind}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'topup', label: 'Nạp' },
            { value: 'withdrawal', label: 'Rút' },
          ]}
          href={(v) => withQuery('/admin/payments', { ...base, kind: v === 'all' ? undefined : v })}
        />
        <FilterLinks
          label="Trạng thái"
          current={status}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'pending', label: 'Đang xử lý' },
            { value: 'succeeded', label: 'Thành công' },
            { value: 'failed', label: 'Thất bại' },
            { value: 'expired', label: 'Hết hạn' },
          ]}
          href={(v) =>
            withQuery('/admin/payments', { ...base, status: v === 'all' ? undefined : v })
          }
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-8 text-center text-sm text-text-muted shadow-[var(--shadow-card)]">
          Không có lệnh nào khớp bộ lọc.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[760px] text-sm" data-testid="admin-payments">
            <thead className="border-b border-border text-xs text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Mã
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Chủ ví
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Loại
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Số tiền
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Trạng thái
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Thời gian
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((o) => {
                const st = STATUS[o.status] ?? STATUS.pending;
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs">{o.reference_code}</td>
                    <td className="px-4 py-3">
                      {o.owner?.full_name ?? '—'}
                      {o.bank ? (
                        <span className="block text-xs text-text-muted">
                          {bankByBin(o.bank.bank_bin)?.shortName ?? o.bank.bank_bin} ••••{' '}
                          {o.bank.account_no_last4}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{o.kind === 'topup' ? 'Nạp' : 'Rút'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{vnd(o.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {o.failure_reason ? (
                        <span className="block text-xs text-text-muted">{o.failure_reason}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {fmtDateTime(o.created_at)}
                      {o.completed_at ? (
                        <span className="block">xong {fmtDateTime(o.completed_at)}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {o.kind === 'withdrawal' && o.status === 'pending' ? (
                        <span className="flex justify-end gap-2">
                          <AdminAction
                            label="Thất bại"
                            variant="destructive"
                            icon={<X aria-hidden />}
                            path={`/admin/payment-orders/${o.id}/complete`}
                            body={{ success: false }}
                            success="Đã báo thất bại, tiền đã hoàn về ví"
                            confirm={{
                              title: 'Báo lệnh rút thất bại?',
                              text: `${vnd(o.amount)} sẽ hoàn về ví của ${o.owner?.full_name ?? 'người làm'}.`,
                              reason: 'Lý do',
                              action: 'Báo thất bại',
                              danger: true,
                            }}
                          />
                          <AdminAction
                            label="Đã chuyển"
                            variant="default"
                            icon={<Check aria-hidden />}
                            path={`/admin/payment-orders/${o.id}/complete`}
                            body={{ success: true }}
                            success="Đã xác nhận chuyển khoản"
                          />
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Trang" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Trang {f.page}/{pages} · {total} lệnh
          </span>
          <span className="flex gap-2">
            {f.page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={withQuery('/admin/payments', { ...base, page: String(f.page - 1) })}>
                  Trước
                </Link>
              </Button>
            ) : null}
            {f.page < pages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={withQuery('/admin/payments', { ...base, page: String(f.page + 1) })}>
                  Sau
                </Link>
              </Button>
            ) : null}
          </span>
        </nav>
      ) : null}
    </>
  );
}
