// Digital Asset Links cho app Android (TWA): chứng minh tên miền này thuộc về app có khóa ký nêu dưới,
// để Chrome mở app toàn màn hình, không hiện thanh địa chỉ. Khai báo trong biến môi trường:
//   ANDROID_PACKAGE_NAME=vn.canhanh.app
//   ANDROID_CERT_SHA256=AA:BB:…  (nhiều khóa cách nhau bằng dấu phẩy: khóa tải lên + khóa của Google Play)
// Chưa khai báo thì trả mảng rỗng (app vẫn chạy, nhưng có thanh địa chỉ).

export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME;
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const body =
    pkg && fingerprints.length
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: pkg,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
