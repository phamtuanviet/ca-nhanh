import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { getPositions } from '@/lib/services/catalog';
import { ShiftExplorer } from './shift-explorer';

export const metadata: Metadata = { title: 'Khám phá ca' };

/** W3: Khám phá ca dạng danh sách (P1-09). Bản đồ là P3-01. */
export default async function ExplorePage() {
  // Đọc phiên trước khi lấy dữ liệu: trang chạy lúc có request, không bị prerender lúc build
  await requireRole('worker');
  const positions = await getPositions();
  return <ShiftExplorer positions={positions} />;
}
