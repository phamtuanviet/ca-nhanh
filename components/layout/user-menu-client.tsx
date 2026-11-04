'use client';

import { LogOut, Monitor, Moon, Palette, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { signOut } from '@/app/(auth)/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.at(-1)?.[0] ?? '?').toUpperCase();
}

export function UserMenuClient({
  name,
  email,
  roleLabel,
  avatarUrl,
}: {
  name: string;
  email: string | null;
  roleLabel: string;
  avatarUrl: string | null;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-lam-100 text-sm font-bold text-on-primary-soft ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Tài khoản: ${name}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials(name)
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate text-sm font-semibold text-text">{name}</span>
          {email ? (
            <span className="truncate text-xs font-normal text-text-muted">{email}</span>
          ) : null}
          <span className="cn-badge cn-badge--info mt-1 w-fit">{roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-text-muted">
          <Palette className="size-4" aria-hidden /> Giao diện
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden /> Sáng
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden /> Tối
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden /> Theo máy
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dev/ui">Hệ thiết kế (dev)</Link>
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut aria-hidden /> Đăng xuất
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
