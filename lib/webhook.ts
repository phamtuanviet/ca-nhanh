// Webhook thanh toán (05 §6): chữ ký HMAC-SHA256 trên "<timestamp>.<raw body>", lệch giờ tối đa 300 giây.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const WEBHOOK_MAX_SKEW_SECONDS = 300;

export function signWebhook(secret: string, timestamp: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

export function verifyWebhook(
  secret: string,
  timestamp: string | null,
  signature: string | null,
  rawBody: string,
  nowMs = Date.now(),
): boolean {
  if (!timestamp || !signature || !/^\d{9,11}$/.test(timestamp)) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > WEBHOOK_MAX_SKEW_SECONDS) return false;
  const expected = Buffer.from(signWebhook(secret, timestamp, rawBody));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Tách mã tham chiếu nạp ví (CN + 8 ký tự hex) khỏi nội dung chuyển khoản, ngân hàng có thể chèn thêm chữ */
export function extractReference(description: string | null | undefined): string | null {
  return description?.toUpperCase().match(/CN[0-9A-F]{8}/)?.[0] ?? null;
}
