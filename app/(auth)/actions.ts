'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { DEMO_ACCOUNTS, isDemoAccountKey } from '@/lib/demo';
import { publicEnv } from '@/lib/env';
import { isDemoMode, serverEnv } from '@/lib/env.server';
import { destinationFor } from '@/lib/auth-destination';
import { safeNextPath } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type AuthFormState = {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

const signInSchema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(1, 'Nhập họ tên').max(80, 'Họ tên tối đa 80 ký tự'),
  email: z.email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  role: z.enum(['worker', 'shop_owner'], { error: 'Chọn vai trò' }),
});

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get('email') ?? '');
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', fields: { email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: 'Email hoặc mật khẩu không đúng', fields: { email } };
  }
  redirect(await destinationFor(data.user.id, safeNextPath(String(formData.get('next') ?? ''))));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData);
  const fields = {
    full_name: String(raw.full_name ?? ''),
    email: String(raw.email ?? ''),
    role: String(raw.role ?? ''),
  };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', fields };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Trigger tg_handle_new_user đọc role/full_name; role=admin luôn bị bỏ qua ở CSDL
    options: {
      data: { role: parsed.data.role, full_name: parsed.data.full_name },
      emailRedirectTo: `${publicEnv().appUrl}/login`,
    },
  });
  if (error) {
    const taken = error.code === 'user_already_exists' || /already registered/i.test(error.message);
    return {
      error: taken ? 'Email này đã có tài khoản' : 'Không tạo được tài khoản, thử lại sau',
      fields,
    };
  }
  if (!data.session) {
    // Dự án bật xác nhận email: chưa có phiên cho tới khi người dùng bấm link
    return { message: 'Đã gửi email xác nhận. Mở email rồi đăng nhập lại.', fields };
  }
  redirect('/onboarding');
}

/** Đăng nhập nhanh bằng tài khoản demo (US-02), chỉ khi DEMO_MODE=true */
export async function demoSignIn(formData: FormData): Promise<void> {
  const key = formData.get('account');
  if (!isDemoMode() || !isDemoAccountKey(key)) redirect('/login?error=demo');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[key].email,
    password: serverEnv.demoPassword(),
  });
  if (error || !data.user) redirect('/login?error=demo');
  redirect(await destinationFor(data.user.id, safeNextPath(String(formData.get('next') ?? ''))));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
