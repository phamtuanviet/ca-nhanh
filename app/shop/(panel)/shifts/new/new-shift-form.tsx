'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import type { ShiftEstimate } from '@/lib/money';

type Option = { id: string; name: string };
type Position = { code: string; name: string };

const formSchema = z.object({
  shop_id: z.string().min(1),
  position_code: z.string().min(1, 'Chọn vị trí'),
  title: z.string().trim().min(3, 'Tên ca tối thiểu 3 ký tự').max(120),
  date: z.iso.date('Chọn ngày'),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Chọn giờ bắt đầu'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Chọn giờ kết thúc'),
  break_minutes: z.number().int().min(0).max(240),
  hourly_rate: z.number({ error: 'Nhập lương' }).int().min(1, 'Nhập lương'),
  headcount: z.number().int().min(1).max(20),
  description: z.string().max(2000),
  requirements: z.string().max(1000),
  min_rating: z.string(),
  favorites_only_minutes: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

/** Ngày giờ theo giờ Việt Nam → ISO có múi giờ; giờ kết thúc ≤ giờ bắt đầu thì là ca qua đêm */
function toRange(date: string, start: string, end: string) {
  const startAt = new Date(`${date}T${start}:00+07:00`);
  let endAt = new Date(`${date}T${end}:00+07:00`);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);
  const iso = (d: Date) => d.toISOString().replace('.000Z', 'Z');
  return { start_at: iso(startAt), end_at: iso(endAt) };
}

