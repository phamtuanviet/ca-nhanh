import { createHmac } from 'node:crypto';
import {
  devices,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { config } from 'dotenv';

config({ path: process.env.SEED_ENV_FILE ?? '.env.local', quiet: true });

export const GOC_PHO = { latitude: 21.0367, longitude: 105.7826, accuracy: 15 };
export const FAR = { latitude: 21.0502, longitude: 105.7826, accuracy: 15 }; // cách quán ~1,5 km

export type DemoAccount = 'owner' | 'worker_a' | 'worker_b' | 'admin';
const HOME: Record<DemoAccount, string> = {
  owner: '**/shop',
  worker_a: '**/worker',
  worker_b: '**/worker',
  admin: '**/admin',
};

/** Đăng nhập nhanh tài khoản demo trong một context riêng (điện thoại hoặc laptop) */
export async function login(browser: Browser, account: DemoAccount, mobile: boolean) {
  const context: BrowserContext = await browser.newContext(
    mobile
      ? { ...devices['Pixel 7'], geolocation: GOC_PHO, permissions: ['geolocation'] }
      : { viewport: { width: 1366, height: 900 } },
  );
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator(`button[value="${account}"]`).click();
  await page.waitForURL(HOME[account]);
  return { context, page };
}

/** Mốc giờ tròn phút, cách hiện tại `minutes` phút */
export function at(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  d.setSeconds(0, 0);
  return d.toISOString();
}

/** Ký mã QR như lib/qr-token.ts, để tạo "ảnh chụp QR từ 2 phút trước" */
export function signToken(shopId: string, window: number) {
  const payload = `v1.${shopId}.${window}`;
  const sig = createHmac('sha256', process.env.QR_SIGNING_SECRET!)
    .update(payload)
    .digest('base64url')
    .slice(0, 22);
  return `${payload}.${sig}`;
}

export async function shopByName(owner: Page, name = 'Cà phê Góc Phố') {
  const res = await owner.request.get('/api/v1/shops/mine');
  expect(res.ok()).toBeTruthy();
  const shops = (await res.json()).data as { id: string; name: string }[];
  const shop = shops.find((s) => s.name === name);
  expect(shop, `seed có quán ${name}`).toBeTruthy();
  return shop!;
}

/** Chủ quán đăng ca 1 chỗ, 30.000đ/giờ qua API */
export async function postShift(
  owner: Page,
  shopId: string,
  title: string,
  startIn: number,
  hours: number,
  created: string[],
  headcount = 1,
) {
  const res = await owner.request.post('/api/v1/shifts', {
    data: {
      shop_id: shopId,
      position_code: 'barista',
      title,
      start_at: at(startIn),
      end_at: at(startIn + hours * 60),
      hourly_rate: 30000,
      headcount,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const id = (await res.json()).data.id as string;
  created.push(id);
  return id;
}

/** Mở deep link /c/<mã> và chờ kết quả chấm công */
export async function scan(page: Page, token: string) {
  await page.goto(`/c/${token}`);
  const title = page.getByTestId('attendance-title');
  await expect(title).toBeVisible();
  await expect(title).not.toHaveText(/^Đang/, { timeout: 20_000 });
  return title;
}

export const kioskToken = async (kiosk: Page) =>
  (await kiosk.getByTestId('kiosk-qr').getAttribute('data-token'))!;

export const balanceOf = async (page: Page) =>
  Number(
    ((await page.getByTestId('wallet-balance').getAttribute('aria-label')) ?? '').replace(
      /\D/g,
      '',
    ),
  );

/** Token API của một tài khoản demo không có nút đăng nhập nhanh (ví dụ binh@demo.vn) */
export async function bearer(request: APIRequestContext, email: string) {
  const res = await request.post(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      data: { email, password: process.env.DEMO_PASSWORD },
    },
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  return { Authorization: `Bearer ${(await res.json()).access_token}` };
}
