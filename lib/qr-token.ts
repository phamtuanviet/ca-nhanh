// Token QR chấm công xoay vòng (05 §7): "v1.<shop_id>.<window>.<sig>"
// window = floor(giây unix / 30); sig = base64url(HMAC_SHA256(secret, "v1.<shop_id>.<window>")) lấy 22 ký tự đầu.
// Hợp lệ khi chữ ký đúng và |window hiện tại − window| ≤ 1 (mã sống tối đa khoảng 60 giây).
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ROTATION_SECONDS = 30;

export type TokenCheck =
  | { ok: true; shopId: string; window: number }
  | { ok: false; code: 'QR_INVALID' | 'QR_EXPIRED'; shopId?: string; window?: number };

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 22);
}

export function currentWindow(nowMs = Date.now(), rotation = ROTATION_SECONDS): number {
  return Math.floor(nowMs / 1000 / rotation);
}

/** Mã cho cửa sổ hiện tại và thời điểm nó hết hiệu lực trên kiosk */
export function issueCheckinToken(
  secret: string,
  shopId: string,
  nowMs = Date.now(),
  rotation = ROTATION_SECONDS,
) {
  const window = currentWindow(nowMs, rotation);
  const payload = `v1.${shopId}.${window}`;
  return {
    token: `${payload}.${sign(secret, payload)}`,
    window,
    expiresAt: new Date((window + 1) * rotation * 1000),
  };
}

export function verifyCheckinToken(
  secret: string,
  token: string,
  nowMs = Date.now(),
  rotation = ROTATION_SECONDS,
): TokenCheck {
  const m = /^v1\.([0-9a-f-]{36})\.(\d{1,12})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return { ok: false, code: 'QR_INVALID' };
  const [, shopId, w, sig] = m as unknown as [string, string, string, string];
  const expected = sign(secret, `v1.${shopId}.${w}`);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return { ok: false, code: 'QR_INVALID' };
  const window = Number(w);
  if (Math.abs(currentWindow(nowMs, rotation) - window) > 1) {
    return { ok: false, code: 'QR_EXPIRED', shopId, window };
  }
  return { ok: true, shopId, window };
}

/** Lấy token từ nội dung QR: URL ".../c/<token>" (quét bằng camera hệ thống) hoặc chính token */
export function tokenFromScan(text: string): string | null {
  const trimmed = text.trim();
  const fromUrl = /\/c\/(v1\.[0-9a-f-]{36}\.\d{1,12}\.[A-Za-z0-9_-]{22})(?:[/?#]|$)/.exec(trimmed);
  if (fromUrl) return fromUrl[1]!;
  return /^v1\.[0-9a-f-]{36}\.\d{1,12}\.[A-Za-z0-9_-]{22}$/.test(trimmed) ? trimmed : null;
}
