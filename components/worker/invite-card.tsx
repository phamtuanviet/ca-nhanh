'use client';

import { Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { fmtDay, fmtRange, vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import type { Invite } from '@/lib/services/invites';

/** Lời mời của quán (W9, BKG-09): nhận ca ngay (bỏ qua thời gian ưu tiên, điểm tối thiểu) hoặc từ chối */
export function InviteCard({ invite }: { invite: Invite }) {
  const router = useRouter();
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);
  const shift = invite.shift!;

  async function respond(kind: 'accept' | 'decline') {
    setPending(kind);
    try {
      await api(`/invites/${invite.id}/${kind}`, { method: 'POST' });
      if (kind === 'accept') {
        toast.success('Đã nhận ca qua lời mời', {
          description: `${shift.title} · ${fmtRange(shift.start_at, shift.end_at)} ${fmtDay(shift.start_at)}`,
        });
      } else toast('Đã từ chối lời mời');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Không thực hiện được');
    } finally {
      setPending(null);
    }
  }

  return (
    <li
      className="grid gap-3 rounded-[var(--radius-card)] border border-primary/30 bg-primary-soft p-4 text-on-primary-soft"
      data-testid="invite-card"
    >
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-semibold">{invite.shop?.name} mời bạn làm ca</span>
          <span className="text-sm">
            {shift.title} ·{' '}
            <span className="cn-num text-base">{fmtRange(shift.start_at, shift.end_at)}</span>{' '}
            {fmtDay(shift.start_at)}
          </span>
          {invite.message ? <span className="text-sm italic">“{invite.message}”</span> : null}
        </div>
        <strong className="cn-num text-xl text-money">{vnd(shift.est_wage_per_seat)}</strong>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending !== null}
          onClick={() => respond('decline')}
        >
          {pending === 'decline' ? 'Đang gửi…' : 'Từ chối'}
        </Button>
        <Button size="sm" disabled={pending !== null} onClick={() => respond('accept')}>
          {pending === 'accept' ? 'Đang nhận…' : 'Nhận ca'}
        </Button>
      </div>
    </li>
  );
}
