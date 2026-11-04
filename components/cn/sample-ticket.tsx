import { Badge } from './badge';

// Vé ca tĩnh để trình bày hệ thiết kế (trang chủ, /dev/ui). Component ShiftTicket thật là task P1-16.

type Seat = { name: string; avatar: string };

export function SeatsSample({ headcount, filled }: { headcount: number; filled: Seat[] }) {
  return (
    <div className="cn-seats" aria-label={`${filled.length}/${headcount} chỗ đã có người`}>
      {filled.map((seat) => (
        <span key={seat.name} className="cn-seat" title={seat.name}>
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ */}
          <img src={seat.avatar} alt="" />
        </span>
      ))}
      {Array.from({ length: Math.max(headcount - filled.length, 0) }, (_, i) => (
        <span key={`empty-${i}`} className="cn-seat cn-seat--empty" />
      ))}
      <span className="cn-seats__count">
        {filled.length}/{headcount}
      </span>
    </div>
  );
}

export function SampleTicket({
  shop,
  rating,
  title,
  time,
  day,
  distance,
  pay,
  rate,
  headcount,
  filled,
  urgent = false,
  full = false,
}: {
  shop: string;
  rating: string;
  title: string;
  time: string;
  day: string;
  distance: string;
  pay: string;
  rate: string;
  headcount: number;
  filled: Seat[];
  urgent?: boolean;
  full?: boolean;
}) {
  const classes = ['cn-ticket', urgent && 'cn-ticket--urgent', full && 'cn-ticket--full']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="cn-ticket-wrap">
      <article className={classes}>
        <div className="cn-ticket__main">
          <div className="cn-ticket__shop">
            <span>{shop}</span>
            <span>{rating}★</span>
          </div>
          <h3 className="cn-ticket__title">{title}</h3>
          <p className="cn-ticket__meta">
            <span className="cn-num">{time}</span>
            <span>{day}</span>
            <span>{distance}</span>
          </p>
          <div className="cn-ticket__foot">
            <SeatsSample headcount={headcount} filled={filled} />
            {urgent ? (
              <Badge tone="urgent" icon="zap">
                Ca gấp
              </Badge>
            ) : null}
            <Badge tone="deposit" icon="shield-check">
              Đã ký quỹ
            </Badge>
          </div>
          {full ? <span className="cn-stamp">Đủ người</span> : null}
        </div>
        <div className="cn-ticket__stub">
          <span className="cn-ticket__label">Thu nhập</span>
          <strong className="cn-ticket__pay">{pay}</strong>
          <span className="cn-ticket__rate">{rate}</span>
        </div>
      </article>
    </div>
  );
}
