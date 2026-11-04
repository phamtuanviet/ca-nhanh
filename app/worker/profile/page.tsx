import { LogOut } from 'lucide-react';
import type { Metadata } from 'next';
import { signOut } from '@/app/(auth)/actions';
import { Badge } from '@/components/cn/badge';
import { PageHeader } from '@/components/layout/page';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/roles';

export const metadata: Metadata = { title: 'Hồ sơ' };

export default async function ProfilePage() {
  const user = await requireRole('worker');

  return (
    <>
      <PageHeader title="Hồ sơ" description="Tài khoản và cài đặt" />
      <section className="grid gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
            <img src={user.avatarUrl} alt="" className="size-16 rounded-full bg-lam-100" />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-lam-100 text-xl font-bold text-on-primary-soft">
              {user.fullName.at(0)}
            </div>
          )}
          <div className="grid min-w-0 gap-1">
            <p className="truncate text-lg font-bold">{user.fullName}</p>
            {user.email ? <p className="truncate text-sm text-text-muted">{user.email}</p> : null}
            <Badge tone="info">{ROLE_LABEL[user.role]}</Badge>
          </div>
        </div>
        <p className="text-sm text-text-muted">
          Kỹ năng, trường, giới thiệu, xác minh danh tính và tài khoản ngân hàng sẽ sửa được ở đây
          (P1-08, P2-06).
        </p>
      </section>

      <section className="mt-4 grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-semibold">Giao diện</h2>
        <ThemeToggle />
      </section>

      <form action={signOut} className="mt-4">
        <Button type="submit" variant="outline" block>
          <LogOut aria-hidden /> Đăng xuất
        </Button>
      </form>
    </>
  );
}
