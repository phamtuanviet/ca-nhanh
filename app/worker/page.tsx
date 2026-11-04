import type { Metadata } from 'next';
import { getPositions } from '@/lib/services/catalog';
import { ShiftExplorer } from './shift-explorer';

export const metadata: Metadata = { title: 'Khám phá ca' };

/** W3: Khám phá ca dạng danh sách (P1-09). Bản đồ là P3-01. */
export default async function ExplorePage() {
  const positions = await getPositions();
  return <ShiftExplorer positions={positions} />;
}
