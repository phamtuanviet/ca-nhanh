import type { ReactNode } from 'react';
import { Badge } from '@/components/cn/badge';
import { EmptyState } from '@/components/cn/empty-state';
import type { IllustrationName } from '@/components/cn/illustrations.generated';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="text-2xl leading-8 font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

/** Trang khung của Phase 0: nói rõ màn hình này sẽ có gì và task nào làm nó (docs/07) */
export function PagePlaceholder({
  title,
  description,
  illustration,
  heading,
  text,
  task,
}: {
  title: string;
  description?: string;
  illustration: IllustrationName;
  heading: string;
  text: string;
  task: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        <EmptyState illustration={illustration} title={heading} text={text}>
          <Badge tone="info" icon="clock">{`Đang xây dựng · ${task}`}</Badge>
        </EmptyState>
      </div>
    </>
  );
}

/** Khung chờ cho nội dung khu vực khi đang kiểm tra phiên */
export function PageSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-busy="true" aria-label="Đang tải">
      <div className="cn-skel h-8 w-48" />
      <div className="cn-skel h-5 w-72 max-w-full" />
      <div className="cn-skel mt-2 h-64 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}
