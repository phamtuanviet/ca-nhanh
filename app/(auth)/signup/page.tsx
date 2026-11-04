import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Đăng ký' };

export default function SignupPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-[28px] leading-9 font-bold tracking-tight">Tạo tài khoản</h1>
        <p className="text-text-muted">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
