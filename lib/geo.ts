// Tọa độ: PostgREST trả cột geography dạng hex EWKB; ghi vào CSDL dạng EWKT.

export type LatLng = { lat: number; lng: number };

/** Điểm → EWKT cho cột geography(Point, 4326). Lưu ý thứ tự: kinh độ trước, vĩ độ sau. */
export function toEwkt({ lat, lng }: LatLng): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/** Giải mã điểm hex EWKB (ví dụ "0101000020E6100000…") thành { lat, lng } */
export function parsePoint(hex: unknown): LatLng | null {
  if (typeof hex !== 'string' || !/^[0-9A-Fa-f]+$/.test(hex) || hex.length < 42) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const view = new DataView(bytes.buffer);
  const little = view.getUint8(0) === 1;
  const type = view.getUint32(1, little);
  if ((type & 0xff) !== 1) return null; // không phải Point
  const offset = type & 0x20000000 ? 9 : 5; // có SRID thì bỏ qua 4 byte SRID
  return { lng: view.getFloat64(offset, little), lat: view.getFloat64(offset + 8, little) };
}

/** Khoảng cách theo đường tròn lớn (mét) */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h));
}

/** Tâm các quận để chọn khi người dùng không cho quyền vị trí */
export const DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Cầu Giấy', lat: 21.0333, lng: 105.79 },
  { name: 'Hai Bà Trưng', lat: 21.0127, lng: 105.8525 },
  { name: 'Đống Đa', lat: 21.0181, lng: 105.8292 },
  { name: 'Ba Đình', lat: 21.0341, lng: 105.8188 },
  { name: 'Hoàn Kiếm', lat: 21.0287, lng: 105.8523 },
  { name: 'Thanh Xuân', lat: 20.9936, lng: 105.8114 },
];
