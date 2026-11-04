'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const OPTIONS = [
  { value: 'light', label: 'Sáng', Icon: Sun },
  { value: 'dark', label: 'Tối', Icon: Moon },
  { value: 'system', label: 'Theo máy', Icon: Monitor },
] as const;

const subscribe = () => () => {};

/** Chọn theme sáng / tối / theo hệ điều hành */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Theme chỉ biết được ở trình duyệt; trước khi hydrate thì không đánh dấu lựa chọn nào
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Giao diện"
      className="inline-flex rounded-[var(--radius-control)] bg-surface-sunken p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-[calc(var(--radius-control)-4px)] px-3 text-sm font-medium transition-colors ${
              active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
