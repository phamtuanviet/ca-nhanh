'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useState } from 'react';
import { DailyChart } from '@/components/charts/daily-chart';
import { PageHeader } from '@/components/layout/page';
import { compactVnd, pct, vnDate, vnd } from '@/lib/format';
import { api } from '@/lib/http';
import type { KpiReport } from '@/lib/services/admin';

const PRESETS = [7, 30, 60, 90] as const;
const DAY = 86_400_000;

function rangeOf(days: number) {
  const to = vnDate();
  const from = vnDate(new Date(new Date(`${to}T12:00:00+07:00`).getTime() - (days - 1) * DAY));
  return { from, to };
}

type Tile = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  /** Chênh lệch so với kỳ trước: % cho số lượng, điểm % cho tỉ lệ */
  delta: { text: string; dir: -1 | 0 | 1; good: boolean } | null;
  hero?: boolean;
};

function ratioDelta(cur: number | null, prev: number | null, upIsGood: boolean): Tile['delta'] {
  if (cur === null || prev === null) return null;
  const d = (cur - prev) * 100;
  const dir = Math.abs(d) < 0.05 ? 0 : d > 0 ? 1 : -1;
  return {
    text: `${d > 0 ? '+' : ''}${d.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} điểm %`,
    dir,
    good: dir === 0 || dir > 0 === upIsGood,
  };
}

function countDelta(cur: number | null, prev: number | null, upIsGood: boolean): Tile['delta'] {
  if (cur === null || prev === null || prev === 0) return null;
  const d = ((cur - prev) / prev) * 100;
  const dir = Math.abs(d) < 0.5 ? 0 : d > 0 ? 1 : -1;
  return {
    text: `${d > 0 ? '+' : ''}${d.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}%`,
    dir,
    good: dir === 0 || dir > 0 === upIsGood,
  };
}

