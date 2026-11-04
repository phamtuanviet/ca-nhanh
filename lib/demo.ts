import type { Role } from '@/lib/roles';

export type DemoAccountKey = 'owner' | 'worker_a' | 'worker_b' | 'admin';

/** 4 tài khoản của nút đăng nhập nhanh (US-02). Mật khẩu chung nằm ở biến DEMO_PASSWORD. */
export const DEMO_ACCOUNTS: Record<
  DemoAccountKey,
  { email: string; fullName: string; role: Role; label: string; hint: string; avatar: string }
> = {
  owner: {
    email: 'lan@demo.vn',
    fullName: 'Nguyễn Thị Lan',
    role: 'shop_owner',
    label: 'Chủ quán',
    hint: 'Chị Lan · Cà phê Góc Phố',
    avatar: '/avatars/lan.svg',
  },
  worker_a: {
    email: 'minh@demo.vn',
    fullName: 'Nguyễn Văn Minh',
    role: 'worker',
    label: 'Người làm A',
    hint: 'Minh · pha chế',
    avatar: '/avatars/minh.svg',
  },
  worker_b: {
    email: 'an@demo.vn',
    fullName: 'Phạm Thu An',
    role: 'worker',
    label: 'Người làm B',
    hint: 'An · phục vụ',
    avatar: '/avatars/an.svg',
  },
  admin: {
    email: 'admin@demo.vn',
    fullName: 'Quản trị Ca Nhanh',
    role: 'admin',
    label: 'Quản trị',
    hint: 'Dashboard KPI, công cụ demo',
    avatar: '/avatars/kiet.svg',
  },
};

export function isDemoAccountKey(value: unknown): value is DemoAccountKey {
  return typeof value === 'string' && value in DEMO_ACCOUNTS;
}
