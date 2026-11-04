import { getSessionUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/roles';
import { UserMenuClient } from './user-menu-client';

/** Avatar + menu tài khoản. Đọc phiên nên đặt trong <Suspense fallback={<UserMenuSkeleton />}>. */
export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <UserMenuClient
      name={user.fullName}
      email={user.email}
      roleLabel={ROLE_LABEL[user.role]}
      avatarUrl={user.avatarUrl}
    />
  );
}

export function UserMenuSkeleton() {
  return <div className="size-10 animate-pulse rounded-full bg-surface-sunken" aria-hidden />;
}
