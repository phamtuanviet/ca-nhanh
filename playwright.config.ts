import { defineConfig, devices } from '@playwright/test';

// E2E chạy với server đã build (`npm run build && npm start`) và dữ liệu seed.
// Trên máy dùng Chrome hệ thống; CI cài Chromium bằng `npx playwright install --with-deps chromium`.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? {} : { channel: 'chrome' }) },
    },
  ],
});
