import { connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/roles';
import { NotificationBell } from './notification-bell';
import { UserMenuClient } from './user-menu-client';

/**
 * Chuông thông báo + avatar và menu tài khoản. Đọc phiên nên đặt trong
 * <Suspense fallback={<UserMenuSkeleton />}>.
 */
export async function UserMenu() {
  // Chuông dùng TanStack Query (đọc giờ hiện tại khi render): chỉ render lúc có request thật,
  // không đưa vào App Shell được prefetch theo phiên (Partial Prefetching)
  await connection();
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-1">
      {user.onboarded ? <NotificationBell userId={user.id} role={user.role} /> : null}
      <UserMenuClient
        name={user.fullName}
        email={user.email}
        roleLabel={ROLE_LABEL[user.role]}
        avatarUrl={user.avatarUrl}
      />
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <div className="size-9 animate-pulse rounded-full bg-surface-sunken" />
      <div className="size-10 animate-pulse rounded-full bg-surface-sunken" />
    </div>
  );
}
