import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';

/**
 * Client theo phiên người dùng (cookie), cho Server Component, Server Action và Route Handler.
 * Tạo mới cho mỗi request. Quyền đọc tuân theo RLS; mọi thao tác ghi đi qua hàm fn_* bằng adminClient().
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseKey } = publicEnv();
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Gọi từ Server Component thì không ghi được cookie; proxy.ts đã làm mới phiên trước đó.
        }
      },
    },
  });
}
