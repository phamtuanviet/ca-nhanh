import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Logo } from '@/components/brand/logo';
import { EmptyState } from '@/components/cn/empty-state';
import { Skeleton } from '@/components/cn/skeleton';
import { getSessionUser } from '@/lib/auth';
import { inspectToken, resolveCheckinTarget } from '@/lib/services/attendance';
import { AttendanceFlow } from './attendance-flow';

export const metadata: Metadata = { title: 'Chấm công', robots: { index: false } };

/**
 * Deep link khi quét QR của kiosk bằng camera hệ thống (05 §7): tìm booking của người làm tại quán
 * rồi check-in hoặc check-out. Cũng là đích của trang quét QR trong ứng dụng.
 */
export default function CheckinLinkPage({ params }: PageProps<'/c/[token]'>) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <Logo href="/worker" />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center py-8">
        <Suspense fallback={<Skeleton shape="lines" lines={4} />}>
          <CheckinLoader params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function CheckinLoader({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/c/${token}`)}`);
  if (!user.onboarded) redirect('/onboarding');

  if (user.role !== 'worker') {
    return (
      <Card
        title="Mã này dành cho người làm"
        text="Người làm quét mã QR trên kiosk của quán để check-in và check-out."
        href="/"
      />
    );
  }

  const check = await inspectToken(token);
  if (!check.ok && !check.shopId) {
    return (
      <Card
        title="Mã QR không hợp lệ"
        text="Hãy quét mã đang hiển thị trên kiosk của quán."
        href="/worker/scan"
        label="Quét lại"
      />
    );
  }

  const target = await resolveCheckinTarget(user.id, check.shopId!);
  return <AttendanceFlow token={token} target={target} />;
}

function Card({
  title,
  text,
  href,
  label = 'Về trang chủ',
}: {
  title: string;
  text: string;
  href: string;
  label?: string;
}) {
  return (
    <div className="w-full rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      <EmptyState illustration="qr-scan" title={title} text={text}>
        <Link href={href} className="mt-2 font-semibold text-primary hover:underline">
          {label}
        </Link>
      </EmptyState>
    </div>
  );
}
