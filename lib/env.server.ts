import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name} (xem .env.example)`);
  return value;
}

export const serverEnv = {
  supabaseSecretKey: () => required('SUPABASE_SECRET_KEY'),
  qrSigningSecret: () => required('QR_SIGNING_SECRET'),
  paymentWebhookSecret: () => required('PAYMENT_WEBHOOK_SECRET'),
  demoPassword: () => required('DEMO_PASSWORD'),
};

/** Chế độ demo: hiện đăng nhập nhanh và công cụ demo. Giữ đồng bộ với cờ `demo_mode` trong CSDL. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}
