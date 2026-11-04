import 'server-only';
import { ROLE_HOME } from '@/lib/roles';
import { adminClient } from '@/lib/supabase/admin';

/** Trang đích sau khi đăng nhập: ?next= nếu hợp lệ, nếu không thì trang chủ theo vai trò */
export async function destinationFor(userId: string, next: string | null): Promise<string> {
  const { data: profile } = await adminClient()
    .from('profiles')
    .select('role, onboarded_at')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.onboarded_at) return '/onboarding';
  const home = ROLE_HOME[profile.role];
  // Chỉ dùng ?next= khi nó thuộc khu vực của chính vai trò đó (người làm: thêm deep link chấm công /c/…)
  const allowed = next?.startsWith(home) || (profile.role === 'worker' && next?.startsWith('/c/'));
  return next && allowed ? next : home;
}
