import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ROLE_HOME, type Role } from '@/lib/roles';
import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type SessionUser = {
  id: string;
  email: string | null;
  role: Role;
  fullName: string;
  avatarUrl: string | null;
  status: 'active' | 'locked';
  onboarded: boolean;
};

/**
 * Lớp truy cập dữ liệu (DAL) cho trang: đọc phiên từ cookie rồi lấy hồ sơ.
 * Đọc cookie nên chỉ gọi bên trong <Suspense>. `cache` gộp các lần gọi trong cùng một request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  // Vai trò authenticated không được đọc cột onboarded_at, nên đọc bằng client secret theo id đã xác thực
  const { data: profile } = await adminClient()
    .from('profiles')
    .select('role, full_name, avatar_url, status, onboarded_at')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: userId,
    email: typeof data.claims.email === 'string' ? data.claims.email : null,
    role: profile.role,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    status: profile.status,
    onboarded: profile.onboarded_at !== null,
  };
});

/** Chặn trang theo vai trò. proxy.ts đã chuyển hướng sớm; đây là lớp kiểm tra chính thức. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.status === 'locked') redirect('/login?error=locked');
  if (!user.onboarded) redirect('/onboarding');
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}
