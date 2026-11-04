import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';

let client: SupabaseClient<Database> | undefined;

/**
 * Client dùng khóa secret: bỏ qua RLS, là client duy nhất được gọi hàm fn_*.
 * Chỉ dùng ở server, luôn truyền p_actor là id người dùng đã xác thực.
 */
export function adminClient(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(publicEnv().supabaseUrl, serverEnv.supabaseSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
