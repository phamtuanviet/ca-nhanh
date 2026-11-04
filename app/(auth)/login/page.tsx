import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DEMO_ACCOUNTS, type DemoAccountKey } from '@/lib/demo';
import { isDemoMode } from '@/lib/env.server';
import { DemoLogin, LoginForm, LoginNotice } from './login-form';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function LoginPage() {
  const demo = isDemoMode();
  const accounts = (Object.keys(DEMO_ACCOUNTS) as DemoAccountKey[]).map((key) => ({
    key,
    ...DEMO_ACCOUNTS[key],
  }));

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-[28px] leading-9 font-bold tracking-tight">Đăng nhập</h1>
        <p className="text-text-muted">
          Chưa có tài khoản?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>

      {/* ?next= và ?error= là dữ liệu của request nên nằm sau Suspense */}
      <Suspense
        fallback={
          <div className="h-56 animate-pulse rounded-[var(--radius-card)] bg-surface-sunken" />
        }
      >
        <LoginNotice />
        <LoginForm />
      </Suspense>

      {demo ? (
        <Suspense fallback={null}>
          <DemoLogin accounts={accounts} />
        </Suspense>
      ) : null}
    </div>
  );
}
