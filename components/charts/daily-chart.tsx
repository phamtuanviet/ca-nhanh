'use client';

import { Table2 } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fmtDate } from '@/lib/format';

export type ChartSeries = { key: string; label: string; color: string };

type Props = {
  title: string;
  subtitle?: string;
  kind: 'stacked' | 'line';
  days: string[];
  series: ChartSeries[];
  /** values[s][i]: giá trị của chuỗi s ở ngày i; null = không có dữ liệu (chỉ với đường) */
  values: (number | null)[][];
  format: (n: number) => string;
  axisFormat: (n: number) => string;
  /** Trần trục cố định (ví dụ 1 cho tỉ lệ); bỏ trống thì làm tròn từ dữ liệu */
  max?: number;
  /** Dòng tổng trong tooltip của cột chồng */
  totalLabel?: string;
  /** Mờ đi khi đang tải khoảng ngày mới (giữ khung, không nhấp nháy) */
  stale?: boolean;
};

const PLOT_H = 200;
const AXIS_H = 28;
const TOP = 12;
const LEFT = 52;

/** Bước tròn cho trục: 1, 2, 2,5, 5 × 10^k */
function niceMax(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 1, step: 0.25 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return { top: Math.ceil(max / step) * step, step };
}

/** Cột bo 4px ở đầu dữ liệu, vuông ở chân */
function topRounded(x: number, yTop: number, w: number, yBottom: number) {
  const r = Math.min(4, (yBottom - yTop) / 2, w / 2);
  return `M${x},${yBottom}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}V${yBottom}Z`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Biểu đồ theo ngày cho dashboard KPI (theo skill dataviz): cột chồng (≤ 24px, bo 4px đầu dữ liệu,
 * khe 2px giữa các đoạn) hoặc đường 2px có vùng mờ 10% và chấm cuối có vòng nền 2px.
 * Lưới mảnh liền nét; chú giải khi ≥ 2 chuỗi và nhãn trực tiếp ở cột/điểm cuối; hover và phím mũi tên
 * hiện tooltip; nút "Bảng" chuyển sang bảng số liệu (tooltip không phải đường duy nhất để đọc số).
 */
export function DailyChart({
  title,
  subtitle,
  kind,
  days,
  series,
  values,
  format,
  axisFormat,
  max,
  totalLabel,
  stale,
}: Props) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const n = days.length;
  const RIGHT = kind === 'stacked' ? 84 : 56;
  const plotW = Math.max(width - LEFT - RIGHT, 10);
  const band = plotW / Math.max(n, 1);
  const barW = Math.max(2, Math.min(24, band * 0.62));
  const totals = days.map((_, i) => series.reduce((sum, _s, k) => sum + (values[k][i] ?? 0), 0));
  const dataMax =
    max ??
    (kind === 'stacked'
      ? Math.max(...totals, 0)
      : Math.max(...values.flat().map((v) => v ?? 0), 0));
  const { top, step } = max !== undefined ? { top: max, step: max / 4 } : niceMax(dataMax);
  const y = (v: number) => TOP + PLOT_H - (v / top) * PLOT_H;
  const cx = (i: number) => LEFT + band * (i + 0.5);
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 64))));

  function pick(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const i = Math.floor((event.clientX - box.left) / band);
    setActive(Math.max(0, Math.min(n - 1, i)));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, (i: number) => number> = {
      ArrowRight: (i) => Math.min(n - 1, i + 1),
      ArrowLeft: (i) => Math.max(0, i - 1),
      Home: () => 0,
      End: () => n - 1,
    };
    if (event.key === 'Escape') return setActive(null);
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setActive((i) => move(i ?? n - 1));
  }

  const last = n - 1;
  const lastIndexWithValue = (k: number) => {
    for (let i = last; i >= 0; i--) if (values[k][i] !== null) return i;
    return -1;
  };

  // Tooltip: giá trị đậm đi trước, tên chuỗi theo sau
  const tooltip =
    active === null ? null : (
      <div
        className="pointer-events-none absolute top-1 z-10 grid min-w-40 gap-1 rounded-[var(--radius-control)] border border-border bg-surface-raised px-3 py-2 text-xs shadow-[var(--shadow-pop)]"
        style={
          cx(active) > width / 2
            ? { right: Math.max(width - cx(active) + 12, 4) }
            : { left: Math.min(cx(active) + 12, width - 170) }
        }
      >
        <span className="font-medium text-text-muted">{fmtDate(days[active])}</span>
        {kind === 'stacked' && totalLabel ? (
          <span className="flex items-baseline justify-between gap-3">
            <strong className="text-sm text-text">{format(totals[active])}</strong>
            <span className="text-text-muted">{totalLabel}</span>
          </span>
        ) : null}
        {series.map((s, k) => (
          <span key={s.key} className="flex items-center justify-between gap-3">
            <strong className="text-sm text-text">
              {values[k][active] === null ? '—' : format(values[k][active]!)}
            </strong>
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <span
                className="inline-block h-0.5 w-3 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              {s.label}
            </span>
          </span>
        ))}
      </div>
    );

  const announce =
    active === null
      ? ''
      : `${fmtDate(days[active])}: ${series
          .map(
            (s, k) =>
              `${s.label} ${values[k][active] === null ? 'không có' : format(values[k][active]!)}`,
          )
          .join(', ')}`;

  return (
    <figure className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <figcaption className="grid gap-0.5">
          <span className="font-semibold">{title}</span>
          {subtitle ? <span className="text-xs text-text-muted">{subtitle}</span> : null}
        </figcaption>
        <button
          type="button"
          aria-pressed={table}
          onClick={() => setTable((t) => !t)}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-xs font-medium text-text-muted hover:bg-surface-sunken hover:text-text aria-pressed:bg-primary-soft aria-pressed:text-on-primary-soft"
        >
          <Table2 className="size-4" aria-hidden /> Bảng
        </button>
      </div>

      {series.length > 1 && !table ? (
        <ul
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted"
          aria-label="Chú giải"
        >
          {series.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span
                className={kind === 'stacked' ? 'size-2.5 rounded-[2px]' : 'h-0.5 w-3 rounded-full'}
                style={{ background: s.color }}
                aria-hidden
              />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}

      {table ? (
        <div className="max-h-[228px] overflow-auto rounded-[var(--radius-control)] border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-surface-sunken text-xs text-text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Ngày
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                {kind === 'stacked' && totalLabel ? (
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {totalLabel}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {days.map((d, i) => (
                <tr key={d}>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-text-muted">
                    {shortDay(d)}
                  </th>
                  {series.map((s, k) => (
                    <td key={s.key} className="px-3 py-1.5 text-right">
                      {values[k][i] === null ? '—' : format(values[k][i]!)}
                    </td>
                  ))}
                  {kind === 'stacked' && totalLabel ? (
                    <td className="px-3 py-1.5 text-right font-medium">{format(totals[i])}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={ref}
          className={`relative rounded-[var(--radius-control)] outline-none focus-visible:ring-2 focus-visible:ring-ring ${stale ? 'opacity-50 transition-opacity' : ''}`}
          style={{ height: TOP + PLOT_H + AXIS_H }}
          tabIndex={0}
          role="group"
          aria-label={`${title}. Dùng phím mũi tên trái phải để đọc từng ngày, hoặc bấm Bảng để xem số liệu.`}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {width > 0 ? (
            <svg width={width} height={TOP + PLOT_H + AXIS_H} aria-hidden className="block">
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={LEFT}
                    x2={LEFT + plotW}
                    y1={y(t)}
                    y2={y(t)}
                    stroke="var(--border)"
                    strokeWidth={1}
                    shapeRendering="crispEdges"
                  />
                  <text
                    x={LEFT - 8}
                    y={y(t)}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-text-muted text-[11px] tabular-nums"
                  >
                    {axisFormat(t)}
                  </text>
                </g>
              ))}

              {kind === 'stacked'
                ? days.map((d, i) => {
                    let base = TOP + PLOT_H;
                    const x = cx(i) - barW / 2;
                    const visible = series
                      .map((s, k) => ({ s, v: values[k][i] ?? 0 }))
                      .filter(({ v }) => v > 0);
                    return (
                      <g
                        key={d}
                        opacity={active === null || active === i ? 1 : 0.55}
                        className="transition-opacity"
                      >
                        {visible.map(({ s, v }, j) => {
                          const h = (v / top) * PLOT_H;
                          const yTop = base - h;
                          const isTop = j === visible.length - 1;
                          // Khe 2px màu nền giữa hai đoạn chồng nhau
                          const yBottom = j === 0 ? base : base - 2;
                          const path =
                            isTop && yBottom - yTop > 1
                              ? topRounded(x, yTop, barW, yBottom)
                              : `M${x},${yBottom}V${Math.min(yTop, yBottom - 1)}H${x + barW}V${yBottom}Z`;
                          base = yTop;
                          return <path key={s.key} d={path} fill={s.color} />;
                        })}
                      </g>
                    );
                  })
                : series.map((s, k) => {
                    const pts = days
                      .map((_, i) =>
                        values[k][i] === null ? null : ([cx(i), y(values[k][i]!)] as const),
                      )
                      .filter((p): p is readonly [number, number] => p !== null);
                    if (pts.length === 0) return null;
                    const line = pts.map(([px, py], j) => `${j ? 'L' : 'M'}${px},${py}`).join('');
                    const area = `${line}L${pts.at(-1)![0]},${TOP + PLOT_H}L${pts[0][0]},${TOP + PLOT_H}Z`;
                    return (
                      <g key={s.key}>
                        <path d={area} fill={s.color} fillOpacity={0.1} />
                        <path
                          d={line}
                          fill="none"
                          stroke={s.color}
                          strokeWidth={2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}

              {/* Đường dóng khi rê chuột (biểu đồ đường) */}
              {kind === 'line' && active !== null ? (
                <line
                  x1={cx(active)}
                  x2={cx(active)}
                  y1={TOP}
                  y2={TOP + PLOT_H}
                  stroke="var(--border-strong)"
                  strokeWidth={1}
                />
              ) : null}
              {kind === 'line'
                ? series.map((s, k) => {
                    const i = active ?? lastIndexWithValue(k);
                    if (i < 0 || values[k][i] === null) return null;
                    return (
                      <circle
                        key={s.key}
                        cx={cx(i)}
                        cy={y(values[k][i]!)}
                        r={4}
                        fill={s.color}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      />
                    );
                  })
                : null}

              {/* Nhãn trực tiếp ở cuối: giá trị điểm cuối (đường) hoặc tên đoạn của cột cuối (cột chồng) */}
              {kind === 'line'
                ? series.map((s, k) => {
                    const i = lastIndexWithValue(k);
                    if (i < 0) return null;
                    return (
                      <text
                        key={s.key}
                        x={cx(i) + 10}
                        y={y(values[k][i]!)}
                        dy="0.32em"
                        className="fill-text text-xs font-semibold"
                      >
                        {format(values[k][i]!)}
                      </text>
                    );
                  })
                : (() => {
                    let base = TOP + PLOT_H;
                    return series.map((s, k) => {
                      const h = ((values[k][last] ?? 0) / top) * PLOT_H;
                      const mid = base - h / 2;
                      base -= h;
                      return h >= 14 ? (
                        <text
                          key={s.key}
                          x={cx(last) + barW / 2 + 8}
                          y={mid}
                          dy="0.32em"
                          className="fill-text-muted text-[11px]"
                        >
                          {s.label}
                        </text>
                      ) : null;
                    });
                  })()}

              {days.map((d, i) =>
                i % labelEvery === 0 || i === last ? (
                  i !== last && last - i < labelEvery / 2 ? null : (
                    <text
                      key={d}
                      x={cx(i)}
                      y={TOP + PLOT_H + 18}
                      textAnchor="middle"
                      className="fill-text-muted text-[11px] tabular-nums"
                    >
                      {shortDay(d)}
                    </text>
                  )
                ) : null,
              )}

              <rect
                x={LEFT}
                y={TOP}
                width={plotW}
                height={PLOT_H}
                fill="transparent"
                onPointerMove={pick}
                onPointerDown={pick}
                onPointerLeave={() => setActive(null)}
              />
            </svg>
          ) : null}
          {tooltip}
          <span className="sr-only" aria-live="polite">
            {announce}
          </span>
        </div>
      )}
    </figure>
  );
}
