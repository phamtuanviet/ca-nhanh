'use client';

import { Briefcase, Store } from 'lucide-react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp, type AuthFormState } from '../actions';

const ROLES = [
  {
    value: 'worker',
    title: 'Tôi tìm ca làm',
    text: 'Nhận ca theo giờ, lương về ví trong ngày',
    Icon: Briefcase,
  },
  {
    value: 'shop_owner',
    title: 'Tôi cần người làm',
    text: 'Đăng ca, có người trong vài giờ',
    Icon: Store,
  },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  const role = state.fields?.role || 'worker';

  return (
    <form action={action} className="grid gap-5" noValidate>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Bạn dùng Ca Nhanh để</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map(({ value, title, text, Icon }) => (
            <label
              key={value}
              className="grid cursor-pointer gap-1 rounded-[var(--radius-control)] border border-border bg-surface p-3 has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={role === value}
                className="sr-only"
              />
              <Icon className="size-5 text-primary" aria-hidden />
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-xs text-text-muted">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="full_name">Họ tên</Label>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={state.fields?.full_name}
          className="h-11"
        />
      </div>
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
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby="password-hint"
          className="h-11"
        />
        <p id="password-hint" className="text-xs text-text-muted">
          Tối thiểu 8 ký tự
        </p>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="rounded-[var(--radius-control)] bg-money-soft px-4 py-3 text-sm text-on-money-soft"
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" block disabled={pending}>
        {pending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </Button>
    </form>
  );
}
