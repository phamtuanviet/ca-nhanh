// Sinh .env.local từ Supabase cục bộ (`npm run db:start` trước).
// Giữ nguyên các biến đã có trong .env.local, chỉ cập nhật URL và khóa Supabase.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.local');

let status;
try {
  const out = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  status = JSON.parse(out.slice(out.indexOf('{')));
} catch {
  console.error('Không đọc được trạng thái Supabase cục bộ. Hãy chạy `npm run db:start` trước.');
  process.exit(1);
}

const secret = () => randomBytes(32).toString('base64');
const defaults = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: status.SECRET_KEY,
  QR_SIGNING_SECRET: secret(),
  PAYMENT_WEBHOOK_SECRET: secret(),
  PLATFORM_BANK_BIN: '970436',
  PLATFORM_BANK_ACCOUNT: '0011000000000',
  PLATFORM_BANK_NAME: 'CA NHANH DEMO',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  DEMO_MODE: 'true',
  DEMO_PASSWORD: randomBytes(9).toString('base64url'),
};
// Các biến luôn lấy theo Supabase đang chạy
const fromSupabase = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
];

const current = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) current[m[1]] = m[2];
  }
}

const merged = { ...defaults, ...current };
for (const key of fromSupabase) merged[key] = defaults[key];

// Giá trị có khoảng trắng phải đặt trong nháy để `source .env.local` trong shell không hỏng
const quote = (value) => (/\s/.test(value) && !/^".*"$/.test(value) ? `"${value}"` : value);
const body = Object.entries(merged)
  .map(([k, v]) => `${k}=${quote(v)}`)
  .join('\n');
writeFileSync(
  envPath,
  `# Sinh bởi scripts/setup-env.mjs cho Supabase cục bộ. Không commit file này.\n${body}\n`,
);
console.log(`Đã ghi ${envPath} (${Object.keys(merged).length} biến).`);
