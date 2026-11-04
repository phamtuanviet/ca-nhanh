import { Check, MapPin, Star, X } from 'lucide-react';
import type { Metadata } from 'next';
import { AdminAction } from '@/components/admin/admin-action';
import { FilterLinks, withQuery } from '@/components/admin/filter-links';
import { Badge, type BadgeTone } from '@/components/cn/badge';
import { PageHeader } from '@/components/layout/page';
import { requireRole } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { listShops } from '@/lib/services/admin';

export const metadata: Metadata = { title: 'Quán' };

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  unverified: { label: 'Chưa gửi', tone: 'neutral' },
  pending: { label: 'Chờ duyệt', tone: 'warn' },
  verified: { label: 'Đã xác minh', tone: 'deposit' },
  rejected: { label: 'Bị từ chối', tone: 'danger' },
};
const FILTERS = ['pending', 'verified', 'rejected', 'all'] as const;

/** Duyệt quán (P3-05, 05 §4.8 GET /admin/shops, POST /admin/shops/{id}/review) */
export default async function AdminShopsPage({ searchParams }: PageProps<'/admin/shops'>) {
  await requireRole('admin');
  const raw = (await searchParams).status;
  const current = FILTERS.find((s) => s === raw) ?? 'all';
  const all = await listShops();
  const items = current === 'all' ? all : all.filter((s) => s.verification_status === current);
  const count = (s: string) => all.filter((x) => x.verification_status === s).length;

  return (
    <>
      <PageHeader
        title="Quán"
        description="Quán đã xác minh mới đăng ca được. Chế độ demo tự xác minh khi tạo quán."
      />
      <div className="mb-4">
        <FilterLinks
          label="Trạng thái xác minh"
          current={current}
          options={[
            { value: 'pending', label: 'Chờ duyệt', count: count('pending') },
            { value: 'verified', label: 'Đã xác minh', count: count('verified') },
            { value: 'rejected', label: 'Từ chối', count: count('rejected') },
            { value: 'all', label: 'Tất cả', count: all.length },
          ]}
          href={(v) => withQuery('/admin/shops', { status: v === 'all' ? undefined : v })}
        />
      </div>
      {items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-8 text-center text-sm text-text-muted shadow-[var(--shadow-card)]">
          {current === 'pending' ? 'Không có quán nào chờ duyệt.' : 'Không có quán nào.'}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((s) => {
            const st = STATUS[s.verification_status] ?? STATUS.unverified;
            return (
              <li
                key={s.id}
                className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{s.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      <MapPin className="size-3" aria-hidden /> {s.address}
                      {s.district ? `, ${s.district}` : ''}
                    </span>
                    <span className="text-xs text-text-muted">
                      Chủ quán: {s.owner?.full_name ?? '—'}
                      {s.owner?.phone ? ` · ${s.owner.phone}` : ''} · tạo lúc{' '}
                      {fmtDateTime(s.created_at)}
                    </span>
                  </span>
                  <span className="grid justify-items-end gap-1">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {s.rating_count > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs text-text-muted">
                        <Star className="size-3 fill-current text-spark" aria-hidden />{' '}
                        {s.rating_avg.toFixed(1)} ({s.rating_count})
                      </span>
                    ) : null}
                  </span>
                </div>
                {s.verification_status !== 'verified' ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {s.verification_status !== 'rejected' ? (
                      <AdminAction
                        label="Từ chối"
                        variant="destructive"
                        icon={<X aria-hidden />}
                        path={`/admin/shops/${s.id}/review`}
                        body={{ approve: false }}
                        success={`Đã từ chối ${s.name}`}
                        confirm={{
                          title: `Từ chối ${s.name}?`,
                          text: 'Chủ quán nhận thông báo kèm lý do để sửa và gửi lại.',
                          reason: 'Lý do (tối thiểu 5 ký tự)',
                          action: 'Từ chối',
                          danger: true,
                        }}
                      />
                    ) : null}
                    <AdminAction
                      label="Duyệt"
                      variant="default"
                      icon={<Check aria-hidden />}
                      path={`/admin/shops/${s.id}/review`}
                      body={{ approve: true }}
                      success={`${s.name} đã được xác minh`}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
