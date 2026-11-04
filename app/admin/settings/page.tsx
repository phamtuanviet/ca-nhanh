import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { getAdminSettings } from '@/lib/services/admin';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: 'Cấu hình' };

/** Tham số nền tảng (P3-05, US-44, ADM-07): đổi không cần sửa mã */
export default async function AdminSettingsPage() {
  await requireRole('admin');
  const rows = await getAdminSettings();
  return <SettingsForm rows={rows} />;
}
