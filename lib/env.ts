// Biến môi trường công khai (an toàn ở trình duyệt). Phải đọc đúng tên `process.env.NEXT_PUBLIC_*`
// để Next.js thay giá trị lúc build.
export function publicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (xem .env.example)',
    );
  }
  return {
    supabaseUrl,
    supabaseKey,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };
}
