// Service worker của PWA và app Android (TWA). Phục vụ từ route để có header đúng và đổi phiên bản theo
// mỗi lần deploy (public/ do scripts/sync-assets.mjs sinh ra nên không đặt file tĩnh ở đó).
//
// Chiến lược: không lưu trang có dữ liệu (luôn lấy mạng để số dư, chỗ trống đúng thời gian thực).
// - Điều hướng trang: mạng trước; mất mạng thì trả trang /offline đã lưu sẵn.
// - /_next/static (tên có mã băm, không bao giờ đổi) và ảnh thương hiệu: lưu lần đầu, lần sau lấy từ cache.

const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? process.env.npm_package_version ?? 'dev';

const source = `
const VERSION = ${JSON.stringify(VERSION)};
const PAGES = 'cn-pages-' + VERSION;
const STATIC = 'cn-static-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES).then((cache) =>
      cache.addAll([OFFLINE_URL, '/brand/app-icon-192.png', '/brand/logo-mark.svg']),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('cn-pages-') && k !== PAGES).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL, { ignoreSearch: true })));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/brand/')) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
`;

export function GET() {
  return new Response(source, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
