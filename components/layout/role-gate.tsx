import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth';
import type { Role } from '@/lib/roles';

/**
 * Kiểm tra vai trò trước khi render nội dung khu vực. Đọc phiên nên phải nằm trong <Suspense>
 * (Cache Components), để khung trang vẫn prerender được.
 */
export async function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  await requireRole(role);
  return <>{children}</>;
}
