'use client';

import { Clock, LogIn, LogOut, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/cn/badge';
import { ReviewDialog } from '@/components/booking/review-dialog';
import { EmptyState } from '@/components/cn/empty-state';
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
import { fmtDay, fmtRange, fmtTime, givenName, vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import { calcFee, calcWage } from '@/lib/money';
import type { PendingTimesheet } from '@/lib/services/bookings';

type Approved = { worked_minutes: number; wage_amount: number };

function hm(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} giờ${m ? ` ${m} phút` : ''}` : `${m} phút`;
}

type ReviewTarget = { bookingId: string; name: string; context: string };

export function TimesheetList({
  items,
  multiShop,
}: {
  items: PendingTimesheet[];
  multiShop: boolean;
}) {
  // Duyệt xong mở ngay hộp đánh giá (Gherkin 02 §6.9). Giữ ở cấp danh sách vì dòng vừa duyệt biến mất.
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const onApproved = (t: PendingTimesheet) =>
    setReview({
      bookingId: t.id,
      name: t.worker.full_name,
      context: `${t.shift.title} · ${fmtRange(t.shift.start_at, t.shift.end_at)}`,
    });
  return (
    <>
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="qr-scan"
            title="Không có giờ công chờ duyệt"
            text="Khi người làm quét QR check-out, giờ công hiện ở đây để bạn duyệt. Quá 12 giờ chưa duyệt thì hệ thống tự duyệt."
            action={{ label: 'Xem các ca', href: '/shop/shifts' }}
          />
        </div>
      ) : (
        <ul className="grid gap-3" aria-label="Giờ công chờ duyệt">
          {items.map((t) => (
            <TimesheetRow key={t.id} t={t} multiShop={multiShop} onApproved={onApproved} />
          ))}
        </ul>
      )}
      {review ? (
        <ReviewDialog
          key={review.bookingId}
          open
          onOpenChange={(open) => {
            if (!open) setReview(null);
          }}
          bookingId={review.bookingId}
          direction="shop_to_worker"
          subject={review.name}
          context={review.context}
        />
      ) : null}
    </>
  );
}

function TimesheetRow({
  t,
  multiShop,
  onApproved,
}: {
  t: PendingTimesheet;
  multiShop: boolean;
  onApproved: (t: PendingTimesheet) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const disputed = t.status === 'disputed';
  const minutes = t.worked_minutes ?? 0;
  const wage = t.wage_amount ?? 0;
  const fee = t.fee_amount ?? 0;

  async function approve() {
    setPending(true);
    try {
      const b = await api<Approved>(`/bookings/${t.id}/approve`, { body: {} });
      toast.success(`Đã duyệt · ${vnd(b.wage_amount)} vào ví ${givenName(t.worker.full_name)}`);
      onApproved(t);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Không duyệt được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <li
      className="grid gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      data-testid="timesheet-row"
    >
      <div className="flex items-start gap-3">
        {t.worker.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
          <img src={t.worker.avatar_url} alt="" className="size-11 rounded-full bg-lam-100" />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-lam-100 font-bold text-on-primary-soft">
            {t.worker.full_name.at(0)}
          </span>
        )}
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="font-semibold">{t.worker.full_name}</span>
          <Link
            href={`/shop/shifts/${t.shift.id}`}
            className="truncate text-sm text-text-muted hover:text-text hover:underline"
          >
            {multiShop ? `${t.shop_name} · ` : ''}
            {t.shift.title} · {fmtRange(t.shift.start_at, t.shift.end_at)}{' '}
            {fmtDay(t.shift.start_at)}
          </Link>
        </div>
        {disputed ? <Badge tone="warn">Đang khiếu nại</Badge> : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="grid gap-0.5">
          <dt className="inline-flex items-center gap-1 text-xs text-text-muted">
            <LogIn className="size-3.5" aria-hidden /> Vào
          </dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            <span className="cn-num text-lg">
              {t.check_in_at ? fmtTime(t.check_in_at) : '--:--'}
            </span>
            {t.is_late ? <Badge tone="warn">Đi muộn</Badge> : null}
          </dd>
          {t.check_in_distance_m !== null ? (
            <dd className="inline-flex items-center gap-1 text-xs text-text-muted">
              <MapPin className="size-3" aria-hidden /> cách quán {t.check_in_distance_m} m
            </dd>
          ) : null}
        </div>
        <div className="grid gap-0.5">
          <dt className="inline-flex items-center gap-1 text-xs text-text-muted">
            <LogOut className="size-3.5" aria-hidden /> Ra
          </dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            <span className="cn-num text-lg">
              {t.check_out_at ? fmtTime(t.check_out_at) : '--:--'}
            </span>
            {t.auto_checked_out ? <Badge tone="neutral">Tự check-out</Badge> : null}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="inline-flex items-center gap-1 text-xs text-text-muted">
            <Clock className="size-3.5" aria-hidden /> Giờ công
          </dt>
          <dd className="cn-num text-lg" data-testid="timesheet-minutes">
            {minutes} phút
          </dd>
          <dd className="text-xs text-text-muted">{hm(minutes)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-xs text-text-muted">Tiền công</dt>
          <dd className="cn-num text-2xl text-money">{vnd(wage)}</dd>
          <dd className="text-xs text-text-muted">+ phí {vnd(fee)}</dd>
        </div>
      </dl>

      {disputed ? (
        <p className="text-sm text-text-muted">
          Booking đang có khiếu nại nên chưa duyệt được. Admin sẽ xử lý và quyết toán.
        </p>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setAdjusting(true)} disabled={pending}>
            Điều chỉnh
          </Button>
          <Button onClick={approve} disabled={pending}>
            {pending ? 'Đang duyệt…' : `Duyệt · ${vnd(wage)}`}
          </Button>
        </div>
      )}

      <AdjustDialog
        key={adjusting ? 'open' : 'closed'}
        open={adjusting}
        onOpenChange={setAdjusting}
        t={t}
        onApproved={() => {
          setAdjusting(false);
          onApproved(t);
          router.refresh();
        }}
      />
    </li>
  );
}

/** Điều chỉnh giờ công kèm lý do ≥ 5 ký tự (BR-18, Gherkin 02 §6.7 kịch bản 2) */
function AdjustDialog({
  open,
  onOpenChange,
  t,
  onApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: PendingTimesheet;
  onApproved: () => void;
}) {
  const [minutes, setMinutes] = useState(t.worked_minutes ?? 0);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const valid = Number.isInteger(minutes) && minutes >= 0 && minutes <= 960;
  const wage = valid ? calcWage(minutes, t.shift.hourly_rate) : 0;
  const fee = valid ? calcFee(wage, Number(t.shift.fee_rate)) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return setError('Giờ công từ 0 đến 960 phút');
    if (note.trim().length < 5) return setError('Nhập lý do điều chỉnh (tối thiểu 5 ký tự)');
    setPending(true);
    setError(null);
    try {
      const b = await api<Approved>(`/bookings/${t.id}/approve`, {
        body: { worked_minutes: minutes, note: note.trim() },
      });
      toast.success(
        `Đã duyệt ${b.worked_minutes} phút · ${vnd(b.wage_amount)} vào ví ${givenName(t.worker.full_name)}`,
      );
      onApproved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không duyệt được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Điều chỉnh giờ công</DialogTitle>
          <DialogDescription>
            {t.worker.full_name} · theo QR: {t.worked_minutes ?? 0} phút. Người làm sẽ thấy lý do
            điều chỉnh.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="adjust-minutes">Giờ công (phút)</Label>
            <Input
              id="adjust-minutes"
              type="number"
              inputMode="numeric"
              min={0}
              max={960}
              step={5}
              value={Number.isNaN(minutes) ? '' : minutes}
              onChange={(e) => setMinutes(e.target.valueAsNumber)}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adjust-note">Lý do điều chỉnh</Label>
            <textarea
              id="adjust-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: ở lại dọn quầy thêm 20 phút"
              className="rounded-[var(--radius-control)] border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-[var(--radius-control)] bg-surface-sunken p-3 text-sm">
            <dt className="text-text-muted">Tiền công mới</dt>
            <dd className="cn-num text-right text-lg text-money">{vnd(wage)}</dd>
            <dt className="text-text-muted">Phí nền tảng</dt>
            <dd className="cn-num text-right text-base">{vnd(fee)}</dd>
          </dl>
          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Đang duyệt…' : 'Duyệt giờ công đã điều chỉnh'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
