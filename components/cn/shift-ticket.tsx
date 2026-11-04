import Link from 'next/link';
import { ViewTransition } from 'react';
import { fmtDay, fmtDistance, fmtRange, vnd } from '@/lib/format';
import { Badge } from './badge';
import { SeatSlots, type Seat } from './seat-slots';
import { Stamp } from './stamp';

export type ShiftTicketProps = {
  href: string;
  shopName: string;
  shopLogoUrl?: string | null;
  shopRating?: number | null;
  title: string;
  startAt: string;
  endAt: string;
  hourlyRate: number;
  /** est_wage_per_seat: thu nhập dự kiến mỗi người */
  estEarning: number;
  distanceM?: number | null;
  headcount: number;
  filledCount?: number;
  seats?: Seat[];
  isUrgent?: boolean;
  /** hold_amount > 0: hiện nhãn "Đã ký quỹ" */
  deposited?: boolean;
  isNew?: boolean;
  state?: 'open' | 'full' | 'booked';
  animateLastSeat?: boolean;
  /** Tên chuyển cảnh dùng chung với khung đầu trang chi tiết: vé "nở" thành trang chi tiết (P3-08) */
  transitionName?: string;
};

/**
 * Vé ca: một ca, giờ và tiền trên cùng một tấm vé (design/COMPONENTS.md › ShiftTicket).
 * Cả vé là một liên kết mở chi tiết; không đặt nút "Nhận ca" trong danh sách.
 */
export function ShiftTicket(props: ShiftTicketProps) {
  const state = props.state ?? 'open';
  const classes = [
    'cn-ticket',
    props.isUrgent && 'cn-ticket--urgent',
    state === 'full' && 'cn-ticket--full',
  ]
    .filter(Boolean)
    .join(' ');
  const meta = [fmtDay(props.startAt), fmtDistance(props.distanceM)].filter(Boolean);

  return (
    <div className={props.isNew ? 'cn-ticket-wrap cn-ticket-wrap--arrive' : 'cn-ticket-wrap'}>
      <ViewTransition name={props.transitionName} share="morph" default="none">
        <Link href={props.href} className={classes} prefetch={false}>
          <div className="cn-ticket__main">
            <div className="cn-ticket__shop">
              {props.shopLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa đã nén sẵn
                <img src={props.shopLogoUrl} alt="" width={28} height={28} />
              ) : null}
              <span>{props.shopName}</span>
              {props.shopRating ? <span>{props.shopRating.toFixed(1)}★</span> : null}
            </div>
            <h3 className="cn-ticket__title">{props.title}</h3>
            <p className="cn-ticket__meta">
              <span className="cn-num">{fmtRange(props.startAt, props.endAt)}</span>
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </p>
            <div className="cn-ticket__foot">
              <SeatSlots
                headcount={props.headcount}
                seats={props.seats}
                filledCount={props.filledCount}
                animateLast={props.animateLastSeat}
                max={4}
              />
              {props.isNew ? (
                <Badge tone="new" icon="sparkles">
                  Mới
                </Badge>
              ) : null}
              {props.isUrgent ? (
                <Badge tone="urgent" icon="zap">
                  Ca gấp
                </Badge>
              ) : null}
              {props.deposited ? (
                <Badge tone="deposit" icon="shield-check">
                  Đã ký quỹ
                </Badge>
              ) : null}
            </div>
            {state === 'full' ? <Stamp text="Đủ người" /> : null}
            {state === 'booked' ? <Stamp text="Đã nhận" /> : null}
          </div>
          <div className="cn-ticket__stub">
            <span className="cn-ticket__label">Thu nhập</span>
            <strong className="cn-ticket__pay">{vnd(props.estEarning)}</strong>
            <span className="cn-ticket__rate">{vnd(props.hourlyRate)}/giờ</span>
          </div>
        </Link>
      </ViewTransition>
    </div>
  );
}
