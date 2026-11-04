'use client';

import { Download, Share, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const KEY = 'cn:install-hint';
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Chrome/Edge Android: giữ sự kiện để mở hộp cài bằng nút của mình
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

type Mode = 'hidden' | 'android' | 'ios';

function snapshot(): Mode {
  try {
    if (localStorage.getItem(KEY) === 'dismissed') return 'hidden';
  } catch {
    // không có localStorage: vẫn hiện gợi ý
  }
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return 'hidden';
  if (deferred) return 'android';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
  return ios ? 'ios' : 'hidden';
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Gợi ý "Thêm vào màn hình chính" (P3-08): Android dùng hộp cài của trình duyệt, iOS Safari hướng dẫn
 * nút Chia sẻ. Ẩn khi đã cài (display-mode: standalone) hoặc người dùng đã đóng.
 */
export function InstallHint() {
  const mode = useSyncExternalStore(subscribe, snapshot, () => 'hidden' as Mode);
  if (mode === 'hidden') return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, 'dismissed');
    } catch {
      // bỏ qua
    }
    emit();
  }

  return (
    <aside
      className="mb-4 flex items-start gap-3 rounded-[var(--radius-card)] bg-surface p-4 text-sm shadow-[var(--shadow-card)]"
      aria-label="Cài Ca Nhanh"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- icon ứng dụng */}
      <img
        src="/brand/app-icon-192.png"
        alt=""
        width={40}
        height={40}
        className="size-10 rounded-[10px]"
      />
      <div className="grid flex-1 gap-1">
        <strong>Cài Ca Nhanh lên màn hình chính</strong>
        {mode === 'android' ? (
          <span className="text-text-muted">
            Mở nhanh như ứng dụng, quét QR chấm công chỉ một chạm.
          </span>
        ) : (
          <span className="text-text-muted">
            Bấm <Share className="inline size-4 align-text-bottom" aria-label="Chia sẻ" /> rồi chọn{' '}
            <strong className="text-text">Thêm vào MH chính</strong>.
          </span>
        )}
        {mode === 'android' ? (
          <Button
            size="sm"
            className="mt-1 w-fit"
            onClick={async () => {
              await deferred?.prompt();
              deferred = null;
              emit();
            }}
          >
            <Download aria-hidden /> Cài ứng dụng
          </Button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng gợi ý cài ứng dụng"
        className="rounded-full p-1 text-text-muted hover:bg-surface-sunken hover:text-text"
      >
        <X className="size-4" aria-hidden />
      </button>
    </aside>
  );
}
