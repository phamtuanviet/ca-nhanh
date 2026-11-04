import { ApiError, handle } from '@/lib/api';
import { serverEnv } from '@/lib/env.server';
import { confirmTopupFromWebhook } from '@/lib/services/wallet';
import { webhookSchema } from '@/lib/validators';
import { verifyWebhook } from '@/lib/webhook';

/**
 * POST /api/v1/webhooks/payments: báo có từ cổng thanh toán hoặc bộ giả lập (05 §6).
 * Kiểm chữ ký HMAC trên body thô; trả 200 cả khi gửi lại hoặc không khớp mã để cổng không gửi lại mãi.
 */
export async function POST(req: Request) {
  return handle(req, async () => {
    const raw = await req.text();
    const valid = verifyWebhook(
      serverEnv.paymentWebhookSecret(),
      req.headers.get('x-cn-timestamp'),
      req.headers.get('x-cn-signature'),
      raw,
    );
    if (!valid) throw new ApiError('INVALID_SIGNATURE');
    const payload = webhookSchema.parse(JSON.parse(raw));
    if (payload.event !== 'payment.received') {
      return Response.json({ received: true, status: 'ignored' });
    }
    return Response.json(await confirmTopupFromWebhook(payload));
  });
}