/** A1: dashboard KPI (P3-04, Gherkin 02 §6.10) */
export function KpiDashboard({
  initial,
  initialDays,
}: {
  initial: KpiReport;
  initialDays: number;
}) {
  const [days, setDays] = useState(initialDays);
  const { data, isPlaceholderData, isError } = useQuery({
    queryKey: ['kpis', days],
    queryFn: ({ signal }) => {
      const { from, to } = rangeOf(days);
      return api<KpiReport>(`/admin/kpis?from=${from}&to=${to}`, { signal });
    },
    initialData: days === initialDays ? initial : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const k = data ?? initial;
  const p = k.previous;
  // Đang tải khoảng mới: giữ số liệu cũ, làm mờ (không khung xương, không nhảy bố cục)
  const stale = isPlaceholderData;

  const tiles: Tile[] = [
    {
      key: 'gmv',
      label: 'GMV',
      value: compactVnd(k.gmv),
      sub: 'Tiền công + phí của ca đã hoàn tất',
      delta: countDelta(k.gmv, p.gmv, true),
      hero: true,
    },
    {
      key: 'fee',
      label: 'Doanh thu phí',
      value: compactVnd(k.fee_revenue + k.boost_revenue),
      sub:
        k.boost_revenue > 0
          ? `gồm ${compactVnd(k.boost_revenue)} phí đẩy ca gấp`
          : 'Phí nền tảng 20%',
      delta: countDelta(k.fee_revenue + k.boost_revenue, p.fee_revenue + p.boost_revenue, true),
    },
    {
      key: 'shifts',
      label: 'Ca đã đăng',
      value: k.shifts_posted.toLocaleString('vi-VN'),
      sub: `${k.seats_filled.toLocaleString('vi-VN')}/${k.seats_posted.toLocaleString('vi-VN')} chỗ có người`,
      delta: countDelta(k.shifts_posted, p.shifts_posted, true),
    },
    {
      key: 'fill',
      label: 'Fill rate',
      value: pct(k.fill_rate),
      sub: 'Tỉ lệ chỗ có người nhận',
      delta: ratioDelta(k.fill_rate, p.fill_rate, true),
    },
    {
      key: 'ttf',
      label: 'Time-to-fill trung vị',
      value:
        k.median_minutes_to_fill === null ? '—' : `${Math.round(k.median_minutes_to_fill)} phút`,
      sub: 'Từ lúc đăng đến khi đủ người',
      delta: countDelta(k.median_minutes_to_fill, p.median_minutes_to_fill, false),
    },
    {
      key: 'noshow',
      label: 'Tỉ lệ vắng mặt',
      value: pct(k.no_show_rate),
      sub: 'Trên số chỗ có người nhận',
      delta: ratioDelta(k.no_show_rate, p.no_show_rate, false),
    },
    {
      key: 'workers',
      label: 'Người làm hoạt động',
      value: k.active_workers.toLocaleString('vi-VN'),
      sub: `${k.active_shops} quán có đăng ca`,
      delta: countDelta(k.active_workers, p.active_workers, true),
    },
    {
      key: 'rebook',
      label: 'Tỉ lệ mời lại',
      value: pct(k.rebook_rate),
      sub: 'Ca hoàn tất với người từng làm ở quán',
      delta: ratioDelta(k.rebook_rate, p.rebook_rate, true),
    },
  ];

  const dayList = k.daily.map((d) => d.day);

  return (
    <>
      <PageHeader title="KPI" description="Sức khỏe chợ ca: tiền, tốc độ lấp chỗ và độ tin cậy" />

      {/* Bộ lọc: một hàng phía trên, áp cho mọi thẻ số và biểu đồ */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Khoảng thời gian"
          className="inline-flex rounded-[var(--radius-control)] bg-surface-sunken p-1"
        >
          {PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className="h-8 rounded-[calc(var(--radius-control)-4px)] px-3 text-sm font-medium text-text-muted aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow-sm"
            >
              {d} ngày qua
            </button>
          ))}
        </div>
        <span className="text-xs text-text-muted" aria-live="polite">
          {isError
            ? 'Không tải được số liệu, đang hiện khoảng trước'
            : `${k.from.split('-').reverse().slice(0, 2).join('/')} – ${k.to.split('-').reverse().slice(0, 2).join('/')} · so với ${days} ngày liền trước`}
        </span>
      </div>

      <div
        className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${stale ? 'opacity-50 transition-opacity' : ''}`}
        data-testid="kpi-tiles"
      >
        {tiles.map((t) => (
          <section
            key={t.key}
            className={`grid content-start gap-1 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] ${t.hero ? 'col-span-2 lg:col-span-1' : ''}`}
            aria-label={t.label}
          >
            <h2 className="text-xs font-semibold text-text-muted">{t.label}</h2>
            <strong
              className={`font-semibold tracking-tight text-text ${t.hero ? 'text-4xl' : 'text-2xl'}`}
            >
              {t.value}
            </strong>
            {t.delta ? (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                  t.delta.dir === 0
                    ? 'text-text-muted'
                    : t.delta.good
                      ? 'text-money'
                      : 'text-danger'
                }`}
              >
                {t.delta.dir > 0 ? (
                  <ArrowUpRight className="size-3.5" aria-hidden />
                ) : t.delta.dir < 0 ? (
                  <ArrowDownRight className="size-3.5" aria-hidden />
                ) : (
                  <Minus className="size-3.5" aria-hidden />
                )}
                {t.delta.text}
                <span className="sr-only">
                  {' '}
                  so với kỳ trước,{' '}
                  {t.delta.dir === 0 ? 'không đổi' : t.delta.good ? 'tốt lên' : 'xấu đi'}
                </span>
              </span>
            ) : (
              <span className="text-xs text-text-muted">Chưa có kỳ trước để so</span>
            )}
            {t.sub ? <span className="text-xs text-text-muted">{t.sub}</span> : null}
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <DailyChart
          title="GMV theo ngày"
          subtitle={`${dayList.length} ngày · ngày bắt đầu ca`}
          kind="stacked"
          days={dayList}
          series={[
            { key: 'wage', label: 'Tiền công', color: 'var(--chart-1)' },
            { key: 'fee', label: 'Phí nền tảng', color: 'var(--chart-2)' },
          ]}
          values={[k.daily.map((d) => d.gmv - d.fee_revenue), k.daily.map((d) => d.fee_revenue)]}
          format={vnd}
          axisFormat={(n) => (n === 0 ? '0' : compactVnd(n, true))}
          totalLabel="GMV"
          stale={stale}
        />
        <DailyChart
          title="Fill rate theo ngày"
          subtitle="Tỉ lệ chỗ có người nhận"
          kind="line"
          days={dayList}
          series={[{ key: 'fill', label: 'Fill rate', color: 'var(--chart-1)' }]}
          values={[k.daily.map((d) => (d.seats_posted > 0 ? d.fill_rate : null))]}
          format={(n) => pct(n)}
          axisFormat={(n) => pct(n, 0)}
          max={1}
          stale={stale}
        />
      </div>
    </>
  );
}
