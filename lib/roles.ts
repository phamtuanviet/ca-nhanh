import type { Database } from '@/lib/database.types';

export type Role = Database['public']['Enums']['user_role'];
export type Area = 'worker' | 'shop' | 'admin';

/** Trang chủ của từng vai trò */
export const ROLE_HOME: Record<Role, string> = {
  worker: '/worker',
  shop_owner: '/shop',
  admin: '/admin',
};

export const ROLE_AREA: Record<Role, Area> = {
  worker: 'worker',
  shop_owner: 'shop',
  admin: 'admin',
};

export const ROLE_LABEL: Record<Role, string> = {
  worker: 'Người làm',
  shop_owner: 'Chủ quán',
  admin: 'Quản trị',
};

/** Khu vực mà đường dẫn thuộc về, hoặc null nếu là trang chung */
export function areaOf(pathname: string): Area | null {
  const first = pathname.split('/')[1];
  return first === 'worker' || first === 'shop' || first === 'admin' ? first : null;
}

/** Chỉ chấp nhận đường dẫn nội bộ cho tham số ?next= (chặn chuyển hướng ra ngoài) */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return null;
  return next;
}
