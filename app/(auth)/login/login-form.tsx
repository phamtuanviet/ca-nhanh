'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DemoAccountKey } from '@/lib/demo';
import { demoSignIn, signIn, type AuthFormState } from '../actions';

const NOTICES: Record<string, string> = {
  locked: 'Tài khoản đang bị khóa. Liên hệ quản trị để được mở lại.',
  demo: 'Không đăng nhập nhanh được. Kiểm tra DEMO_MODE, DEMO_PASSWORD và chạy `npm run seed`.',
};

export function LoginNotice() {
  const error = useSearchParams().get('error');
  const text = error ? NOTICES[error] : null;
  if (!text) return null;
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
    >
      {text}
    </p>
  );
}

export function LoginForm() {
  const next = useSearchParams().get('next') ?? '';
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.fields?.email}
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" block disabled={pending}>
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  );
}

type DemoAccount = { key: DemoAccountKey; label: string; hint: string; avatar: string };

function DemoButton({ account }: { account: DemoAccount }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get('account') === account.key;
  return (
    <button
      type="submit"
      name="account"
      value={account.key}
      disabled={pending}
      className="flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ */}
      <img
        src={account.avatar}
        alt=""
        width={36}
        height={36}
        className="size-9 rounded-full bg-lam-100"
      />
      <span className="grid min-w-0">
        <span className="text-sm font-semibold">{mine ? 'Đang vào…' : account.label}</span>
        <span className="truncate text-xs text-text-muted">{account.hint}</span>
      </span>
    </button>
  );
}

/** Nút đăng nhập nhanh cho người thuyết trình (US-02), chỉ hiện khi DEMO_MODE=true */
export function DemoLogin({ accounts }: { accounts: DemoAccount[] }) {
  const next = useSearchParams().get('next') ?? '';
  return (
    <section aria-labelledby="demo-login" className="grid gap-3 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h2 id="demo-login" className="text-sm font-semibold">
          Đăng nhập nhanh tài khoản demo
        </h2>
        <span className="cn-badge cn-badge--warn">Demo</span>
      </div>
      <form action={demoSignIn} className="grid grid-cols-2 gap-2">
        <input type="hidden" name="next" value={next} />
        {accounts.map((account) => (
          <DemoButton key={account.key} account={account} />
        ))}
      </form>
    </section>
  );
}
