'use client';

import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { givenName } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';

export type ReviewDirection = 'shop_to_worker' | 'worker_to_shop';

/** Thẻ nhanh (05 §4.5): quán đánh giá người làm, người làm đánh giá quán */
const TAGS: Record<ReviewDirection, { key: string; label: string }[]> = {
  shop_to_worker: [
    { key: 'on_time', label: 'Đúng giờ' },
    { key: 'fast', label: 'Nhanh nhẹn' },
    { key: 'polite', label: 'Lễ phép' },
    { key: 'want_rebook', label: 'Muốn mời lại' },
  ],
  worker_to_shop: [
    { key: 'as_described', label: 'Đúng mô tả' },
    { key: 'friendly', label: 'Thân thiện' },
    { key: 'clear_guidance', label: 'Hướng dẫn rõ' },
    { key: 'paid_on_time', label: 'Trả tiền đúng hẹn' },
  ],
};

const STAR_HINT = ['', 'Rất tệ', 'Chưa tốt', 'Tạm được', 'Tốt', 'Tuyệt vời'];

type Result = { added_to_favorites: boolean };

/**
 * Đánh giá sau ca (W8, P3-03, Gherkin 02 §6.9): chấm sao, thẻ nhanh, nhận xét ngắn.
 * Quán chọn "Muốn mời lại" thì người làm vào danh sách người quen.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  bookingId,
  direction,
  subject,
  context,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  direction: ReviewDirection;
  subject: string;
  context?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const name = direction === 'shop_to_worker' ? givenName(subject) : subject;

  function onStarKey(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setStars((n) => Math.min(5, n + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setStars((n) => Math.max(1, n - 1));
    }
  }

  async function submit() {
    if (stars === 0) return setError('Chọn số sao trước khi gửi');
    setPending(true);
    setError(null);
    try {
      const result = await api<Result>(`/bookings/${bookingId}/reviews`, {
        body: { stars, tags, ...(comment.trim() ? { comment: comment.trim() } : {}) },
      });
      toast.success(`Đã gửi đánh giá ${stars}★`, {
        description: result.added_to_favorites
          ? `${name} đã vào danh sách người quen của quán`
          : undefined,
      });
      onOpenChange(false);
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không gửi được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đánh giá {name}</DialogTitle>
          <DialogDescription>
            {context ? `${context}. ` : ''}
            {direction === 'shop_to_worker'
              ? 'Điểm và nhận xét giúp người làm có hồ sơ uy tín.'
              : 'Đánh giá giúp người làm khác chọn quán tốt.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid justify-items-center gap-1">
            <div role="radiogroup" aria-label="Số sao" className="flex gap-1" onKeyDown={onStarKey}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={stars === n}
                  aria-label={`${n} sao`}
                  tabIndex={stars === n || (stars === 0 && n === 1) ? 0 : -1}
                  onClick={() => setStars(n)}
                  className="rounded-full p-1 transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                >
                  <Star
                    className={`size-10 ${n <= stars ? 'fill-spark text-spark' : 'text-border-strong'}`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <span className="h-5 text-sm font-medium text-text-muted" aria-live="polite">
              {STAR_HINT[stars]}
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Thẻ nhanh">
            {TAGS[direction].map((t) => {
              const on = tags.includes(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setTags((list) => (on ? list.filter((x) => x !== t.key) : [...list, t.key]))
                  }
                  className="h-9 rounded-full border border-border px-3.5 text-sm font-medium transition-colors hover:bg-surface-sunken aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-on-primary-soft"
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`review-comment-${bookingId}`}>Nhận xét (không bắt buộc)</Label>
            <textarea
              id={`review-comment-${bookingId}`}
              rows={2}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="rounded-[var(--radius-control)] border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Đang gửi…' : 'Gửi đánh giá'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Nút "Đánh giá" tự quản lý hộp thoại */
export function ReviewButton({
  label = 'Đánh giá',
  size = 'sm',
  variant = 'secondary',
  ...props
}: Omit<Parameters<typeof ReviewDialog>[0], 'open' | 'onOpenChange'> & {
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'secondary' | 'outline' | 'default';
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => {
          setSession((n) => n + 1);
          setOpen(true);
        }}
      >
        <Star aria-hidden /> {label}
      </Button>
      <ReviewDialog key={session} open={open} onOpenChange={setOpen} {...props} />
    </>
  );
}
