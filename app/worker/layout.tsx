import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { PageSkeleton } from '@/components/layout/page';
import { RoleGate } from '@/components/layout/role-gate';
import { UserMenu, UserMenuSkeleton } from '@/components/layout/user-menu';
import { WorkerTabBar } from '@/components/layout/worker-tab-bar';

/** Khu vực người làm: thiết kế cho điện thoại, thanh tab dưới */
export default function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Logo href="/worker" className="h-6" />
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={<PageSkeleton />}>
          <RoleGate role="worker">{children}</RoleGate>
        </Suspense>
      </main>
      <WorkerTabBar />
    </div>
  );
}
