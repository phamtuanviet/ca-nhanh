'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { NAV, isActive } from './nav-items';

/**
 * Thanh tab dưới của người làm (mobile-first, cài được như PWA).
 * usePathname() là dữ liệu URL ở route động nên nằm sau Suspense; lúc chờ thì chưa tô mục nào.
 */
export function WorkerTabBar() {
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <ActiveTabBar />
    </Suspense>
  );
}

function ActiveTabBar() {
  return <TabBar pathname={usePathname()} />;
}

function TabBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {NAV.worker.map(({ href, label, Icon }) => {
          const active = pathname !== null && isActive(pathname, href, '/worker');
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  active ? 'text-primary' : 'text-text-muted hover:text-text'
                }`}
              >
                <Icon className="size-6" aria-hidden strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
