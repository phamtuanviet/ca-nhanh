import { describe, expect, it } from 'vitest';
import { distanceMeters, parsePoint, toEwkt } from '@/lib/geo';
import { vietQrImageUrl } from '@/lib/vietqr';
import { extractReference, signWebhook, verifyWebhook } from '@/lib/webhook';

describe('vietQrImageUrl', () => {
  it('dựng URL ảnh theo 05 §8', () => {
    const url = vietQrImageUrl(
      { bin: '970436', account_no: '0011000000000', account_name: 'CA NHANH DEMO' },
      2000000,
      'CN7F3A9C21',
    );
    expect(url).toBe(
      'https://img.vietqr.io/image/970436-0011000000000-compact2.png?amount=2000000&addInfo=CN7F3A9C21&accountName=CA+NHANH+DEMO',
    );
  });
});

describe('webhook thanh toán', () => {
  const secret = 'test-secret';
  const body = '{"event":"payment.received","amount":2000000,"description":"CN7F3A9C21 nap vi"}';
  const now = 1_793_755_000_000;
  const ts = String(now / 1000);

  it('chữ ký đúng → hợp lệ', () => {
    expect(verifyWebhook(secret, ts, signWebhook(secret, ts, body), body, now)).toBe(true);
  });

  it('sai chữ ký, sửa body hoặc thiếu header → từ chối', () => {
    const signature = signWebhook(secret, ts, body);
    expect(verifyWebhook('other', ts, signature, body, now)).toBe(false);
    expect(verifyWebhook(secret, ts, signature, body.replace('2000000', '9000000'), now)).toBe(
      false,
    );
    expect(verifyWebhook(secret, null, signature, body, now)).toBe(false);
    expect(verifyWebhook(secret, ts, null, body, now)).toBe(false);
  });

  it('lệch giờ quá 300 giây → từ chối', () => {
    const old = String(now / 1000 - 301);
    expect(verifyWebhook(secret, old, signWebhook(secret, old, body), body, now)).toBe(false);
    const ok = String(now / 1000 - 299);
    expect(verifyWebhook(secret, ok, signWebhook(secret, ok, body), body, now)).toBe(true);
  });

  it('tách mã tham chiếu kể cả khi ngân hàng chèn chữ', () => {
    expect(extractReference('CN7F3A9C21 nap vi Ca Nhanh')).toBe('CN7F3A9C21');
    expect(extractReference('MBVCB.123.cn7f3a9c21.CT tu 0123')).toBe('CN7F3A9C21');
    expect(extractReference('chuyen tien an trua')).toBeNull();
    expect(extractReference(null)).toBeNull();
  });
});

describe('geo', () => {
  it('giải mã EWKB của PostGIS', () => {
    // Cà phê Góc Phố, lấy từ PostgREST: select location from shops
    const point = parsePoint('0101000020E610000060764F1E16725A4061C3D32B65093540');
    expect(point?.lat).toBeCloseTo(21.0367, 6);
    expect(point?.lng).toBeCloseTo(105.7826, 6);
    expect(parsePoint('not-hex')).toBeNull();
    expect(parsePoint(null)).toBeNull();
  });

  it('EWKT đặt kinh độ trước', () => {
    expect(toEwkt({ lat: 21.0367, lng: 105.7826 })).toBe('SRID=4326;POINT(105.7826 21.0367)');
  });

  it('khoảng cách giữa hai quán gần đúng', () => {
    const d = distanceMeters({ lat: 21.0367, lng: 105.7826 }, { lat: 21.0331, lng: 105.7898 });
    expect(d).toBeGreaterThan(800);
    expect(d).toBeLessThan(900);
  });
});