function vnToday(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

function suggestTitle(positionName: string, start: string): string {
  const hour = Number(start.slice(0, 2));
  const part = hour < 11 ? 'sáng' : hour < 14 ? 'trưa' : hour < 17 ? 'chiều' : 'tối';
  return `${positionName} ca ${part}`;
}

export function NewShiftForm({
  shops,
  defaultShopId,
  positions,
  minHourlyRate,
  minLeadMinutes,
  feeRate,
}: {
  shops: Option[];
  defaultShopId: string;
  positions: Position[];
  minHourlyRate: number;
  minLeadMinutes: number;
  feeRate: number;
}) {
  const router = useRouter();
  const [estimate, setEstimate] = useState<ShiftEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shop_id: defaultShopId,
      position_code: positions[0]?.code ?? '',
      title: suggestTitle(positions[0]?.name ?? 'Ca làm', '17:00'),
      date: vnToday(1),
      start: '17:00',
      end: '22:00',
      break_minutes: 0,
      hourly_rate: 30000,
      headcount: 2,
      description: '',
      requirements: '',
      min_rating: '0',
      favorites_only_minutes: '0',
    },
  });
  const { register, control, handleSubmit, setValue, formState } = form;
  const values = useWatch({ control });

  // Gợi ý tên ca theo vị trí và giờ, cho tới khi chủ quán tự sửa tên
  useEffect(() => {
    if (titleTouched) return;
    const position = positions.find((p) => p.code === values.position_code);
    if (position && values.start) setValue('title', suggestTitle(position.name, values.start));
  }, [values.position_code, values.start, titleTouched, positions, setValue]);

  const estimateBody = useMemo(() => {
    const v = values;
    if (!v.shop_id || !v.date || !v.start || !v.end || !v.hourly_rate || !v.headcount) return null;
    const range = toRange(v.date, v.start, v.end);
    return {
      shop_id: v.shop_id,
      ...range,
      break_minutes: v.break_minutes ?? 0,
      hourly_rate: v.hourly_rate,
      headcount: v.headcount,
      is_urgent: false,
    };
  }, [values]);
  const estimateKey = JSON.stringify(estimateBody);

  // Ước tính chi phí theo từng thay đổi, gộp các lần gõ trong 300 ms
  useEffect(() => {
    if (!estimateBody) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        setEstimate(
          await api<ShiftEstimate>('/shifts/estimate', {
            body: estimateBody,
            signal: controller.signal,
          }),
        );
      } catch (err) {
        if (!(err instanceof DOMException)) setEstimate(null);
      } finally {
        if (!controller.signal.aborted) setEstimating(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- estimateKey thay cho object
  }, [estimateKey]);

  const messages: Record<string, string> = {
    RATE_BELOW_MINIMUM: `Lương tối thiểu là ${vnd(minHourlyRate)}/giờ`,
    INVALID_TIME_RANGE: 'Thời gian ca không hợp lệ (tối đa 12 giờ, trong 30 ngày tới)',
    LEAD_TIME_TOO_SHORT: `Ca phải bắt đầu sau ít nhất ${minLeadMinutes} phút`,
    INVALID_HEADCOUNT: 'Số người từ 1 đến 20',
  };
  const violations = estimate?.violations ?? [];
  const blocked = !estimate || estimating || violations.length > 0 || estimate.shortfall > 0;

  async function onSubmit(v: FormValues) {
    setSubmitError(null);
    try {
      const shift = await api<{ id: string; hold_amount: number }>('/shifts', {
        body: {
          shop_id: v.shop_id,
          position_code: v.position_code,
          title: v.title,
          description: v.description || null,
          requirements: v.requirements || null,
          ...toRange(v.date, v.start, v.end),
          break_minutes: v.break_minutes,
          hourly_rate: v.hourly_rate,
          headcount: v.headcount,
          min_rating: Number(v.min_rating),
          favorites_only_minutes: Number(v.favorites_only_minutes),
          is_urgent: false,
        },
      });
      toast.success('Đã đăng ca', {
        description: `Đã tạm giữ ${vnd(shift.hold_amount)} trong ví quán`,
      });
      router.push(`/shop/shifts/${shift.id}`);
      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof ApiClientError ? err.message : 'Không đăng được ca, thử lại sau',
      );
    }
  }

  const fieldError = (name: keyof FormValues) =>
    formState.errors[name] ? (
      <p className="text-xs font-medium text-danger">{formState.errors[name]?.message}</p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      noValidate
    >
      <section className="grid content-start gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        {shops.length > 1 ? (
          <div className="grid gap-2">
            <Label>Quán</Label>
            <Controller
              control={control}
              name="shop_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 w-full" aria-label="Quán">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label>Vị trí</Label>
          <Controller
            control={control}
            name="position_code"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-11 w-full" aria-label="Vị trí">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="title">Tên ca</Label>
          <Input
            id="title"
            className="h-11"
            {...register('title', { onChange: () => setTitleTouched(true) })}
          />
          {fieldError('title')}
        </div>

        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-3">
          <div className="grid gap-2">
            <Label htmlFor="date">Ngày</Label>
            <Input id="date" type="date" min={vnToday()} className="h-11" {...register('date')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="start">Bắt đầu</Label>
            <Input id="start" type="time" step={900} className="h-11" {...register('start')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end">Kết thúc</Label>
            <Input id="end" type="time" step={900} className="h-11" {...register('end')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="hourly_rate">Lương (đ/giờ)</Label>
            <Input
              id="hourly_rate"
              type="number"
              inputMode="numeric"
              step={500}
              min={0}
              className="h-11"
              {...register('hourly_rate', { valueAsNumber: true })}
            />
            {fieldError('hourly_rate')}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="break_minutes">Nghỉ giữa ca (phút)</Label>
            <Input
              id="break_minutes"
              type="number"
              inputMode="numeric"
              step={15}
              min={0}
              max={240}
              className="h-11"
              {...register('break_minutes', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label id="headcount-label">Số người</Label>
          <Controller
            control={control}
            name="headcount"
            render={({ field }) => (
              <div
                className="flex items-center gap-3"
                role="group"
                aria-labelledby="headcount-label"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Bớt một người"
                  onClick={() => field.onChange(Math.max(1, field.value - 1))}
                >
                  <Minus />
                </Button>
                <span className="cn-num w-10 text-center text-3xl" aria-live="polite">
                  {field.value}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Thêm một người"
                  onClick={() => field.onChange(Math.min(20, field.value + 1))}
                >
                  <Plus />
                </Button>
              </div>
            )}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Mô tả công việc</Label>
          <textarea
            id="description"
            rows={3}
            placeholder="Pha chế đồ uống cơ bản, có hướng dẫn đầu ca"
            className="rounded-[var(--radius-control)] border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('description')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="requirements">Yêu cầu</Label>
          <Input
            id="requirements"
            placeholder="Mặc áo trắng, đến trước 10 phút"
            className="h-11"
            {...register('requirements')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Điểm đánh giá tối thiểu</Label>
            <Controller
              control={control}
              name="min_rating"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 w-full" aria-label="Điểm đánh giá tối thiểu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Không yêu cầu</SelectItem>
                    <SelectItem value="4">Từ 4,0★</SelectItem>
                    <SelectItem value="4.5">Từ 4,5★</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Ưu tiên người quen</Label>
            <Controller
              control={control}
              name="favorites_only_minutes"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 w-full" aria-label="Ưu tiên người quen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Không</SelectItem>
                    <SelectItem value="30">30 phút đầu</SelectItem>
                    <SelectItem value="60">60 phút đầu</SelectItem>
                    <SelectItem value="120">2 giờ đầu</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4 lg:sticky lg:top-24">
        <section
          className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
          aria-live="polite"
        >
          <h2 className="font-semibold">Chi phí dự kiến</h2>
          {estimate ? (
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
              <dt className="text-text-muted">Giờ tính lương</dt>
              <dd className="text-right">
                {(estimate.paid_minutes / 60).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}{' '}
                giờ
              </dd>
              <dt className="text-text-muted">Tiền công mỗi người</dt>
              <dd className="cn-num text-right text-base">{vnd(estimate.wage_per_seat)}</dd>
              <dt className="text-text-muted">Phí nền tảng {Math.round(feeRate * 100)}%</dt>
              <dd className="cn-num text-right text-base">{vnd(estimate.fee_per_seat)}</dd>
              <dt className="text-text-muted">Mỗi chỗ</dt>
              <dd className="cn-num text-right text-base">{vnd(estimate.seat_cost)}</dd>
              <dt className="border-t border-border pt-2 font-semibold">
                Tạm giữ ngay ({values.headcount} người)
              </dt>
              <dd
                className="cn-num border-t border-border pt-2 text-right text-3xl text-text"
                data-testid="estimate-total"
              >
                {vnd(estimate.total_due_now)}
              </dd>
              <dt className="text-text-muted">Số dư khả dụng</dt>
              <dd className="text-right">{vnd(estimate.available_balance)}</dd>
            </dl>
          ) : (
            <div className="cn-skel h-40" />
          )}
          {violations.map((code) => (
            <p
              key={code}
              role="alert"
              className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-on-danger-soft"
            >
              {messages[code] ?? code}
            </p>
          ))}
          {estimate && estimate.shortfall > 0 ? (
            <p
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] bg-spark-soft px-3 py-2 text-sm text-on-spark-soft"
            >
              <span className="font-semibold">Còn thiếu {vnd(estimate.shortfall)}</span>
              <Link href="/shop/wallet" className="font-semibold underline">
                Nạp ngay
              </Link>
            </p>
          ) : null}
          <p className="text-xs text-text-muted">
            Người làm thấy nhãn <strong>Đã ký quỹ</strong>. Tiền tạm giữ trả cho người làm khi duyệt
            giờ công; chỗ không ai nhận thì hoàn lại.
          </p>
        </section>
        {submitError ? (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
          >
            {submitError}
          </p>
        ) : null}
        <Button type="submit" size="lg" block disabled={blocked || formState.isSubmitting}>
          {formState.isSubmitting ? 'Đang đăng ca…' : 'Đăng ca'}
        </Button>
      </aside>
    </form>
  );
}
