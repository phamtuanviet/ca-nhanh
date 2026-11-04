import { LogOut } from 'lucide-react';
import type { Metadata } from 'next';
import { signOut } from '@/app/(auth)/actions';
import { InstallHint } from '@/components/install-hint';
import { PageHeader } from '@/components/layout/page';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { InviteCard } from '@/components/worker/invite-card';
import { WorkerCv } from '@/components/worker/worker-cv';
import { requireRole } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { getPositions } from '@/lib/services/catalog';
import { listInvites } from '@/lib/services/invites';
import { getWorkerProfile } from '@/lib/services/workers';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Hồ sơ' };

/** W9: hồ sơ và CV tự động, lời mời, cài đặt (P3-07, PRF-01, PRF-05, BKG-09) */
export default async function ProfilePage() {
  const user = await requireRole('worker');
  const [cv, positions, invites] = await Promise.all([
    getWorkerProfile(user, user.id),
    getPositions(),
    listInvites(user.id, 'pending'),
  ]);
  const standing = cv.standing!;

  return (
    <>
      <PageHeader
        title="Hồ sơ"
        description="Quán xem hồ sơ này khi bạn nhận ca: điểm, số ca, huy hiệu"
      />
      <InstallHint />
      {invites.length > 0 ? (
        <section className="mb-4 grid gap-2" aria-label="Lời mời làm ca">
          <h2 className="font-semibold">Lời mời ({invites.length})</h2>
          <ul className="grid gap-2">
            {invites.map((i) => (
              <InviteCard key={i.id} invite={i} />
            ))}
          </ul>
        </section>
      ) : null}

      <WorkerCv w={cv} />

      <section className="mt-4 grid gap-1 rounded-[var(--radius-card)] bg-surface p-5 text-sm shadow-[var(--shadow-card)]">
        <h2 className="font-semibold">Điểm phạt</h2>
        <p className="text-text-muted">
          {standing.penalty_points} điểm trong 30 ngày gần nhất.
          {standing.suspended_until
            ? ` Đang tạm khóa nhận ca đến ${fmtDateTime(standing.suspended_until)}.`
            : ' Đủ 4 điểm sẽ bị tạm khóa nhận ca 7 ngày.'}
        </p>
      </section>

      <div className="mt-4">
        <ProfileForm
          initial={{ school: cv.school, bio: cv.bio, skills: cv.skills.map((s) => s.code) }}
          positions={positions}
        />
      </div>

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
