import type { NextRequest } from 'next/server';
import { ROLE_AREA, ROLE_HOME, areaOf } from '@/lib/roles';
import { adminClient } from '@/lib/supabase/admin';
import { redirectKeepingCookies, updateSession } from '@/lib/supabase/proxy';

const AUTH_PAGES = new Set(['/login', '/signup']);

/**
 * Lớp phân quyền trang (03 §7.1): làm mới phiên, chưa đăng nhập thì về /login,
 * sai vai trò thì về trang chủ của vai trò mình. Layout của từng khu vực kiểm tra lại (lib/auth.ts).
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const area = areaOf(pathname);
  const isAuthPage = AUTH_PAGES.has(pathname);
  const isOnboarding = pathname === '/onboarding';

  if (!area && !isAuthPage && !isOnboarding) return response;

  if (!userId) {
    if (isAuthPage) return response;
    const next = encodeURIComponent(pathname + search);
    return redirectKeepingCookies(request, response, `/login?next=${next}`);
  }

  const { data: profile } = await adminClient()
    .from('profiles')
    .select('role, status, onboarded_at')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return isAuthPage ? response : redirectKeepingCookies(request, response, '/login');

  if (profile.status === 'locked') {
    return isAuthPage ? response : redirectKeepingCookies(request, response, '/login?error=locked');
  }

  const home = profile.onboarded_at ? ROLE_HOME[profile.role] : '/onboarding';
  if (isAuthPage) return redirectKeepingCookies(request, response, home);
  if (isOnboarding)
    return profile.onboarded_at ? redirectKeepingCookies(request, response, home) : response;
  if (!profile.onboarded_at || area !== ROLE_AREA[profile.role]) {
    return redirectKeepingCookies(request, response, home);
  }
  return response;
}

export const config = {
  // Bỏ qua API (tự xác thực trong Route Handler), file tĩnh và asset
  matcher: [
    '/((?!api/|_next/static|_next/image|brand/|photos/|illustrations/|avatars/|favicon.ico|sw.js|offline|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|webmanifest|txt)$).*)',
  ],
};
