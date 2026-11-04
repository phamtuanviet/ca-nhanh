import { UserRound } from 'lucide-react';

export type Seat = { full_name?: string | null; avatar_url?: string | null };

/**
 * Dãy chỗ của một ca: mỗi chỗ là một avatar hoặc vòng nét đứt, kèm số đếm (design/COMPONENTS.md › SeatSlots).
 * `filledCount` dùng khi chỉ biết số người (kết quả tìm ca), `seats` khi có avatar.
 */
export function SeatSlots({
  headcount,
  seats = [],
  filledCount,
  animateLast = false,
  max = 6,
}: {
  headcount: number;
  seats?: Seat[];
  filledCount?: number;
  animateLast?: boolean;
  max?: number;
}) {
  const filled = Math.min(filledCount ?? seats.length, headcount);
  const shown = Math.min(headcount, max);
  return (
    <div className="cn-seats" aria-label={`${filled}/${headcount} chỗ đã có người`} role="img">
      {Array.from({ length: shown }, (_, i) => {
        if (i >= filled) return <span key={i} className="cn-seat cn-seat--empty" />;
        const seat = seats[i];
        const pop = animateLast && i === filled - 1;
        return (
          <span
            key={i}
            className={pop ? 'cn-seat cn-seat--pop' : 'cn-seat'}
            title={seat?.full_name ?? undefined}
          >
            {seat?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
              <img src={seat.avatar_url} alt="" />
            ) : (
              <span className="flex size-full items-center justify-center rounded-full bg-primary-soft text-on-primary-soft">
                <UserRound className="size-4" aria-hidden />
              </span>
            )}
          </span>
        );
      })}
      <span className="cn-seats__count">
        {filled}/{headcount}
      </span>
    </div>
  );
}
