#!/usr/bin/env node
/**
 * Đóng gói PWA thành app Android (Trusted Web Activity) bằng Bubblewrap của Google.
 *
 *   APP_HOST=ca-nhanh.vercel.app npm run android:build
 *
 * Biến môi trường:
 *   APP_HOST          tên miền HTTPS đã deploy (bắt buộc): app mở https://APP_HOST/worker
 *   ANDROID_PACKAGE   mã gói, mặc định vn.canhanh.app (đổi rồi thì là app khác trên máy và trên Play)
 *   ASSET_BASE        nơi lấy icon lúc build, mặc định https://APP_HOST (thử trước khi deploy:
 *                     ASSET_BASE=http://localhost:3000 với server local đang chạy)
 *   APP_VERSION       tên phiên bản hiện cho người dùng, mặc định version trong package.json
 *
 * Lần đầu chạy, script tạo khóa ký app android/ca-nhanh-release.keystore và mật khẩu ở
 * android/keystore.env (cả hai bị .gitignore bỏ qua). SAO LƯU HAI FILE NÀY: mất khóa thì không cập nhật
 * được app đã cài hoặc đã lên Google Play. Cần JDK 17 và Android SDK theo ~/.bubblewrap/config.json
 * (xem docs/07 §11).
 *
 * Kết quả: android/dist/ca-nhanh-<phiên bản>.apk (cài trực tiếp) và .aab (tải lên Google Play), cùng
 * dấu vân tay SHA-256 để khai báo ANDROID_CERT_SHA256 cho /.well-known/assetlinks.json.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'android');
const host = process.env.APP_HOST?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
if (!host) {
  console.error('Thiếu APP_HOST, ví dụ: APP_HOST=ca-nhanh.vercel.app npm run android:build');
  process.exit(1);
}
const packageId = process.env.ANDROID_PACKAGE ?? 'vn.canhanh.app';
const assetBase = (process.env.ASSET_BASE ?? `https://${host}`).replace(/\/$/, '');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const appVersion = process.env.APP_VERSION ?? pkg.version;
const webManifest = JSON.parse(
  readFileSync(join(root, 'design', 'assets', 'brand', 'manifest.webmanifest'), 'utf8'),
);
mkdirSync(join(dir, 'dist'), { recursive: true });

// ---- Khóa ký app (tạo một lần, giữ nguyên cho mọi bản cập nhật)
const keystore = join(dir, 'ca-nhanh-release.keystore');
const keyEnv = join(dir, 'keystore.env');
const alias = 'canhanh';
if (!existsSync(keystore)) {
  const password = randomBytes(18).toString('base64url');
  execFileSync(
    'keytool',
    [
      '-genkeypair',
      '-keystore',
      keystore,
      '-alias',
      alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-storepass',
      password,
      '-keypass',
      password,
      '-dname',
      'CN=Ca Nhanh, OU=Ca Nhanh, O=Ca Nhanh, L=Ha Noi, C=VN',
    ],
    { stdio: 'ignore' },
  );
  writeFileSync(
    keyEnv,
    `BUBBLEWRAP_KEYSTORE_PASSWORD=${password}\nBUBBLEWRAP_KEY_PASSWORD=${password}\n`,
    {
      mode: 0o600,
    },
  );
  console.log(`Đã tạo khóa ký app: ${keystore}\nMật khẩu ở ${keyEnv}. Hãy sao lưu cả hai file.`);
}
const secrets = Object.fromEntries(
  readFileSync(keyEnv, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);

// ---- twa-manifest.json: lấy màu, tên, lối tắt từ manifest web; mã phiên bản tăng theo mỗi lần build
const manifestFile = join(dir, 'twa-manifest.json');
const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : null;
const versionCode = (previous?.appVersionCode ?? 0) + 1;
const twa = {
  packageId,
  host,
  name: webManifest.name,
  launcherName: webManifest.short_name,
  display: 'standalone',
  themeColor: webManifest.theme_color,
  themeColorDark: '#0A1121',
  navigationColor: '#FFFFFF',
  navigationColorDark: '#0A1121',
  navigationDividerColor: '#D4D9E4',
  navigationDividerColorDark: '#3C4454',
  backgroundColor: webManifest.background_color,
  enableNotifications: false,
  startUrl: webManifest.start_url,
  iconUrl: `${assetBase}/brand/app-icon-512.png`,
  maskableIconUrl: `${assetBase}/brand/app-icon-maskable-512.png`,
  splashScreenFadeOutDuration: 300,
  signingKey: { path: keystore, alias },
  appVersionName: appVersion,
  appVersion,
  appVersionCode: versionCode,
  shortcuts: (webManifest.shortcuts ?? []).map((s) => ({
    name: s.name,
    shortName: s.short_name,
    url: s.url,
    chosenIconUrl: `${assetBase}/brand/app-icon-192.png`,
  })),
  generatorApp: 'bubblewrap-cli',
  webManifestUrl: `${assetBase}/brand/manifest.webmanifest`,
  fallbackType: 'customtabs',
  features: {},
  alphaDependencies: { enabled: false },
  enableSiteSettingsShortcut: true,
  isChromeOSOnly: false,
  isMetaQuest: false,
  fullScopeUrl: `https://${host}/`,
  minSdkVersion: 24, // androidbrowserhelper 2.7 cần Android 7 trở lên
  orientation: 'portrait',
  fingerprints: [],
  additionalTrustedOrigins: [],
  retainedBundles: [],
};
writeFileSync(manifestFile, `${JSON.stringify(twa, null, 2)}\n`);

// ---- Sinh dự án Android rồi build (Bubblewrap không hỏi gì vì đã có đủ cấu hình và mật khẩu)
const bubblewrap = (args) =>
  execFileSync('npx', ['--yes', '@bubblewrap/cli@1.27.0', ...args], {
    cwd: dir,
    stdio: 'inherit',
    env: { ...process.env, ...secrets },
  });
bubblewrap(['update', '--skipVersionUpgrade', '--manifest', manifestFile]);
bubblewrap(['build', '--skipPwaValidation', '--manifest', manifestFile]);

const apk = join(dir, 'dist', `ca-nhanh-${appVersion}-${versionCode}.apk`);
const aab = join(dir, 'dist', `ca-nhanh-${appVersion}-${versionCode}.aab`);
copyFileSync(join(dir, 'app-release-signed.apk'), apk);
copyFileSync(join(dir, 'app-release-bundle.aab'), aab);

const listing = execFileSync(
  'keytool',
  [
    '-list',
    '-v',
    '-keystore',
    keystore,
    '-alias',
    alias,
    '-storepass',
    secrets.BUBBLEWRAP_KEYSTORE_PASSWORD,
  ],
  { encoding: 'utf8' },
);
const sha256 = /SHA256:\s*([0-9A-F:]+)/.exec(listing)?.[1];
console.log(`
Xong.
  APK (cài trực tiếp):  ${apk}
  AAB (Google Play):    ${aab}
Khai báo trên Vercel để app mở toàn màn hình (không có thanh địa chỉ):
  ANDROID_PACKAGE_NAME=${packageId}
  ANDROID_CERT_SHA256=${sha256}
Kiểm tra sau khi deploy: https://${host}/.well-known/assetlinks.json`);
