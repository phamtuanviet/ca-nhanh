'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Area } from '@/lib/roles';
import { AREA_TITLE, NAV, isActive } from './nav-items';

function NavLinks({
  area,
  onNavigate,
}: {
  area: Exclude<Area, 'worker'>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const home = `/${area}`;
  return (
    <ul className="grid gap-1">
      {NAV[area].map(({ href, label, Icon }) => {
        const active = isActive(pathname, href, home);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[15px] font-medium transition-colors ${
                active
                  ? 'bg-primary-soft text-on-primary-soft'
                  : 'text-text-muted hover:bg-surface-sunken hover:text-text'
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Thanh bên trên desktop */
export function SideNav({ area }: { area: Exclude<Area, 'worker'> }) {
  return (
    <nav aria-label="Điều hướng chính" className="grid gap-6">
      <div className="px-3">
        <Logo href={`/${area}`} />
        <p className="mt-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
          {AREA_TITLE[area]}
        </p>
      </div>
      <NavLinks area={area} />
    </nav>
  );
}

/** Nút mở menu trên mobile */
export function MobileNav({ area }: { area: Exclude<Area, 'worker'> }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mở menu" className="lg:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle className="text-left">{AREA_TITLE[area]}</SheetTitle>
        </SheetHeader>
        <NavLinks area={area} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
