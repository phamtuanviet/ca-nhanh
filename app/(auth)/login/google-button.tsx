'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getBrowserClient } from '@/lib/supabase/client';

/** "Tiếp tục với Google" (FR-AUTH-02): chỉ hiện khi NEXT_PUBLIC_GOOGLE_AUTH=true và đã bật provider trong Supabase */
export function GoogleButton() {
  const next = useSearchParams().get('next') ?? '';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
    const { error: err } = await getBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (err) {
      setError('Không mở được đăng nhập Google, thử lại sau');
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" block onClick={go} disabled={pending}>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
          />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path
            fill="#EA4335"
            d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z"
          />
        </svg>
        {pending ? 'Đang chuyển sang Google…' : 'Tiếp tục với Google'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
