'use client';

import { FastForward, PlayCircle, RotateCcw, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/cn/badge';
import { PageHeader } from '@/components/layout/page';
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
import { fmtDay, fmtRange, vnd } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import { SHIFT_STATUS } from '@/lib/labels';
import type { DemoShift } from '@/lib/services/demo';

const TICK_LABEL: Record<string, string> = {
  reminders: 'Nhắc ca',
  started: 'Ca bắt đầu',
  no_shows: 'Vắng mặt',
  auto_checkouts: 'Tự check-out',
  auto_approved: 'Tự duyệt',
  completed: 'Ca hoàn tất',
  expired_payments: 'Lệnh nạp hết hạn',
};

const card =
  'grid content-start gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]';
const errorText = (err: unknown) =>
  err instanceof ApiClientError ? err.message : 'Không thực hiện được';

/** P3-06: công cụ cho người thuyết trình (kịch bản demo 02 §8) */
export function DemoTools({ shifts, minLead }: { shifts: DemoShift[]; minLead: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState<Record<string, number> | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  async function runTick() {
    setBusy('tick');
    try {
      const result = await api<Record<string, number>>('/admin/demo/tick', { body: {} });
      setTick(result);
      const total = Object.values(result).reduce((a, b) => a + b, 0);
      toast.success(
        total ? `Bộ hẹn giờ đã xử lý ${total} việc` : 'Bộ hẹn giờ chạy xong, không có việc nào',
      );
      router.refresh();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function jump(id: string, to: 'start' | 'end') {
    setBusy(`${id}:${to}`);
    try {
      await api('/admin/demo/fast-forward', { body: { shift_id: id, to } });
      toast.success(to === 'start' ? 'Đã tua tới giờ bắt đầu' : 'Đã tua tới giờ kết thúc');
      router.refresh();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function quickLead() {
    setBusy('lead');
    try {
      await api('/admin/settings', {
        method: 'PATCH',
        body: { min_lead_minutes: minLead === 2 ? 30 : 2 },
      });
      toast.success(
        minLead === 2 ? 'Đã đặt lại: đăng ca trước 30 phút' : 'Đã đặt: đăng ca trước 2 phút',
      );
      router.refresh();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Công cụ demo" description="Dùng trước và trong buổi thuyết trình 5 phút" />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className={card} aria-labelledby="demo-reset">
          <h2 id="demo-reset" className="inline-flex items-center gap-2 font-semibold">
            <RotateCcw className="size-4 text-primary" aria-hidden /> Reset dữ liệu demo
          </h2>
          <p className="text-sm text-text-muted">
            Xóa mọi ca, booking, giao dịch; sinh lại lịch sử để dashboard KPI có số liệu; nạp sẵn
            tiền cho ví quán; gỡ mọi tạm khóa.
          </p>
          <Button variant="destructive" onClick={() => setResetOpen(true)} disabled={busy !== null}>
            Reset dữ liệu demo…
          </Button>
        </section>

        <section className={card} aria-labelledby="demo-tick">
          <h2 id="demo-tick" className="inline-flex items-center gap-2 font-semibold">
            <PlayCircle className="size-4 text-primary" aria-hidden /> Bộ hẹn giờ
          </h2>
          <p className="text-sm text-text-muted">
            pg_cron tự chạy mỗi phút. Bấm để chạy ngay: nhắc ca, vắng mặt, tự check-out, tự duyệt,
            hoàn tất ca.
          </p>
          <Button variant="outline" onClick={runTick} disabled={busy !== null}>
            {busy === 'tick' ? 'Đang chạy…' : 'Chạy ngay'}
          </Button>
          {tick ? (
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm" aria-live="polite">
              {Object.entries(tick).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-text-muted">{TICK_LABEL[k] ?? k}</dt>
                  <dd className="text-right tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <section className={card} aria-labelledby="demo-lead">
          <h2 id="demo-lead" className="inline-flex items-center gap-2 font-semibold">
            <Timer className="size-4 text-primary" aria-hidden /> Đăng ca sát giờ
          </h2>
          <p className="text-sm text-text-muted">
            Hiện tại ca phải bắt đầu sau ít nhất{' '}
            <strong className="text-text">{minLead} phút</strong> kể từ lúc đăng. Kịch bản demo đặt
            2 phút để đăng ca &ldquo;bắt đầu sau 10 phút&rdquo;.
          </p>
          <Button variant="outline" onClick={quickLead} disabled={busy !== null}>
            {minLead === 2 ? 'Đặt lại 30 phút' : 'Đặt 2 phút cho demo'}
          </Button>
        </section>
      </div>

      <section className={`${card} mt-5`} aria-labelledby="demo-ff">
        <h2 id="demo-ff" className="inline-flex items-center gap-2 font-semibold">
          <FastForward className="size-4 text-primary" aria-hidden /> Tua thời gian từng ca
        </h2>
        <p className="text-sm text-text-muted">
          Dời ca để bắt đầu sau 1 phút, hoặc vừa kết thúc 1 phút trước. Giờ check-in đã có dời theo,
          nên giờ công vẫn đủ.
        </p>
        {shifts.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            Không có ca nào đang mở hoặc diễn ra trong 48 giờ tới.
          </p>
        ) : (
          <ul className="divide-y divide-border" data-testid="demo-shifts">
            {shifts.map((s) => {
              const st = SHIFT_STATUS[s.status] ?? { label: s.status, tone: 'neutral' as const };
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid min-w-52 flex-1 gap-0.5">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-xs text-text-muted">
                      {s.shop_name} · {fmtRange(s.start_at, s.end_at)} {fmtDay(s.start_at)} ·{' '}
                      {s.filled_count}/{s.headcount} người
                    </span>
                  </span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <span className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => jump(s.id, 'start')}
                      disabled={busy !== null || s.status === 'in_progress'}
                    >
                      {busy === `${s.id}:start` ? 'Đang tua…' : 'Tới giờ bắt đầu'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => jump(s.id, 'end')}
                      disabled={busy !== null}
                    >
                      {busy === `${s.id}:end` ? 'Đang tua…' : 'Tới giờ kết thúc'}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ResetDialog
        key={resetOpen ? 'open' : 'closed'}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onDone={() => router.refresh()}
      />
    </>
  );
}

/** Reset có bước xác nhận: gõ RESET mới bấm được (Gherkin 02 §6.11 kịch bản 2) */
function ResetDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [days, setDays] = useState('60');
  const [balance, setBalance] = useState('2000000');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ history_shifts: number; shop_balance: number }>(
        '/admin/demo/reset',
        {
          body: { days: Number(days), shop_balance: Number(balance) },
        },
      );
      toast.success('Đã reset dữ liệu demo', {
        description: `${result.history_shifts} ca lịch sử; mỗi ví quán ${vnd(result.shop_balance)}`,
      });
      onOpenChange(false);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset dữ liệu demo?</DialogTitle>
          <DialogDescription>
            Mọi ca, booking, giao dịch và thông báo bị xóa. Tài khoản và quán giữ nguyên. Không hoàn
            tác được.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="reset-days">Số ngày lịch sử</Label>
            <Input
              id="reset-days"
              inputMode="numeric"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reset-balance">Số dư mỗi ví quán (đ)</Label>
            <Input
              id="reset-balance"
              inputMode="numeric"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reset-confirm">
            Gõ <strong>RESET</strong> để xác nhận
          </Label>
          <Input
            id="reset-confirm"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Thôi
          </Button>
          <Button variant="danger" onClick={reset} disabled={pending || confirm.trim() !== 'RESET'}>
            {pending ? 'Đang reset…' : 'Reset dữ liệu'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
