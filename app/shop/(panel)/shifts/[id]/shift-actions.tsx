'use client';

import { useQuery } from '@tanstack/react-query';
import { FastForward, UserPlus, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { CancelDialog } from '@/components/booking/cancel-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fmtRange, vnd } from '@/lib/format';
import { api, apiList, ApiClientError } from '@/lib/http';

/** Quán hủy cả ca (US-26): xem trước bồi thường và tiền hoàn rồi mới hủy */
export function CancelShiftButton({ shiftId }: { shiftId: string }) {
  return (
    <CancelDialog
      target={{ kind: 'shift', id: shiftId }}
      trigger={
        <Button variant="destructive" size="sm">
          Hủy ca
        </Button>
      }
    />
  );
}

/** Quán hủy một người đã nhận (US-15) */
export function CancelBookingButton({ bookingId, who }: { bookingId: string; who: string }) {
  return (
    <CancelDialog
      target={{ kind: 'booking', id: bookingId, who }}
      trigger={
        <Button variant="ghost" size="sm" aria-label={`Hủy ca của ${who}`}>
          Hủy
        </Button>
      }
    />
  );
}

type Shifted = { start_at: string; end_at: string };

/**
 * Công cụ demo (P2-08, Gherkin 02 §6.11): dời ca để bắt đầu sau 1 phút, hoặc vừa kết thúc 1 phút trước.
 * Chỉ hiện khi bật DEMO_MODE; API kiểm tra lại quyền chủ quán.
 */
export function DemoTimeControls({ shiftId, canStart }: { shiftId: string; canStart: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<'start' | 'end' | null>(null);

  async function jump(to: 'start' | 'end') {
    setPending(to);
    try {
      const shift = await api<Shifted>('/admin/demo/fast-forward', {
        body: { shift_id: shiftId, to },
      });
      toast.success(to === 'start' ? 'Đã tua tới giờ bắt đầu' : 'Đã tua tới giờ kết thúc', {
        description: `Ca giờ là ${fmtRange(shift.start_at, shift.end_at)}`,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Không tua được, thử lại sau');
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      className="grid gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong p-4"
      aria-label="Công cụ demo"
    >
      <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">
        Công cụ demo · tua thời gian
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => jump('start')}
          disabled={pending !== null || !canStart}
        >
          <FastForward aria-hidden />
          {pending === 'start' ? 'Đang tua…' : 'Tua tới giờ bắt đầu'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => jump('end')} disabled={pending !== null}>
          <FastForward aria-hidden />
          {pending === 'end' ? 'Đang tua…' : 'Tua tới giờ kết thúc'}
        </Button>
      </div>
    </section>
  );
}

/** Đẩy ca gấp (US-16): trừ phí, gắn nhãn Ca gấp, báo người làm trong 3 km có kỹ năng phù hợp */
export function BoostButton({ shiftId, fee }: { shiftId: string; fee: number }) {
  return (
    <ConfirmAction
      label="Đẩy ca gấp"
      icon={<Zap aria-hidden />}
      title="Đẩy ca gấp?"
      text={`Trừ ${vnd(fee)} từ ví khả dụng. Ca được gắn nhãn “Ca gấp”, xếp ưu tiên trên trang Khám phá và báo ngay cho người làm đã xác minh trong bán kính 3 km có kỹ năng phù hợp.`}
      action={`Đẩy ca · ${vnd(fee)}`}
      run={() => api(`/shifts/${shiftId}/boost`, { method: 'POST' })}
      success="Đã đẩy ca gấp"
    />
  );
}

function ConfirmAction({
  label,
  icon,
  title,
  text,
  action,
  run,
  success,
}: {
  label: string;
  icon: ReactNode;
  title: string;
  text: string;
  action: string;
  run: () => Promise<unknown>;
  success: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="spark"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {icon} {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{text}</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Thôi
            </Button>
            <Button
              variant="spark"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await run();
                  toast.success(success);
                  setOpen(false);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof ApiClientError ? err.message : 'Không thực hiện được');
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? 'Đang xử lý…' : action}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type Candidate = {
  worker_id: string;
  full_name: string;
  avatar_url: string | null;
  completed_at_shop: number;
  list_type: 'favorite' | 'blocked' | null;
  rating_avg: number;
  rating_count: number;
};

/** Mời người quen (US-17, BR-25): chọn trong người quen và người từng làm ở quán */
export function InviteButton({
  shiftId,
  shopId,
  invited,
}: {
  shiftId: string;
  shopId: string;
  invited: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, isPending } = useQuery({
    queryKey: ['shop-workers', shopId],
    enabled: open,
    queryFn: ({ signal }) => apiList<Candidate>(`/shops/${shopId}/workers?list=all`, signal),
  });
  const candidates = (data?.data ?? []).filter((c) => !invited.includes(c.worker_id));

  async function send() {
    setPending(true);
    setError(null);
    try {
      const r = await api<{ invited: number; skipped: number }>(`/shifts/${shiftId}/invites`, {
        body: { worker_ids: picked, ...(message.trim() ? { message: message.trim() } : {}) },
      });
      toast.success(`Đã mời ${r.invited} người`, {
        description: r.skipped
          ? `${r.skipped} người không đủ điều kiện hoặc đã được mời`
          : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không gửi được lời mời');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setPicked([]);
          setMessage('');
          setError(null);
          setOpen(true);
        }}
      >
        <UserPlus aria-hidden /> Mời người quen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mời người quen</DialogTitle>
            <DialogDescription>
              Người được mời nhận ca ngay, bỏ qua thời gian ưu tiên và điểm tối thiểu.
            </DialogDescription>
          </DialogHeader>
          {isPending ? (
            <div className="grid gap-2" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="cn-skel h-11 rounded-[var(--radius-control)]" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">
              Chưa có người quen hoặc người từng làm ở quán để mời
              {invited.length ? ` (đã mời ${invited.length} người)` : ''}.
            </p>
          ) : (
            <ul className="grid max-h-72 gap-1 overflow-y-auto" aria-label="Người có thể mời">
              {candidates.map((c) => {
                const on = picked.includes(c.worker_id);
                return (
                  <li key={c.worker_id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 hover:bg-surface-sunken">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicked((p) =>
                            on ? p.filter((x) => x !== c.worker_id) : [...p, c.worker_id],
                          )
                        }
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className="grid flex-1">
                        <span className="text-sm font-medium">
                          {c.full_name}
                          {c.list_type === 'favorite' ? ' · người quen' : ''}
                        </span>
                        <span className="text-xs text-text-muted">
                          {c.completed_at_shop} ca ở quán
                          {c.rating_count ? ` · ${c.rating_avg.toFixed(1)}★` : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="invite-message">Lời nhắn (không bắt buộc)</Label>
            <Input
              id="invite-message"
              maxLength={200}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cuối tuần làm với quán nhé"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <Button onClick={send} disabled={pending || picked.length === 0}>
            {pending
              ? 'Đang gửi…'
              : picked.length
                ? `Mời ${picked.length} người`
                : 'Chọn người để mời'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
