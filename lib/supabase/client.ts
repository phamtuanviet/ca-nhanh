import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';

/** Client cho Client Component: dùng khóa publishable + phiên của người dùng, chỉ đọc qua RLS và nghe Realtime. */
export function createClient() {
  const { supabaseUrl, supabaseKey } = publicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}

let browserClient: SupabaseClient<Database> | undefined;

/** Một client dùng chung trong trình duyệt (một kết nối Realtime cho cả trang) */
export function getBrowserClient(): SupabaseClient<Database> {
  browserClient ??= createClient();
  return browserClient;
}
