import { Heart, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FilterLinks, withQuery } from '@/components/admin/filter-links';
import { EmptyState } from '@/components/cn/empty-state';
import { PageHeader } from '@/components/layout/page';
import { WorkerListActions } from '@/components/shop/worker-list-actions';
import { requireRole } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { listMyShops } from '@/lib/services/shops';
import { listShopWorkers } from '@/lib/services/workers';

export const metadata: Metadata = { title: 'Người làm' };

const LISTS = ['all', 'favorite', 'blocked'] as const;

/** S6: người từng làm, người quen, đã chặn (P3-07, US-17, SHP-05) */
export default async function ShopWorkersPage({ searchParams }: PageProps<'/shop/workers'>) {
  const user = await requireRole('shop_owner');
  const raw = (await searchParams).list;
  const list = LISTS.find((l) => l === raw) ?? 'all';
  const [shops, items] = await Promise.all([
    listMyShops(user.id),
    listShopWorkers(user.id, null, list),
  ]);
  const multi = shops.length > 1;

  return (
    <>
      <PageHeader
        title="Người làm"
        description="Người quen được ưu tiên nhận ca mới, được báo khi có chỗ trống và mời được trực tiếp."
      />
      <div className="mb-4">
        <FilterLinks
          label="Danh sách"
          current={list}
          options={[
            { value: 'all', label: 'Đã từng làm' },
            { value: 'favorite', label: 'Người quen' },
            { value: 'blocked', label: 'Đã chặn' },
          ]}
          href={(v) => withQuery('/shop/workers', { list: v === 'all' ? undefined : v })}
        />
      </div>
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="empty-bookings"
            title={
              list === 'blocked'
                ? 'Chưa chặn ai'
                : list === 'favorite'
                  ? 'Chưa có người quen'
                  : 'Chưa có ai làm ở quán'
            }
            text="Sau mỗi ca, đánh giá với thẻ “Muốn mời lại” để thêm người làm vào danh sách người quen."
          />
        </div>
      ) : (
        <ul
          className="divide-y divide-border rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
          data-testid="shop-workers"
        >
          {items.map((w) => (
            <li
              key={`${w.shop_id}:${w.worker_id}`}
              className="flex flex-wrap items-center gap-3 p-4"
            >
              {w.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
                <img src={w.avatar_url} alt="" className="size-10 rounded-full bg-lam-100" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-lam-100 font-bold text-on-primary-soft">
                  {w.full_name.at(0)}
                </span>
              )}
              <span className="grid min-w-48 flex-1 gap-0.5">
                <Link
                  href={`/shop/workers/${w.worker_id}`}
                  className="inline-flex items-center gap-1.5 font-medium hover:underline"
                >
                  {w.full_name}
                  {w.list_type === 'favorite' ? (
                    <Heart className="size-3.5 fill-current text-danger" aria-label="Người quen" />
                  ) : null}
                </Link>
                <span className="inline-flex flex-wrap items-center gap-x-1 text-xs text-text-muted">
                  {w.rating_count > 0 ? (
                    <>
                      <Star className="size-3 fill-current text-spark" aria-hidden />
                      {w.rating_avg.toFixed(1)} ·
                    </>
                  ) : null}
                  {w.completed_at_shop} ca ở quán
                  {w.last_worked_at ? ` · gần nhất ${fmtDate(w.last_worked_at)}` : ''}
                  {multi ? ` · ${w.shop_name}` : ''}
                </span>
                {w.note ? <span className="text-xs text-text-muted">Ghi chú: {w.note}</span> : null}
              </span>
              <WorkerListActions
                shopId={w.shop_id}
                shopName={multi ? w.shop_name : undefined}
                workerId={w.worker_id}
                name={w.full_name}
                listType={w.list_type}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
