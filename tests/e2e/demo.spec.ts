import { expect, test, type Page } from '@playwright/test';
import { DEMO_ACCOUNTS } from '../../lib/demo';
import { cancelShifts, forgivePenalties } from './cleanup';
import {
  balanceOf,
  bearer,
  FAR,
  GOC_PHO,
  kioskToken,
  login,
  postShift,
  scan,
  shopByName,
  signToken,
} from './helpers';

// P3-11: trọn kịch bản demo 5 phút (02 §8) trên server production, mỗi thiết bị một browser context:
// laptop chị Lan (kèm kiosk), điện thoại Minh và An, laptop admin. Chạy lại được nhiều lần liên tiếp.

const createdShifts: string[] = [];
const penalised: string[] = [];
let leadToRestore: number | null = null;

test.afterEach(async ({ request }) => {
  // Request riêng với token admin: vẫn trả được cấu hình khi test hỏng hay context đã đóng
  if (leadToRestore !== null) {
    await request.patch('/api/v1/admin/settings', {
      headers: await bearer(request, 'admin@demo.vn'),
      data: { min_lead_minutes: leadToRestore },
    });
    leadToRestore = null;
  }
  await cancelShifts(createdShifts.splice(0));
  await forgivePenalties(penalised.splice(0));
});

test('kịch bản demo 5 phút: đăng ca → tranh chỗ → QR → tiền → đánh giá → KPI → tạm khóa', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const tag = Math.random().toString(36).slice(2, 6).toUpperCase();
  const title = `Pha chế ca tối ${tag}`;
  const lan = await login(browser, 'owner', false);
  const minh = await login(browser, 'worker_a', true);
  const an = await login(browser, 'worker_b', true);
  const admin = await login(browser, 'admin', false);
  const shop = await shopByName(lan.page);

  // Chuẩn bị (02 §8 bước 2): đăng ca sát giờ 2 phút
  const settings = await admin.page.request.get('/api/v1/admin/settings');
  const lead = ((await settings.json()).data as { key: string; value: number }[]).find(
    (s) => s.key === 'min_lead_minutes',
  )!.value;
  expect(
    (
      await admin.page.request.patch('/api/v1/admin/settings', { data: { min_lead_minutes: 2 } })
    ).ok(),
  ).toBeTruthy();
  leadToRestore = lead;

  // 0:50 Hai điện thoại mở Khám phá ca, chờ Realtime
  await Promise.all([minh.page.goto('/worker'), an.page.goto('/worker')]);
  await Promise.all([
    expect(minh.page.locator('.cn-live__dot')).toBeVisible(),
    expect(an.page.locator('.cn-live__dot')).toBeVisible(),
  ]);

  // 0:20 Chị Lan đăng ca bắt đầu sau 10 phút, 4 giờ, 30.000đ/giờ, 1 người: tạm giữ 144.000đ
  const shiftId = await postShift(lan.page, shop.id, title, 10, 4, createdShifts);
  await lan.page.goto(`/shop/shifts/${shiftId}`);
  await expect(lan.page.getByText('Đã ký quỹ 144.000đ')).toBeVisible();

  // Ca hiện trên cả hai máy với nhãn Mới · Đã ký quỹ, không tải lại
  const ticket = (p: Page) => p.locator(`a[href="/worker/shifts/${shiftId}"]`);
  await Promise.all([
    expect(ticket(minh.page)).toBeVisible({ timeout: 5_000 }),
    expect(ticket(an.page)).toBeVisible({ timeout: 5_000 }),
  ]);
  await expect(ticket(minh.page)).toContainText('Mới');
  await expect(ticket(minh.page)).toContainText('Đã ký quỹ');

  // 1:10 Minh và An cùng bấm "Nhận ca": đúng một người thắng
  await Promise.all([ticket(minh.page).click(), ticket(an.page).click()]);
  const book = (p: Page) => p.getByRole('button', { name: /^Nhận ca · / });
  await Promise.all([expect(book(minh.page)).toBeEnabled(), expect(book(an.page)).toBeEnabled()]);
  await Promise.all([book(minh.page).click(), book(an.page).click()]);
  const outcome = async (p: Page) => {
    const booked = p.getByText('Đã nhận ca · Xem Ca của tôi');
    await expect(booked.or(p.getByText('Ca vừa đủ người')).first()).toBeVisible();
    return (await booked.isVisible()) ? 'booked' : 'full';
  };
  const [om, oa] = await Promise.all([outcome(minh.page), outcome(an.page)]);
  expect([om, oa].sort()).toEqual(['booked', 'full']);
  const winner = om === 'booked' ? minh : an;
  const winnerName = om === 'booked' ? 'Minh' : 'An';
  await expect(lan.page.locator('.cn-seats__count').first()).toHaveText('1/1', { timeout: 5_000 });

  // Kiosk trên tablet của quán
  const kiosk = await lan.context.newPage();
  await kiosk.goto(`/shop/kiosk/${shop.id}`);
  await expect(kiosk.getByTestId('kiosk-qr').locator('svg')).toBeVisible();

  // 1:40 Tua tới giờ bắt đầu; ảnh chụp QR 2 phút trước bị từ chối, quét từ xa cũng bị từ chối
  await lan.page.getByRole('button', { name: 'Tua tới giờ bắt đầu' }).click();
  await expect(lan.page.getByText('Đã tua tới giờ bắt đầu')).toBeVisible();
  const window = Number((await kioskToken(kiosk)).split('.')[2]);
  await expect(await scan(winner.page, signToken(shop.id, window - 4))).toHaveText(
    'Mã QR đã hết hạn, hãy quét mã mới trên màn hình quán',
  );
  await winner.context.setGeolocation(FAR);
  await expect(await scan(winner.page, await kioskToken(kiosk))).toContainText(
    'Bạn đang ở ngoài khu vực quán',
  );
  await winner.context.setGeolocation(GOC_PHO);

  // 2:10 Quét QR trực tiếp: check-in, quán thấy "Đã đến" ngay
  await expect(await scan(winner.page, await kioskToken(kiosk))).toHaveText(
    /^Check-in lúc \d\d:\d\d · cách quán \d+ m$/,
  );
  await expect(lan.page.getByTestId('shift-booking').first()).toContainText('Đã đến', {
    timeout: 5_000,
  });

  // 2:30 Tua tới giờ kết thúc, check-out 240 phút = 120.000đ, chị Lan duyệt
  await lan.page.getByRole('button', { name: 'Tua tới giờ kết thúc' }).click();
  await expect(lan.page.getByText('Đã tua tới giờ kết thúc')).toBeVisible();
  await expect(await scan(winner.page, await kioskToken(kiosk))).toHaveText(/^Check-out lúc/);
  await expect(winner.page.locator('main')).toContainText('120.000đ');

  await winner.page.goto('/worker/wallet');
  await expect(winner.page.locator('.cn-live__dot')).toBeVisible();
  await expect(winner.page.getByTestId('wallet-balance')).toHaveAttribute('aria-label', /đ$/);
  const before = await balanceOf(winner.page);

  await lan.page.goto('/shop/timesheets');
  const row = lan.page.getByTestId('timesheet-row').filter({ hasText: title });
  await row.getByRole('button', { name: 'Duyệt · 120.000đ' }).click();
  await expect(
    lan.page.getByText(new RegExp(`Đã duyệt · 120\\.000đ vào ví ${winnerName}`)),
  ).toBeVisible();
  await expect.poll(() => balanceOf(winner.page), { timeout: 8_000 }).toBe(before + 120_000);

  // 3:30 (quán) Hộp đánh giá mở ngay sau khi duyệt: 5★, Đúng giờ, Muốn mời lại → người quen
  const review = lan.page.getByRole('dialog');
  await expect(review.getByText(`Đánh giá ${winnerName}`)).toBeVisible();
  await review.getByRole('radio', { name: '5 sao' }).click();
  await review.getByRole('button', { name: 'Đúng giờ' }).click();
  await review.getByRole('button', { name: 'Muốn mời lại' }).click();
  await review.getByRole('button', { name: 'Gửi đánh giá' }).click();
  await expect(lan.page.getByText('đã vào danh sách người quen của quán')).toBeVisible();

  // 3:10 Rút về ngân hàng → biên nhận
  await winner.page.getByRole('button', { name: 'Rút về ngân hàng' }).click();
  await winner.page.getByRole('button', { name: /^Rút \d/ }).click();
  await expect(winner.page.getByText('Thành công', { exact: true })).toBeVisible({
    timeout: 8_000,
  });
  await expect(winner.page.getByTestId('withdraw-reference')).toHaveText(/^CNW[0-9A-F]{8}$/);
  await winner.page.getByRole('button', { name: 'Xong' }).click();

  // 3:30 (người làm) đánh giá quán từ Lịch sử
  await winner.page.goto('/worker/bookings?tab=history');
  const card = winner.page.getByTestId('my-booking').filter({ hasText: title });
  await card.getByRole('button', { name: 'Đánh giá quán' }).click();
  const back = winner.page.getByRole('dialog');
  await back.getByRole('radio', { name: '5 sao' }).click();
  await back.getByRole('button', { name: 'Trả tiền đúng hẹn' }).click();
  await back.getByRole('button', { name: 'Gửi đánh giá' }).click();
  await expect(winner.page.getByText('Đã gửi đánh giá 5★')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Đánh giá quán' })).toHaveCount(0);

  // Người thắng giờ nằm trong danh sách người quen của quán
  await lan.page.goto('/shop/workers?list=favorite');
  await expect(lan.page.getByTestId('shop-workers')).toContainText(
    om === 'booked' ? DEMO_ACCOUNTS.worker_a.fullName : DEMO_ACCOUNTS.worker_b.fullName,
  );

  // 3:50 Dashboard KPI 30 ngày: 8 thẻ số, biểu đồ theo ngày có 30 điểm (Gherkin 6.10)
  await admin.page.goto('/admin');
  await expect(admin.page.getByTestId('kpi-tiles').locator('section')).toHaveCount(8);
  await expect(admin.page.getByRole('button', { name: '30 ngày qua' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const gmvChart = admin.page.locator('figure').filter({ hasText: 'GMV theo ngày' });
  await gmvChart.getByRole('button', { name: 'Bảng' }).click();
  await expect(gmvChart.locator('tbody tr')).toHaveCount(30);

  // 4:20 Người làm bỏ ca thì sao: Bình vắng mặt → tạm khóa; admin mở hồ sơ thấy điểm phạt
  const binh = await bearer(admin.page.request, 'binh@demo.vn');
  const binhId = (await (await admin.page.request.get('/api/v1/me', { headers: binh })).json()).data
    .id;
  await admin.page.request.patch(`/api/v1/admin/users/${binhId}`, {
    data: { clear_suspension: true },
  });
  const noShow = await postShift(lan.page, shop.id, `Ca vắng mặt ${tag}`, 40, 4, createdShifts);
  const booked = await admin.page.request.post(`/api/v1/shifts/${noShow}/bookings`, {
    headers: binh,
  });
  expect(booked.status(), await booked.text()).toBe(201);
  penalised.push((await booked.json()).data.id);
  await lan.page.request.post('/api/v1/admin/demo/fast-forward', {
    data: { shift_id: noShow, to: 'end' },
  });
  expect(
    (await admin.page.request.post('/api/v1/admin/demo/tick', { data: {} })).ok(),
  ).toBeTruthy();
  await admin.page.goto('/admin/users?role=worker&q=binh');
  await admin.page.getByTestId('admin-users').getByRole('link', { name: 'Trần Ngọc Bình' }).click();
  await expect(admin.page.getByText(/Đang tạm khóa nhận ca đến/)).toBeVisible();
  await expect(admin.page.getByLabel('Lịch sử điểm phạt')).toContainText('Vắng mặt');

  await Promise.all([
    lan.context.close(),
    minh.context.close(),
    an.context.close(),
    admin.context.close(),
  ]);
});
