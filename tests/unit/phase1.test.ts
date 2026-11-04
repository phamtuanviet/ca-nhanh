import { describe, expect, it } from 'vitest';
import { fmtDay, fmtDistance, fmtRange, fmtTime, givenName, vnDate } from '@/lib/format';
import { scopeOf } from '@/lib/services/bookings';
import { asciiUpper } from '@/lib/services/profile';
import { publishShiftSchema, searchShiftsSchema, shopPatchSchema } from '@/lib/validators';

describe('định dạng theo giờ Việt Nam', () => {
  it('giờ và khoảng giờ', () => {
    expect(fmtTime('2026-11-05T10:00:00Z')).toBe('17:00');
    expect(fmtRange('2026-11-05T10:00:00Z', '2026-11-05T15:00:00Z')).toBe('17:00–22:00');
  });

  it('ngày tính theo múi giờ +07:00', () => {
    // 18:30 UTC ngày 04/11 là 01:30 ngày 05/11 ở Việt Nam
    expect(vnDate('2026-11-04T18:30:00Z')).toBe('2026-11-05');
    const now = new Date('2026-11-04T09:00:00+07:00');
    expect(fmtDay('2026-11-04T17:00:00+07:00', now)).toBe('Hôm nay');
    expect(fmtDay('2026-11-05T00:30:00+07:00', now)).toBe('Ngày mai');
    expect(fmtDay('2026-11-07T08:00:00+07:00', now)).toMatch(/^Thứ Bảy 07\/11$/);
  });

  it('khoảng cách', () => {
    expect(fmtDistance(423)).toBe('420 m');
    expect(fmtDistance(1250)).toBe('1,3 km');
    expect(fmtDistance(null)).toBe('');
  });

  it('tên gọi và tên tài khoản ngân hàng', () => {
    expect(givenName('Nguyễn Văn Minh')).toBe('Minh');
    expect(asciiUpper('Phạm  Thu Đan')).toBe('PHAM THU DAN');
  });
});

describe('tab "Ca của tôi"', () => {
  const now = new Date('2026-11-05T12:00:00+07:00');
  const at = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

  it('xếp booking theo trạng thái và giờ ca', () => {
    expect(scopeOf('confirmed', at(5), at(9), now)).toBe('upcoming');
    expect(scopeOf('confirmed', at(-1), at(3), now)).toBe('active');
    expect(scopeOf('checked_in', at(-1), at(3), now)).toBe('active');
    expect(scopeOf('confirmed', at(-6), at(-1), now)).toBe('pending_approval');
    expect(scopeOf('checked_out', at(-6), at(-1), now)).toBe('pending_approval');
    expect(scopeOf('completed', at(-30), at(-25), now)).toBe('history');
    expect(scopeOf('cancelled', at(5), at(9), now)).toBe('history');
    expect(scopeOf('no_show', at(-6), at(-1), now)).toBe('history');
  });
});

describe('schema', () => {
  it('tìm ca: bán kính 1–20 km, tách danh sách vị trí, mặc định sắp xếp', () => {
    const ok = searchShiftsSchema.parse({
      lat: '21.03',
      lng: '105.78',
      positions: 'barista,server',
    });
    expect(ok).toMatchObject({
      radius_km: 5,
      sort: 'match',
      page: 1,
      limit: 20,
      positions: ['barista', 'server'],
    });
    expect(() => searchShiftsSchema.parse({ lat: '21', lng: '105', radius_km: '50' })).toThrow();
    expect(() => searchShiftsSchema.parse({ lat: '21', lng: '105', limit: '500' })).toThrow();
  });

  it('đăng ca: bắt buộc giờ có múi giờ, giá trị mặc định', () => {
    const base = {
      shop_id: '5a1d6c2e-8f43-4b7a-9c1e-2d3f4a5b6c7d',
      position_code: 'barista',
      title: 'Pha chế ca tối',
      start_at: '2026-11-05T17:00:00+07:00',
      end_at: '2026-11-05T22:00:00+07:00',
      hourly_rate: 30000,
      headcount: 2,
    };
    expect(publishShiftSchema.parse(base)).toMatchObject({
      break_minutes: 0,
      min_rating: 0,
      is_urgent: false,
    });
    expect(() => publishShiftSchema.parse({ ...base, start_at: '2026-11-05 17:00' })).toThrow();
  });

  it('sửa quán: lat và lng phải đi cùng nhau', () => {
    expect(shopPatchSchema.safeParse({ lat: 21.03 }).success).toBe(false);
    expect(shopPatchSchema.safeParse({ lat: 21.03, lng: 105.78 }).success).toBe(true);
    expect(shopPatchSchema.safeParse({ name: 'Quán mới' }).success).toBe(true);
  });
});
