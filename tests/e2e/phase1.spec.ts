import {
  devices,
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { cancelShifts } from './cleanup';

// Phase 1 (07 §4.4): đăng ca → ca hiện realtime trên máy người làm → nhận ca → quán thấy chỗ lấp,
// và hai người tranh chỗ cuối. Mỗi lần chạy dùng một khung giờ ngẫu nhiên để không trùng ca cũ.

const GOC_PHO = { latitude: 21.0367, longitude: 105.7826, accuracy: 15 };
const created: string[] = [];

test.afterEach(async () => {
  await cancelShifts(created.splice(0));
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

/** Ngày giờ ngẫu nhiên trong 1–6 ngày tới (trang Khám phá mặc định lọc 7 ngày) */
function randomSlot() {
  const day = new Date(Date.now() + (1 + Math.floor(Math.random() * 6)) * 86_400_000);
  const date = day.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const hour = 6 + Math.floor(Math.random() * 13);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date,
    start: `${pad(hour)}:${pad(Math.floor(Math.random() * 4) * 15)}`,
    end: `${pad(hour + 2)}:00`,
  };
}

/** Chủ quán đăng ca 1 chỗ, trả về id ca */
async function postShift(page: Page): Promise<string> {
  const slot = randomSlot();
  await page.goto('/shop/shifts/new');
  await page.locator('#date').fill(slot.date);
  await page.locator('#start').fill(slot.start);
  await page.locator('#end').fill(slot.end);
  await page.getByRole('button', { name: 'Bớt một người' }).click();
  await expect(page.getByTestId('estimate-total')).toHaveText(/đ$/);
  const submit = page.getByRole('button', { name: 'Đăng ca', exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.waitForURL(/\/shop\/shifts\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Đang mở')).toBeVisible();
  const id = page.url().split('/').pop()!;
  created.push(id);
  return id;
}

test('đăng ca → ca hiện realtime trên máy người làm → nhận ca → quán thấy chỗ lấp', async ({
  browser,
}) => {
  const owner = await login(browser, 'owner', false);
  const worker = await login(browser, 'worker_b', true);

  // Người làm mở Khám phá ca trước, chờ kết nối Realtime
  await worker.page.goto('/worker');
  await expect(worker.page.locator('.cn-live__dot')).toBeVisible();

  const shiftId = await postShift(owner.page);

  // Ca mới tự hiện, không tải lại trang (mục tiêu ≤ 2 giây; cho phép 5 giây trên CI)
  const ticket = worker.page.locator(`a[href="/worker/shifts/${shiftId}"]`);
  await expect(ticket).toBeVisible({ timeout: 5_000 });
  await expect(ticket).toContainText('Mới');
  await expect(ticket).toContainText('Đã ký quỹ');

  await ticket.click();
  await worker.page.getByRole('button', { name: /^Nhận ca · / }).click();
  await expect(worker.page.getByText('Đã nhận ca · Xem Ca của tôi')).toBeVisible();

  // Trang ca của quán cập nhật chỗ qua Realtime
  await expect(owner.page.locator('.cn-seats__count').first()).toHaveText('1/1', {
    timeout: 5_000,
  });

  await owner.context.close();
  await worker.context.close();
});

test('hai người tranh chỗ cuối: đúng một người nhận được', async ({ browser }) => {
  const owner = await login(browser, 'owner', false);
  const minh = await login(browser, 'worker_a', true);
  const an = await login(browser, 'worker_b', true);
  const shiftId = await postShift(owner.page);

  await Promise.all([
    minh.page.goto(`/worker/shifts/${shiftId}`),
    an.page.goto(`/worker/shifts/${shiftId}`),
  ]);
  const buttons = [minh, an].map((w) => w.page.getByRole('button', { name: /^Nhận ca · / }));
  await Promise.all(buttons.map((b) => expect(b).toBeEnabled()));
  await Promise.all(buttons.map((b) => b.click()));

  const outcome = async (page: Page) => {
    const booked = page.getByText('Đã nhận ca · Xem Ca của tôi');
    const full = page.getByText('Ca vừa đủ người');
    await expect(booked.or(full).first()).toBeVisible();
    return (await booked.isVisible()) ? 'booked' : 'full';
  };
  const results = await Promise.all([outcome(minh.page), outcome(an.page)]);
  expect(results.sort()).toEqual(['booked', 'full']);

  await Promise.all([owner.context.close(), minh.context.close(), an.context.close()]);
});
