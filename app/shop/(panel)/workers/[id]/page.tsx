import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WorkerListActions } from '@/components/shop/worker-list-actions';
import { WorkerCv } from '@/components/worker/worker-cv';
import { ApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { getWorkerProfile } from '@/lib/services/workers';

export const metadata: Metadata = { title: 'Hồ sơ người làm' };

/** Hồ sơ năng lực người làm, nhìn từ quán (P3-07, US-24) */
export default async function ShopWorkerPage({ params }: PageProps<'/shop/workers/[id]'>) {
  const { id } = await params;
  const user = await requireRole('shop_owner');
  const w = await getWorkerProfile(user, id).catch((error: unknown) => {
    if (error instanceof ApiError) notFound();
    throw error;
  });
  return (
    <div className="grid max-w-3xl gap-4">
      <Link
        href="/shop/workers"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden /> Người làm
      </Link>
      <WorkerCv
        w={w}
        actions={w.lists.map((l) => (
          <WorkerListActions
            key={l.shop_id}
            shopId={l.shop_id}
            shopName={w.lists.length > 1 ? l.shop_name : undefined}
            workerId={w.id}
            name={w.full_name}
            listType={l.list_type}
          />
        ))}
      />
    </div>
  );
}
