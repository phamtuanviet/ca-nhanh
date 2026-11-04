// Tính tiền ca, khớp từng đồng với fn_publish_shift / calc_wage / calc_fee trong CSDL (BR-06, BR-17).
// Dùng số nguyên để tránh sai số dấu phẩy động; round() của Postgres với số dương là làm tròn nửa lên.

/** round(a / b) kiểu Postgres cho a ≥ 0, b > 0 */
function roundDiv(a: number, b: number): number {
  return Math.floor((2 * a + b) / (2 * b));
}

/** Tỉ lệ phí (0.2) → điểm cơ bản (2000) để tính bằng số nguyên */
function basisPoints(rate: number): number {
  return Math.round(rate * 10000);
}

/** calc_wage: round(phút × lương giờ / 60) */
export function calcWage(minutes: number, hourlyRate: number): number {
  return roundDiv(Math.max(minutes, 0) * hourlyRate, 60);
}

/** calc_fee: round(tiền công × tỉ lệ phí) */
export function calcFee(wage: number, feeRate: number): number {
  return roundDiv(wage * basisPoints(feeRate), 10000);
}

/** Số phút tính lương: floor((kết thúc − bắt đầu) / 60 giây) − phút nghỉ */
export function paidMinutes(startAt: Date, endAt: Date, breakMinutes = 0): number {
  return Math.floor((endAt.getTime() - startAt.getTime()) / 60000) - breakMinutes;
}

export type EstimateViolation =
  'RATE_BELOW_MINIMUM' | 'INVALID_HEADCOUNT' | 'INVALID_TIME_RANGE' | 'LEAD_TIME_TOO_SHORT';

export type ShiftEstimate = {
  paid_minutes: number;
  wage_per_seat: number;
  fee_rate: number;
  fee_per_seat: number;
  seat_cost: number;
  total_hold: number;
  boost_fee: number;
  total_due_now: number;
  available_balance: number;
  shortfall: number;
  violations: EstimateViolation[];
};

export type EstimateInput = {
  startAt: Date;
  endAt: Date;
  breakMinutes?: number;
  hourlyRate: number;
  headcount: number;
  isUrgent?: boolean;
  availableBalance: number;
  settings: {
    feeRate: number;
    minHourlyRate: number;
    minLeadMinutes: number;
    urgentBoostFee: number;
  };
  now?: Date;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Ước tính chi phí đăng ca (POST /shifts/estimate) với cùng thứ tự kiểm tra như fn_publish_shift */
export function estimateShift(input: EstimateInput): ShiftEstimate {
  const { startAt, endAt, hourlyRate, headcount, settings } = input;
  const breakMinutes = input.breakMinutes ?? 0;
  const now = input.now ?? new Date();
  const violations: EstimateViolation[] = [];

  if (hourlyRate < settings.minHourlyRate) violations.push('RATE_BELOW_MINIMUM');
  if (!Number.isInteger(headcount) || headcount < 1 || headcount > 20)
    violations.push('INVALID_HEADCOUNT');
  const duration = endAt.getTime() - startAt.getTime();
  const minutes = paidMinutes(startAt, endAt, breakMinutes);
  if (
    duration <= 0 ||
    duration > 12 * HOUR ||
    startAt.getTime() > now.getTime() + 30 * DAY ||
    minutes <= 0
  ) {
    violations.push('INVALID_TIME_RANGE');
  }
  if (startAt.getTime() < now.getTime() + settings.minLeadMinutes * 60_000) {
    violations.push('LEAD_TIME_TOO_SHORT');
  }

  const seats = Math.max(Number.isInteger(headcount) ? headcount : 0, 0);
  const wage = calcWage(Math.max(minutes, 0), hourlyRate);
  const fee = calcFee(wage, settings.feeRate);
  const seatCost = wage + fee;
  const totalHold = seatCost * seats;
  const boostFee = input.isUrgent ? settings.urgentBoostFee : 0;
  const totalDue = totalHold + boostFee;

  return {
    paid_minutes: Math.max(minutes, 0),
    wage_per_seat: wage,
    fee_rate: settings.feeRate,
    fee_per_seat: fee,
    seat_cost: seatCost,
    total_hold: totalHold,
    boost_fee: boostFee,
    total_due_now: totalDue,
    available_balance: input.availableBalance,
    shortfall: Math.max(totalDue - input.availableBalance, 0),
    violations,
  };
}

/** 150000 → "150.000đ" */
export function vnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}
