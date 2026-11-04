import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { vnDate } from '@/lib/format';
import { getKpis } from '@/lib/services/admin';
import { KpiDashboard } from './kpi-dashboard';

export const metadata: Metadata = { title: 'KPI' };

const DEFAULT_DAYS = 30;

/** A1: dashboard KPI 30 ngày qua (P3-04) */
export default async function AdminKpiPage() {
  await requireRole('admin');
  const to = vnDate();
  const from = vnDate(
    new Date(new Date(`${to}T12:00:00+07:00`).getTime() - (DEFAULT_DAYS - 1) * 86_400_000),
  );
  const report = await getKpis(from, to);
  return <KpiDashboard initial={report} initialDays={DEFAULT_DAYS} />;
}
