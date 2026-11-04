import { Search, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminAction } from '@/components/admin/admin-action';
import { FilterLinks, withQuery } from '@/components/admin/filter-links';
import { Badge } from '@/components/cn/badge';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requireRole } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { type AdminUser, listUsers } from '@/lib/services/admin';
import { adminUsersQuerySchema } from '@/lib/validators';

export const metadata: Metadata = { title: 'Người dùng' };

const ROLES = [
  { value: 'worker', label: 'Người làm' },
  { value: 'shop_owner', label: 'Chủ quán' },
  { value: 'admin', label: 'Admin' },
];
const STATUSES = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
];
const LIMIT = 20;

function Stats({ u }: { u: AdminUser }) {
  if (u.worker) {
    return (
      <span className="text-xs text-text-muted">
        {u.worker.rating_count > 0 ? `${u.worker.rating_avg.toFixed(1)}★ · ` : ''}
        {u.worker.completed_count} ca · {u.worker.no_show_count} vắng mặt ·{' '}
        <span className={u.worker.penalty_points > 0 ? 'font-semibold text-text' : ''}>
          {u.worker.penalty_points} điểm phạt
        </span>
      </span>
    );
  }
  if (u.shop_count !== null)
    return <span className="text-xs text-text-muted">{u.shop_count} quán</span>;
  return null;
}

/** Quản trị người dùng (P3-05, US-42): tìm, khóa/mở khóa, gỡ tạm khóa nhận ca */
export default async function AdminUsersPage({ searchParams }: PageProps<'/admin/users'>) {
  const admin = await requireRole('admin');
  const raw = await searchParams;
  const parsed = adminUsersQuerySchema.safeParse({
    role: raw.role ?? 'worker',
    status: raw.status === 'all' ? undefined : raw.status,
    q: raw.q,
    page: raw.page,
    limit: LIMIT,
  });
  const f = parsed.success ? parsed.data : { role: 'worker' as const, page: 1, limit: LIMIT };
  const { items, total } = await listUsers(f);
  const status = typeof raw.status === 'string' ? raw.status : 'all';
  const q = typeof raw.q === 'string' ? raw.q : '';
  const base = { role: f.role, status: status === 'all' ? undefined : status, q: q || undefined };
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageHeader title="Người dùng" description={`${total} tài khoản khớp bộ lọc`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterLinks
          label="Vai trò"
          options={ROLES}
          current={f.role ?? 'worker'}
          href={(v) => withQuery('/admin/users', { ...base, role: v })}
        />
        <FilterLinks
          label="Trạng thái"
          options={STATUSES}
          current={status}
          href={(v) => withQuery('/admin/users', { ...base, status: v === 'all' ? undefined : v })}
        />
        <form action="/admin/users" className="flex min-w-60 flex-1 gap-2" role="search">
          <input type="hidden" name="role" value={f.role ?? 'worker'} />
          {base.status ? <input type="hidden" name="status" value={base.status} /> : null}
          <label htmlFor="user-q" className="sr-only">
            Tìm theo tên, email, số điện thoại
          </label>
          <Input
            id="user-q"
            name="q"
            defaultValue={q}
            placeholder="Tên, email hoặc SĐT"
            className="h-10"
          />
          <Button type="submit" variant="outline" aria-label="Tìm">
            <Search aria-hidden />
          </Button>
        </form>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-8 text-center text-sm text-text-muted shadow-[var(--shadow-card)]">
          Không có tài khoản nào khớp.
        </p>
      ) : (
        <ul
          className="divide-y divide-border rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
          data-testid="admin-users"
        >
          {items.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              {u.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
                <img src={u.avatar_url} alt="" className="size-10 rounded-full bg-lam-100" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-lam-100 font-bold text-on-primary-soft">
                  {u.full_name.at(0)}
                </span>
              )}
              <span className="grid min-w-48 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  {u.role === 'worker' ? (
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                      {u.full_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{u.full_name}</span>
                  )}
                  {u.status === 'locked' ? <Badge tone="danger">Đã khóa</Badge> : null}
                  {u.worker?.suspended_until ? (
                    <Badge
                      tone="warn"
                      icon="clock"
                    >{`Tạm khóa nhận ca đến ${fmtDateTime(u.worker.suspended_until)}`}</Badge>
                  ) : null}
                </span>
                <span className="text-xs text-text-muted">
                  {u.email ?? '—'}
                  {u.phone ? ` · ${u.phone}` : ''}
                </span>
                <Stats u={u} />
              </span>
              <span className="flex flex-wrap gap-2">
                {u.worker?.suspended_until ? (
                  <AdminAction
                    label="Gỡ tạm khóa"
                    path={`/admin/users/${u.id}`}
                    method="PATCH"
                    body={{ clear_suspension: true }}
                    success={`Đã gỡ tạm khóa nhận ca cho ${u.full_name}`}
                    icon={<ShieldAlert aria-hidden />}
                    confirm={{
                      title: `Gỡ tạm khóa cho ${u.full_name}?`,
                      text: 'Người làm nhận ca được ngay. Điểm phạt trong 30 ngày vẫn giữ nguyên.',
                      action: 'Gỡ tạm khóa',
                    }}
                  />
                ) : null}
                {u.id === admin.id ? null : u.status === 'active' ? (
                  <AdminAction
                    label="Khóa"
                    variant="destructive"
                    path={`/admin/users/${u.id}`}
                    method="PATCH"
                    body={{ status: 'locked' }}
                    success={`Đã khóa ${u.full_name}`}
                    confirm={{
                      title: `Khóa tài khoản ${u.full_name}?`,
                      text: 'Người này không đăng nhập vào khu vực của mình được nữa cho tới khi mở khóa.',
                      action: 'Khóa tài khoản',
                      danger: true,
                    }}
                  />
                ) : (
                  <AdminAction
                    label="Mở khóa"
                    path={`/admin/users/${u.id}`}
                    method="PATCH"
                    body={{ status: 'active' }}
                    success={`Đã mở khóa ${u.full_name}`}
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Trang" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Trang {f.page}/{pages}
          </span>
          <span className="flex gap-2">
            {f.page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={withQuery('/admin/users', { ...base, page: String(f.page - 1) })}>
                  Trước
                </Link>
              </Button>
            ) : null}
            {f.page < pages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={withQuery('/admin/users', { ...base, page: String(f.page + 1) })}>
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
