import type { Metadata } from 'next';
import { EmptyState } from '@/components/cn/empty-state';
import { PageHeader } from '@/components/layout/page';
import { requireRole } from '@/lib/auth';
import { getPositions } from '@/lib/services/catalog';
import { getSettings } from '@/lib/services/settings';
import { listMyShops } from '@/lib/services/shops';
import { NewShiftForm } from './new-shift-form';

export const metadata: Metadata = { title: 'Đăng ca' };

/** S2: đăng ca có ước tính chi phí và ký quỹ (P1-14) */
export default async function NewShiftPage({ searchParams }: PageProps<'/shop/shifts/new'>) {
  const user = await requireRole('shop_owner');
  const [shops, positions, settings, query] = await Promise.all([
    listMyShops(user.id),
    getPositions(),
    getSettings(),
    searchParams,
  ]);
  const usable = shops.filter((s) => s.verification_status === 'verified' && s.is_active);

  if (usable.length === 0) {
    return (
      <>
        <PageHeader title="Đăng ca" />
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="shop-onboarding"
            title={shops.length === 0 ? 'Tạo quán để đăng ca đầu tiên' : 'Quán đang chờ duyệt'}
            text="Ca được đăng theo từng quán, kèm vị trí để người làm chấm công."
            action={{ label: shops.length === 0 ? 'Tạo quán' : 'Xem quán', href: '/shop/settings' }}
          />
        </div>
      </>
    );
  }

  const requested = typeof query.shop === 'string' ? query.shop : undefined;
  return (
    <>
      <PageHeader
        title="Đăng ca"
        description="Tiền công được tạm giữ ngay khi đăng để người làm yên tâm nhận ca"
      />
      <NewShiftForm
        shops={usable.map((s) => ({ id: s.id, name: s.name }))}
        defaultShopId={usable.find((s) => s.id === requested)?.id ?? usable[0]!.id}
        positions={positions}
        minHourlyRate={settings.min_hourly_rate}
        minLeadMinutes={settings.min_lead_minutes}
        feeRate={settings.fee_rate}
      />
    </>
  );
}
