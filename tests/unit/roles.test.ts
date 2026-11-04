import { describe, expect, it } from 'vitest';
import { isActive } from '@/components/layout/nav-items';
import { ROLE_AREA, ROLE_HOME, areaOf, safeNextPath } from '@/lib/roles';

describe('areaOf', () => {
  it('nhận đúng khu vực theo đường dẫn', () => {
    expect(areaOf('/worker')).toBe('worker');
    expect(areaOf('/shop/shifts/123')).toBe('shop');
    expect(areaOf('/admin/demo')).toBe('admin');
    expect(areaOf('/login')).toBeNull();
    expect(areaOf('/workers')).toBeNull();
    expect(areaOf('/')).toBeNull();
  });

  it('trang chủ mỗi vai trò thuộc đúng khu vực của nó', () => {
    for (const role of ['worker', 'shop_owner', 'admin'] as const) {
      expect(areaOf(ROLE_HOME[role])).toBe(ROLE_AREA[role]);
    }
  });
});

describe('safeNextPath', () => {
  it('chỉ nhận đường dẫn nội bộ', () => {
    expect(safeNextPath('/shop/shifts')).toBe('/shop/shifts');
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});

describe('isActive', () => {
  it('trang chủ khu vực chỉ khớp chính xác, mục khác khớp tiền tố', () => {
    expect(isActive('/worker', '/worker', '/worker')).toBe(true);
    expect(isActive('/worker/wallet', '/worker', '/worker')).toBe(false);
    expect(isActive('/worker/wallet', '/worker/wallet', '/worker')).toBe(true);
    expect(isActive('/shop/shifts/abc', '/shop/shifts', '/shop')).toBe(true);
    expect(isActive('/shop/shiftsx', '/shop/shifts', '/shop')).toBe(false);
  });
});
