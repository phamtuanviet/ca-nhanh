import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { Scanner } from './scanner';

export const metadata: Metadata = { title: 'Quét QR' };

/** W6: quét QR trên kiosk của quán để check-in/check-out (P2-03) */
export default async function ScanPage() {
  await requireRole('worker');
  return <Scanner />;
}
