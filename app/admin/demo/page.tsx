import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page';
import { requireRole } from '@/lib/auth';
import { listDemoShifts } from '@/lib/services/demo';
import { demoEnabled, getSettings } from '@/lib/services/settings';
import { DemoTools } from './demo-tools';

export const metadata: Metadata = { title: 'Công cụ demo' };

/** Công cụ demo (P3-06, US-45): reset dữ liệu, chạy bộ hẹn giờ, tua thời gian từng ca */
export default async function AdminDemoPage() {
  await requireRole('admin');
  const [enabled, settings] = await Promise.all([demoEnabled(), getSettings()]);
  if (!enabled) {
    return (
      <>
        <PageHeader title="Công cụ demo" />
        <p className="rounded-[var(--radius-card)] bg-surface p-6 text-sm text-text-muted shadow-[var(--shadow-card)]">
          Công cụ demo đang tắt. Cần cả biến môi trường <code>DEMO_MODE=true</code> và cờ{' '}
          <Link href="/admin/settings" className="font-semibold text-primary hover:underline">
            Bật công cụ demo
          </Link>{' '}
          trong Cấu hình.
        </p>
      </>
    );
  }
  const shifts = await listDemoShifts();
  return <DemoTools shifts={shifts} minLead={settings.min_lead_minutes} />;
}
