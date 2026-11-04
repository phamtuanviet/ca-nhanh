'use client';

import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';

type BookingPreview =
  | {
      actor: 'worker';
      hours_before_start: number;
      penalty_points: number;
      current_points: number;
      threshold: number;
      will_be_suspended: boolean;
      suspension_days: number;
    }
  | { actor: 'shop'; hours_before_start: number; compensation: number };

type ShiftPreview = {
  hours_before_start: number;
  confirmed_workers: number;
  compensation_per_worker: number;
  compensation_total: number;
  release_amount: number;
};

type Target = { kind: 'booking'; id: string; who?: string } | { kind: 'shift'; id: string };

/**
 * Hủy ca (P2-07, US-15, US-25, US-26): hỏi cancel-preview rồi ghi rõ hậu quả trước khi xác nhận.
 * Người làm thấy điểm phạt ("Hủy bây giờ sẽ bị cộng 2 điểm phạt", Gherkin 02 §6.4); quán thấy tiền bồi thường.
 */
export function CancelDialog({
  target,
  trigger,
  onCancelled,
}: {
  target: Target;
  trigger: ReactNode;
  onCancelled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <CancelBody
            target={target}
            onClose={() => setOpen(false)}
            onCancelled={() => {
              setOpen(false);
              onCancelled?.();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CancelBody({
  target,
  onClose,
  onCancelled,
}: {
  target: Target;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const router = useRouter();
  const base = target.kind === 'booking' ? `/bookings/${target.id}` : `/shifts/${target.id}`;
  const preview = useQuery({
    queryKey: ['cancel-preview', base],
    queryFn: ({ signal }) =>
      api<BookingPreview | ShiftPreview>(`${base}/cancel-preview`, { method: 'GET', signal }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await api(`${base}/cancel`, { body: reason.trim() ? { reason: reason.trim() } : {} });
      toast.success(target.kind === 'shift' ? 'Đã hủy ca' : 'Đã hủy', {
        description:
          target.kind === 'shift'
            ? 'Người đã nhận được báo ngay, tiền tạm giữ đã hoàn về ví.'
            : undefined,
      });
      onCancelled();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không hủy được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  const title =
    target.kind === 'shift'
      ? 'Hủy cả ca?'
      : target.who
        ? `Hủy ca của ${target.who}?`
        : 'Hủy ca này?';

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Hành động này không hoàn tác được.</DialogDescription>
      </DialogHeader>

      {preview.isPending ? (
        <div className="grid gap-2" aria-busy>
          <div className="cn-skel h-5 w-3/4 rounded" />
          <div className="cn-skel h-5 w-1/2 rounded" />
        </div>
      ) : preview.isError ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {preview.error instanceof ApiClientError
            ? preview.error.message
            : 'Không tải được thông tin hủy'}
        </p>
      ) : (
        <Consequences data={preview.data} />
      )}

      {preview.isSuccess ? (
        <div className="grid gap-2">
          <Label htmlFor="cancel-reason">Lý do (không bắt buộc)</Label>
          <textarea
            id="cancel-reason"
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-[var(--radius-control)] border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={onClose}>
          Giữ lại
        </Button>
        <Button variant="danger" onClick={confirm} disabled={!preview.isSuccess || pending}>
          {pending ? 'Đang hủy…' : 'Xác nhận hủy'}
        </Button>
      </div>
    </>
  );
}

function Consequences({ data }: { data: BookingPreview | ShiftPreview }) {
  if (!('actor' in data)) {
    const net = data.release_amount - data.compensation_total;
    return (
      <div className="grid gap-3 text-sm" data-testid="cancel-preview">
        <p>
          {data.confirmed_workers > 0
            ? `${data.confirmed_workers} người đã nhận sẽ được báo ngay.`
            : 'Chưa có ai nhận ca này.'}
        </p>
        {data.compensation_total > 0 ? (
          <Warning>
            Hủy trong vòng 24 giờ trước giờ bắt đầu: quán bồi thường {vnd(data.compensation_total)}{' '}
            ({vnd(data.compensation_per_worker)} mỗi người, 50% tiền công dự kiến).
          </Warning>
        ) : null}
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-[var(--radius-control)] bg-surface-sunken p-3">
          <dt className="text-text-muted">Hoàn tiền tạm giữ</dt>
          <dd className="cn-num text-right text-base">{vnd(data.release_amount)}</dd>
          {data.compensation_total > 0 ? (
            <>
              <dt className="text-text-muted">Bồi thường người làm</dt>
              <dd className="cn-num text-right text-base">−{vnd(data.compensation_total)}</dd>
            </>
          ) : null}
          <dt className="font-semibold">Về ví khả dụng</dt>
          <dd className="cn-num text-right text-lg text-money">{vnd(net)}</dd>
        </dl>
      </div>
    );
  }

  if (data.actor === 'worker') {
    return (
      <div className="grid gap-3 text-sm" data-testid="cancel-preview">
        {data.penalty_points > 0 ? (
          <Warning>
            <strong>Hủy bây giờ sẽ bị cộng {data.penalty_points} điểm phạt</strong> vì còn chưa tới{' '}
            {data.hours_before_start < 6 ? '6' : '24'} giờ là bắt đầu ca. Điểm phạt hiện tại:{' '}
            {data.current_points}/{data.threshold}.
          </Warning>
        ) : (
          <p>Bạn hủy trước giờ bắt đầu hơn 24 giờ nên không bị cộng điểm phạt.</p>
        )}
        {data.will_be_suspended ? (
          <Warning>
            Đủ {data.threshold} điểm phạt trong 30 ngày: bạn sẽ bị tạm khóa nhận ca{' '}
            {data.suspension_days} ngày.
          </Warning>
        ) : null}
        <p className="text-text-muted">Chỗ của bạn sẽ mở lại cho người khác nhận.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 text-sm" data-testid="cancel-preview">
      {data.compensation > 0 ? (
        <Warning>
          Hủy trong vòng 24 giờ trước giờ bắt đầu: quán bồi thường{' '}
          <strong>{vnd(data.compensation)}</strong> cho người làm (50% tiền công dự kiến), trừ vào
          số dư khả dụng.
        </Warning>
      ) : (
        <p>Hủy trước giờ bắt đầu hơn 24 giờ nên không mất phí bồi thường.</p>
      )}
      <p className="text-text-muted">
        Chỗ này mở lại cho người khác nhận, tiền tạm giữ của chỗ vẫn giữ cho người nhận sau.
      </p>
    </div>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-spark-soft px-3 py-2 text-on-spark-soft">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
