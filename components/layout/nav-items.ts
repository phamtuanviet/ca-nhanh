import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Compass,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Store,
  Ticket,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Area } from '@/lib/roles';

export type NavItem = { href: string; label: string; Icon: LucideIcon };

/** Menu theo khu vực (07 P0-09) */
export const NAV: Record<Area, NavItem[]> = {
  worker: [
    { href: '/worker', label: 'Khám phá', Icon: Compass },
    { href: '/worker/bookings', label: 'Ca của tôi', Icon: Ticket },
    { href: '/worker/wallet', label: 'Ví', Icon: Wallet },
    { href: '/worker/profile', label: 'Hồ sơ', Icon: UserRound },
  ],
  shop: [
    { href: '/shop', label: 'Hôm nay', Icon: LayoutDashboard },
    { href: '/shop/shifts', label: 'Ca', Icon: CalendarDays },
    { href: '/shop/timesheets', label: 'Giờ công', Icon: ClipboardCheck },
    { href: '/shop/workers', label: 'Người làm', Icon: Users },
    { href: '/shop/wallet', label: 'Ví', Icon: Wallet },
    { href: '/shop/settings', label: 'Quán', Icon: Store },
  ],
  admin: [
    { href: '/admin', label: 'KPI', Icon: BarChart3 },
    { href: '/admin/users', label: 'Người dùng', Icon: Users },
    { href: '/admin/shops', label: 'Quán', Icon: Store },
    { href: '/admin/payments', label: 'Thanh toán', Icon: CreditCard },
    { href: '/admin/settings', label: 'Cấu hình', Icon: Settings },
    { href: '/admin/demo', label: 'Demo', Icon: FlaskConical },
  ],
};

export const AREA_TITLE: Record<Area, string> = {
  worker: 'Người làm',
  shop: 'Chủ quán',
  admin: 'Quản trị',
};

/** Mục đang chọn: khớp chính xác với trang chủ khu vực, khớp tiền tố với các mục còn lại */
export function isActive(pathname: string, href: string, areaHome: string): boolean {
  if (href === areaHome) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
