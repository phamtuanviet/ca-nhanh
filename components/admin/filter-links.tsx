import Link from 'next/link';

/** Nhóm bộ lọc dạng liên kết (?key=value): giữ trên URL để chia sẻ và quay lại được */
export function FilterLinks({
  label,
  options,
  current,
  href,
}: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  current: string;
  href: (value: string) => string;
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[var(--radius-control)] bg-surface-sunken p-1"
    >
      {options.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          aria-current={current === o.value ? 'page' : undefined}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[calc(var(--radius-control)-4px)] px-3 text-sm font-medium text-text-muted aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:shadow-sm"
        >
          {o.label}
          {o.count !== undefined ? (
            <span className="text-xs text-text-muted">{o.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** Dựng URL với query mới, bỏ khóa rỗng */
export function withQuery(path: string, params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
