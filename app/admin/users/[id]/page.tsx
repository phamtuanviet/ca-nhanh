import { ArrowLeft, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminAction } from '@/components/admin/admin-action';
import { Badge } from '@/components/cn/badge';
import { WorkerCv } from '@/components/worker/worker-cv';
import { ApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { getSettings } from '@/lib/services/settings';
import { getWorkerProfile } from '@/lib/services/workers';

export const metadata: Metadata = { title: 'Hồ sơ người làm' };

/** Admin xem người làm: CV, điểm phạt, tạm khóa (kịch bản demo 4:20: "người làm bỏ ca thì sao?") */
export default async function AdminWorkerPage({ params }: PageProps<'/admin/users/[id]'>) {
  const { id } = await params;
  const user = await requireRole('admin');
  const [w, settings] = await Promise.all([
    getWorkerProfile(user, id).catch((error: unknown) => {
      if (error instanceof ApiError) notFound();
      throw error;
    }),
    getSettings(),
  ]);
  const s = w.standing!;

  return (
    <div className="grid max-w-3xl gap-4">
      <Link
        href="/admin/users"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden /> Người dùng
      </Link>

      <section
        className={`grid gap-3 rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] ${
          s.suspended_until ? 'bg-danger-soft text-on-danger-soft' : 'bg-surface'
        }`}
        aria-label="Điểm phạt và tạm khóa"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 font-semibold">
            <ShieldAlert className="size-5" aria-hidden />
            {s.suspended_until
              ? `Đang tạm khóa nhận ca đến ${fmtDateTime(s.suspended_until)}`
              : 'Không bị tạm khóa'}
          </h2>
          <span className="flex flex-wrap gap-2">
            {s.status === 'locked' ? <Badge tone="danger">Tài khoản đã khóa</Badge> : null}
            {s.suspended_until ? (
              <AdminAction
                label="Gỡ tạm khóa"
                path={`/admin/users/${w.id}`}
                method="PATCH"
                body={{ clear_suspension: true }}
                success={`Đã gỡ tạm khóa nhận ca cho ${w.full_name}`}
                confirm={{
                  title: `Gỡ tạm khóa cho ${w.full_name}?`,
                  text: 'Người làm nhận ca được ngay. Điểm phạt trong cửa sổ vẫn giữ nguyên.',
                  action: 'Gỡ tạm khóa',
                }}
              />
            ) : null}
          </span>
        </div>
        <p className="text-sm">
          <strong>
            {s.penalty_points}/{settings.suspension_threshold} điểm phạt
          </strong>{' '}
          trong {settings.penalty_window_days} ngày. Đủ ngưỡng thì tự động tạm khóa{' '}
          {settings.suspension_days} ngày (hủy dưới 24 giờ {settings.penalty_points.cancel_lt_24h}{' '}
          điểm, dưới 6 giờ {settings.penalty_points.cancel_lt_6h} điểm, vắng mặt{' '}
          {settings.penalty_points.no_show} điểm).
        </p>
        {s.history.length > 0 ? (
          <ul className="grid gap-1 text-sm" aria-label="Lịch sử điểm phạt">
            {s.history.map((h, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2">
                <span>
                  {h.kind === 'no_show' ? 'Vắng mặt' : 'Hủy sát giờ'}: {h.shift_title} ·{' '}
                  {h.shop_name}
                </span>
                <span className="tabular-nums">
                  +{h.points} điểm · {h.at ? fmtDateTime(h.at) : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <WorkerCv w={w} />
    </div>
  );
}
