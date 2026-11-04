import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Logo } from '@/components/brand/logo';
import { Skeleton } from '@/components/cn/skeleton';
import { getSessionUser } from '@/lib/auth';
import { ROLE_HOME } from '@/lib/roles';
import { getPositions } from '@/lib/services/catalog';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Hoàn tất hồ sơ' };

/** W2: chọn vai trò → hồ sơ (P1-08). proxy.ts chỉ cho tài khoản chưa onboarding vào đây. */
export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <Logo />
      <main className="mx-auto w-full max-w-lg flex-1 py-8">
        <Suspense fallback={<Skeleton shape="lines" lines={8} />}>
          <OnboardingLoader />
        </Suspense>
      </main>
    </div>
  );
}

async function OnboardingLoader() {
  await connection(); // form tính ngày sinh tối đa theo ngày hiện tại
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.onboarded) redirect(ROLE_HOME[user.role]);
  const positions = await getPositions();
  return (
    <OnboardingForm
      fullName={user.fullName}
      initialRole={user.role === 'shop_owner' ? 'shop_owner' : 'worker'}
      positions={positions}
    />
  );
}
