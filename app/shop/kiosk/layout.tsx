import { Suspense, type ReactNode } from 'react';
import { RoleGate } from '@/components/layout/role-gate';

/** Kiosk QR toàn màn hình trên tablet của quán: không có thanh bên, chỉ chủ quán mở được */
export default function KioskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <Suspense
        fallback={<div className="cn-skel mx-auto mt-24 size-72 rounded-[var(--radius-sheet)]" />}
      >
        <RoleGate role="shop_owner">{children}</RoleGate>
      </Suspense>
    </div>
  );
}
