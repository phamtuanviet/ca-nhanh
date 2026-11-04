'use client';

import { useParams } from 'next/navigation';
import { ViewTransition } from 'react';

/**
 * Khung chờ của chi tiết ca. Khối đầu mang cùng tên chuyển cảnh với vé vừa bấm (shift-<id>), nên vé
 * "nở" thành khung này ngay khi bấm, rồi khung nở tiếp thành nội dung thật (P3-08, View Transitions).
 */
export default function Loading() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="grid gap-5" role="status" aria-busy="true" aria-label="Đang tải">
      <div className="cn-skel h-5 w-28" />
      <ViewTransition name={`shift-${id}`} share="morph" default="none">
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <div className="cn-skel aspect-[3/1] w-full rounded-none" />
          <div className="grid gap-3 p-5">
            <div className="cn-skel h-4 w-32" />
            <div className="cn-skel h-8 w-3/4" />
            <div className="cn-skel h-5 w-1/2" />
          </div>
        </div>
      </ViewTransition>
      <div className="grid grid-cols-2 gap-3">
        <div className="cn-skel h-28 rounded-[var(--radius-card)]" />
        <div className="cn-skel h-28 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
