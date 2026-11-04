import { NextResponse, type NextRequest } from 'next/server';
import { destinationFor } from '@/lib/auth-destination';
import { safeNextPath } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

/**
 * Đăng nhập Google (FR-AUTH-02, P3-07): Supabase chuyển về đây kèm ?code=, đổi lấy phiên (đặt cookie)
 * rồi vào khu vực theo vai trò. Người dùng mới qua onboarding để chọn vai trò.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next') ?? '');
  if (!code) return NextResponse.redirect(new URL('/login?error=oauth', url.origin));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL('/login?error=oauth', url.origin));
  return NextResponse.redirect(new URL(await destinationFor(data.user.id, next), url.origin));
}
