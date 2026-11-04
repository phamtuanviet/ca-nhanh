/** Khung chờ cùng hình dạng với nội dung thật (design/COMPONENTS.md › Skeleton) */
export function Skeleton({
  shape,
  lines = 3,
  count = 1,
}: {
  shape: 'ticket' | 'feed-item' | 'lines';
  lines?: number;
  count?: number;
}) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: count }, (_, i) => {
        if (shape === 'ticket') {
          return <div key={i} className="cn-skel h-[148px] rounded-[var(--radius-ticket)]" />;
        }
        if (shape === 'feed-item') {
          return <div key={i} className="cn-skel h-16 rounded-[var(--radius-control)]" />;
        }
        return (
          <div key={i} className="grid gap-2">
            {Array.from({ length: lines }, (_, j) => (
              <div key={j} className="cn-skel h-4" style={{ width: `${90 - j * 15}%` }} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
