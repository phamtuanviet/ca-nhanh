/**
 * Ca Nhanh design system — types as documentation.
 * The bundle ships CSS classes (bundle.css) plus vanilla helpers on `window.CaNhanh`.
 * In the Next.js app, port each component to React with the same class names and props.
 */

/** Money is always integer VND. Format with `CaNhanh.vnd(150000)` → "150.000đ". */
export type Vnd = number;
/** ISO 8601 string or Date. Displayed in Asia/Ho_Chi_Minh, 24-hour. */
export type DateLike = string | Date;

export interface ButtonProps {
  /** `primary` = Lam Ca, the default action. `spark` = one urgent action per screen ("Nhận ca gấp"). */
  variant?: 'primary' | 'spark' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  block?: boolean;
  /** Shows a spinner and blocks clicks; keep the label for screen readers. */
  busy?: boolean;
  disabled?: boolean;
  icon?: 'zap' | 'qr-code' | 'wallet' | 'check' | 'arrow-right';
  children: string;
}

export interface BadgeProps {
  tone: 'deposit' | 'urgent' | 'new' | 'info' | 'warn' | 'danger' | 'neutral';
  icon?: 'shield-check' | 'zap' | 'sparkles' | 'clock' | 'alert-triangle';
  children: string;
}

export interface LivePulseProps {
  /** e.g. "Đang tuyển · 12 ca gần bạn". Only one pulsing dot per screen. */
  label: string;
}

export interface ShiftTicketProps {
  shopName: string;
  shopLogoUrl?: string;
  shopRating?: number;
  title: string;
  startAt: DateLike;
  endAt: DateLike;
  hourlyRate: Vnd;
  /** est_wage_per_seat from the API. Shown big on the stub. */
  estEarning: Vnd;
  distanceM?: number;
  headcount: number;
  filled: { avatarUrl: string; name: string }[];
  isUrgent?: boolean;
  /** true when hold_amount > 0: show the "Đã ký quỹ" badge. */
  deposited?: boolean;
  state?: 'open' | 'full' | 'booked';
  onOpen?: () => void;
}

export interface SeatSlotsProps {
  headcount: number;
  filled: { avatarUrl: string; name: string }[];
  /** Animate the newest seat (realtime booking). */
  animateLast?: boolean;
}

export interface StampProps {
  text: 'Đã nhận' | 'Đủ người' | 'Đã ký quỹ' | 'Vắng mặt';
  tone?: 'primary' | 'money' | 'danger';
}

export interface CountdownProps {
  target: DateLike;
  label?: string;
  doneLabel?: string;
}

export interface QrKioskProps {
  shopName: string;
  /** From GET /shops/{id}/checkin-token. Rotates every `seconds`. */
  token: string;
  seconds?: 30;
  checkedInToday: { name: string; at: DateLike }[];
}

export interface WalletOdometerProps {
  balance: Vnd;
  /** When the balance increases by a settlement, show "+amount" and a short confetti once. */
  lastCredit?: Vnd;
  celebrate?: boolean;
}

export interface ShiftFeedProps {
  items: { id: string; shopName: string; title: string; startAt: DateLike; estEarning: Vnd; distanceM: number; coverUrl?: string }[];
  /** Max items kept on screen; older ones drop off the bottom. */
  max?: number;
}

export interface EmptyStateProps {
  illustration: 'empty-shifts' | 'empty-bookings' | 'wallet-paid' | 'kyc-verify' | 'qr-scan' | 'shop-onboarding';
  title: string;
  text: string;
  action?: { label: string; href: string };
}

export interface SkeletonProps {
  /** Mirror the real layout: ticket, feed-item or text lines. */
  shape: 'ticket' | 'feed-item' | 'lines';
  lines?: number;
}

export interface KioskHandle { stop(): void }

export interface CaNhanhHelpers {
  version: string;
  reduced(): boolean;
  vnd(amount: Vnd): string;
  fakeQr(svg: SVGSVGElement, seed: number): void;
  kiosk(root: HTMLElement, opts?: { seconds?: number; onRotate?(window: number): void }): KioskHandle;
  odometer(el: HTMLElement, value: Vnd, opts?: { suffix?: string }): void;
  gain(host: HTMLElement, anchor: HTMLElement, amount: Vnd): void;
  confetti(host: HTMLElement, opts?: { x?: number; y?: number; count?: number; duration?: number }): void;
  fillSeat(container: HTMLElement, src: string, alt?: string): boolean;
  stamp(host: HTMLElement, text: string, tone?: 'money' | 'danger'): HTMLElement;
  countdown(el: HTMLElement, target: DateLike, opts?: { doneLabel?: string }): KioskHandle;
  pushShift(list: HTMLElement, item: HTMLElement): void;
}

declare global {
  interface Window { CaNhanh: CaNhanhHelpers }
}
