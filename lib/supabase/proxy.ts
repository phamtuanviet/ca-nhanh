import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';

/**
 * Làm mới phiên Supabase trước khi trang render (mẫu proxy của @supabase/ssr).
 * Trả về response mang cookie mới và id người dùng nếu phiên hợp lệ.
 */
export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseKey } = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Response có đặt cookie phiên thì không được để CDN lưu cache
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Không chèn code giữa createServerClient và getClaims: getClaims kích hoạt việc làm mới token
  const { data } = await supabase.auth.getClaims();
  return { response, userId: data?.claims?.sub ?? null };
}

/** Chuyển hướng nhưng giữ cookie phiên vừa làm mới */
export function redirectKeepingCookies(request: NextRequest, from: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  const cacheControl = from.headers.get('cache-control');
  if (cacheControl) redirect.headers.set('cache-control', cacheControl);
  return redirect;
}
