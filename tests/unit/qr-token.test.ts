import { describe, expect, it } from 'vitest';
import { issueCheckinToken, tokenFromScan, verifyCheckinToken } from '@/lib/qr-token';

const SECRET = 'qr-secret-for-tests';
const SHOP = '5a1d6c2e-8f43-4b7a-9c1e-2d3f4a5b6c7d';
const OTHER = '0f9e8d7c-6b5a-4c3d-9e2f-1a0b9c8d7e6f';
const T0 = 1_793_755_005_000; // giữa một cửa sổ 30 giây

describe('token QR chấm công (05 §7)', () => {
  it('cùng cửa sổ → hợp lệ, đúng quán', () => {
    const { token, window, expiresAt } = issueCheckinToken(SECRET, SHOP, T0);
    expect(token).toMatch(/^v1\.[0-9a-f-]{36}\.\d+\.[A-Za-z0-9_-]{22}$/);
    expect(verifyCheckinToken(SECRET, token, T0)).toEqual({ ok: true, shopId: SHOP, window });
    expect(expiresAt.getTime()).toBe((window + 1) * 30_000);
  });

  it('cửa sổ liền trước (mã vừa đổi) → vẫn hợp lệ', () => {
    const { token } = issueCheckinToken(SECRET, SHOP, T0 - 30_000);
    expect(verifyCheckinToken(SECRET, token, T0).ok).toBe(true);
  });

  it('mã từ 2 phút trước (ảnh chụp màn hình) → QR_EXPIRED', () => {
    const { token } = issueCheckinToken(SECRET, SHOP, T0 - 120_000);
    expect(verifyCheckinToken(SECRET, token, T0)).toMatchObject({
      ok: false,
      code: 'QR_EXPIRED',
      shopId: SHOP,
    });
  });

  it('sửa shop id hoặc ký bằng khóa khác → QR_INVALID', () => {
    const { token } = issueCheckinToken(SECRET, SHOP, T0);
    expect(verifyCheckinToken(SECRET, token.replace(SHOP, OTHER), T0)).toEqual({
      ok: false,
      code: 'QR_INVALID',
    });
    expect(verifyCheckinToken('khoa-khac', token, T0)).toEqual({ ok: false, code: 'QR_INVALID' });
    expect(verifyCheckinToken(SECRET, 'v1.abc.1.x', T0)).toEqual({ ok: false, code: 'QR_INVALID' });
  });

  it('đọc token từ URL deep link hoặc chuỗi token', () => {
    const { token } = issueCheckinToken(SECRET, SHOP, T0);
    expect(tokenFromScan(`https://ca-nhanh.vercel.app/c/${token}`)).toBe(token);
    expect(tokenFromScan(`http://localhost:3000/c/${token}?utm=zalo`)).toBe(token);
    expect(tokenFromScan(token)).toBe(token);
    expect(tokenFromScan('https://example.com/khong-phai-ma')).toBeNull();
  });
});
