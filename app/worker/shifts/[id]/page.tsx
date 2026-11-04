import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { getShiftDetail } from '@/lib/services/shifts';
import { ShiftDetailView } from './shift-detail';

export const metadata: Metadata = { title: 'Chi tiết ca' };

/** W4: chi tiết ca và nút "Nhận ca" (P1-10) */
export default async function ShiftPage({ params }: PageProps<'/worker/shifts/[id]'>) {
  const { id } = await params;
  const user = await requireRole('worker');
  const detail = await getShiftDetail(user, id).catch((error: unknown) => {
    if (error instanceof ApiError && ['NOT_FOUND', 'VALIDATION_ERROR'].includes(error.code))
      notFound();
    throw error;
  });
  return <ShiftDetailView detail={detail} />;
}
