import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import type { Role } from '@/lib/roles';
import { PageSkeleton } from './page';
import { RoleGate } from './role-gate';
import { MobileNav, SideNav } from './side-nav';
import { UserMenu, UserMenuSkeleton } from './user-menu';

/** Khung của chủ quán và admin: thanh bên trên desktop, menu trượt trên mobile */
export function SidebarLayout({
  area,
  role,
  children,
}: {
  area: 'shop' | 'admin';
  role: Role;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-surface px-3 py-5 lg:sticky lg:top-0 lg:block lg:h-dvh">
        <SideNav area={area} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur lg:h-16 lg:px-8">
          <MobileNav area={area} />
          <div className="lg:hidden">
            <Logo href={`/${area}`} className="h-6" />
          </div>
          <div className="ml-auto">
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSkeleton />}>
            <RoleGate role={role}>{children}</RoleGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
