import { createHmac } from 'node:crypto';
import {
  devices,
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { config } from 'dotenv';
import { cancelShifts, forgivePenalties } from './cleanup';

config({ path: process.env.SEED_ENV_FILE ?? '.env.local', quiet: true });

// Phase 2 (07 §5, P2-11): đoạn 1:40–3:10 của kịch bản demo. Kiosk → QR cũ bị từ chối → quét từ xa bị
// từ chối → check-in qua deep link → tua tới giờ kết thúc → check-out → quán duyệt → tiền vào ví → rút.
// Cần DEMO_MODE=true và cờ demo_mode.enabled (seed bật sẵn) để dùng "Tua tới giờ bắt đầu/kết thúc".

const GOC_PHO = { latitude: 21.0367, longitude: 105.7826, accuracy: 15 };
const FAR = { latitude: 21.0502, longitude: 105.7826, accuracy: 15 }; // cách quán ~1,5 km
const createdShifts: string[] = [];
const penalised: string[] = [];

test.afterEach(async () => {
  await cancelShifts(createdShifts.splice(0));
  await forgivePenalties(penalised.splice(0));
});

async function login(
  browser: Browser,
  account: 'owner' | 'worker_a' | 'worker_b',
  mobile: boolean,
) {
  const context: BrowserContext = await browser.newContext(
    mobile
      ? { ...devices['Pixel 7'], geolocation: GOC_PHO, permissions: ['geolocation'] }
      : { viewport: { width: 1366, height: 900 } },
  );
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator(`button[value="${account}"]`).click();
  await page.waitForURL(account === 'owner' ? '**/shop' : '**/worker');
  return { context, page };
}

/** Mốc giờ tròn phút, cách hiện tại `minutes` phút */
function at(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  d.setSeconds(0, 0);
  return d.toISOString();
}

/** Ký mã QR như lib/qr-token.ts, để tạo "ảnh chụp QR từ 2 phút trước" */
function signToken(shopId: string, window: number) {
  const payload = `v1.${shopId}.${window}`;
  const sig = createHmac('sha256', process.env.QR_SIGNING_SECRET!)
    .update(payload)
    .digest('base64url')
    .slice(0, 22);
  return `${payload}.${sig}`;
}

async function goGocPho(owner: Page) {
  const res = await owner.request.get('/api/v1/shops/mine');
  expect(res.ok()).toBeTruthy();
  const shops = (await res.json()).data as { id: string; name: string }[];
  const shop = shops.find((s) => s.name === 'Cà phê Góc Phố');
  expect(shop, 'seed có quán Cà phê Góc Phố').toBeTruthy();
  return shop!;
}

/** Chủ quán đăng ca 1 chỗ, 30.000đ/giờ qua API (đăng ca bằng form đã có E2E ở Phase 1) */
async function postShift(
  owner: Page,
  shopId: string,
  title: string,
  startIn: number,
  hours: number,
) {
  const res = await owner.request.post('/api/v1/shifts', {
    data: {
      shop_id: shopId,
      position_code: 'barista',
      title,
      start_at: at(startIn),
      end_at: at(startIn + hours * 60),
      hourly_rate: 30000,
      headcount: 1,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const id = (await res.json()).data.id as string;
  createdShifts.push(id);
  return id;
}

async function scan(page: Page, token: string) {
  await page.goto(`/c/${token}`);
  const title = page.getByTestId('attendance-title');
  await expect(title).toBeVisible();
  await expect(title).not.toHaveText(/^Đang/, { timeout: 20_000 });
  return title;
}

const kioskToken = async (kiosk: Page) =>
  (await kiosk.getByTestId('kiosk-qr').getAttribute('data-token'))!;

const balanceOf = async (page: Page) =>
  Number(
    ((await page.getByTestId('wallet-balance').getAttribute('aria-label')) ?? '').replace(
      /\D/g,
      '',
    ),
  );

test('kiosk QR → check-in → tua giờ → check-out → duyệt → ví → rút tiền', async ({ browser }) => {
  test.setTimeout(150_000);
  const tag = Math.random().toString(36).slice(2, 6).toUpperCase();
  const title = `Pha chế E2E ${tag}`;
  const owner = await login(browser, 'owner', false);
  const minh = await login(browser, 'worker_a', true);
  const shop = await goGocPho(owner.page);

  // Ca 4 giờ, bắt đầu sau 40 phút; Minh nhận ca trên giao diện
  const shiftId = await postShift(owner.page, shop.id, title, 40, 4);
  await minh.page.goto(`/worker/shifts/${shiftId}`);
  await minh.page.getByRole('button', { name: /^Nhận ca · / }).click();
  await expect(minh.page.getByText('Đã nhận ca · Xem Ca của tôi')).toBeVisible();

  // Kiosk của quán: QR thật dạng SVG
  const kiosk = await owner.context.newPage();
  await kiosk.goto(`/shop/kiosk/${shop.id}`);
  await expect(kiosk.getByTestId('kiosk-qr').locator('svg')).toBeVisible();
  expect(await kioskToken(kiosk)).toMatch(
    new RegExp(`^v1\\.${shop.id}\\.\\d+\\.[A-Za-z0-9_-]{22}$`),
  );

  // 1:40 Tua tới giờ bắt đầu
  await owner.page.goto(`/shop/shifts/${shiftId}`);
  await owner.page.getByRole('button', { name: 'Tua tới giờ bắt đầu' }).click();
  await expect(owner.page.getByText('Đã tua tới giờ bắt đầu')).toBeVisible();

  // QR chụp từ 2 phút trước → hết hạn (Gherkin 6.5 "QR cũ")
  const window = Number((await kioskToken(kiosk)).split('.')[2]);
  await expect(await scan(minh.page, signToken(shop.id, window - 4))).toHaveText(
    'Mã QR đã hết hạn, hãy quét mã mới trên màn hình quán',
  );

  // Quét từ xa 1,5 km → ngoài khu vực quán (Gherkin 6.5 "Dùng ảnh chụp QR ở xa")
  await minh.context.setGeolocation(FAR);
  await expect(await scan(minh.page, await kioskToken(kiosk))).toContainText(
    'Bạn đang ở ngoài khu vực quán',
  );
  await minh.context.setGeolocation(GOC_PHO);

  // 2:10 Check-in hợp lệ; trang ca của quán hiện "Đã đến" qua Realtime
  await expect(await scan(minh.page, await kioskToken(kiosk))).toHaveText(
    /^Check-in lúc \d\d:\d\d · cách quán \d+ m$/,
  );
  await expect(owner.page.getByTestId('shift-booking').first()).toContainText('Đã đến', {
    timeout: 5_000,
  });

  // 2:30 Tua tới giờ kết thúc, check-out: 240 phút = 120.000đ (Gherkin 6.11)
  await owner.page.getByRole('button', { name: 'Tua tới giờ kết thúc' }).click();
  await expect(owner.page.getByText('Đã tua tới giờ kết thúc')).toBeVisible();
  await expect(await scan(minh.page, await kioskToken(kiosk))).toHaveText(/^Check-out lúc/);
  await expect(minh.page.locator('main')).toContainText('240 phút');
  await expect(minh.page.locator('main')).toContainText('120.000đ');

  // Ví của Minh mở sẵn, chờ Realtime
  await minh.page.goto('/worker/wallet');
  await expect(minh.page.locator('.cn-live__dot')).toBeVisible();
  await expect(minh.page.getByTestId('wallet-balance')).toHaveAttribute('aria-label', /đ$/);
  const before = await balanceOf(minh.page);

  // Quán duyệt: điều chỉnh không lý do bị chặn (Gherkin 6.7 kịch bản 2), rồi duyệt đúng giờ
  await owner.page.goto('/shop/timesheets');
  const row = owner.page.getByTestId('timesheet-row').filter({ hasText: title });
  await expect(row).toContainText('240 phút');
  await row.getByRole('button', { name: 'Điều chỉnh' }).click();
  await owner.page.locator('#adjust-minutes').fill('320');
  await owner.page.getByRole('button', { name: 'Duyệt giờ công đã điều chỉnh' }).click();
  await expect(owner.page.getByText('Nhập lý do điều chỉnh (tối thiểu 5 ký tự)')).toBeVisible();
  await owner.page.keyboard.press('Escape');
  await row.getByRole('button', { name: 'Duyệt · 120.000đ' }).click();
  await expect(owner.page.getByText(/Đã duyệt · 120\.000đ vào ví/)).toBeVisible();

  // Tiền vào ví Minh ngay, không tải lại (Gherkin 6.7 kịch bản 1)
  await expect.poll(() => balanceOf(minh.page), { timeout: 8_000 }).toBe(before + 120_000);
  await expect(minh.page.getByText('+120.000đ đã vào ví')).toBeVisible();

  // 3:10 Rút về ngân hàng: "Đang xử lý" rồi "Thành công" kèm biên nhận (Gherkin 6.8)
  await minh.page.getByRole('button', { name: 'Rút về ngân hàng' }).click();
  await minh.page.getByRole('button', { name: /^Rút \d/ }).click();
  await expect(minh.page.getByText('Đang xử lý', { exact: true })).toBeVisible();
  await expect(minh.page.getByText('Thành công', { exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(minh.page.getByTestId('withdraw-reference')).toHaveText(/^CNW[0-9A-F]{8}$/);
  await minh.page.getByRole('button', { name: 'Xong' }).click();
  await expect.poll(() => balanceOf(minh.page)).toBe(0);

  await Promise.all([owner.context.close(), minh.context.close()]);
});

test('người làm hủy sát giờ: cảnh báo 2 điểm phạt, lịch sử ghi nhận', async ({ browser }) => {
  const tag = Math.random().toString(36).slice(2, 6).toUpperCase();
  const title = `Ca hủy E2E ${tag}`;
  const owner = await login(browser, 'owner', false);
  const an = await login(browser, 'worker_b', true);
  const shop = await goGocPho(owner.page);

  // Ca bắt đầu sau khoảng 3 giờ (< 6 giờ → 2 điểm phạt, BR-09)
  const shiftId = await postShift(owner.page, shop.id, title, 185, 2);
  const booked = await an.page.request.post(`/api/v1/shifts/${shiftId}/bookings`);
  expect(booked.status(), await booked.text()).toBe(201);
  penalised.push((await booked.json()).data.id);

  await an.page.goto('/worker/bookings');
  const card = an.page.getByTestId('my-booking').filter({ hasText: title });
  await card.getByRole('button', { name: 'Hủy ca' }).click();
  await expect(an.page.getByTestId('cancel-preview')).toContainText(
    'Hủy bây giờ sẽ bị cộng 2 điểm phạt',
  );
  await an.page.getByRole('button', { name: 'Xác nhận hủy' }).click();
  await expect(
    an.page.locator('[data-sonner-toast]').getByText('Đã hủy', { exact: true }),
  ).toBeVisible();

  await an.page.goto('/worker/bookings?tab=history');
  await expect(an.page.getByTestId('my-booking').filter({ hasText: title })).toContainText(
    'Bạn đã hủy · 2 điểm phạt',
  );

  // Quán thấy chỗ mở lại
  await owner.page.goto(`/shop/shifts/${shiftId}`);
  await expect(owner.page.getByText('Đang mở', { exact: true })).toBeVisible();

  await Promise.all([owner.context.close(), an.context.close()]);
});
