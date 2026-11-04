import { describe, expect, it } from 'vitest';
import { calcFee, calcWage, estimateShift, paidMinutes, vnd } from '@/lib/money';

// Kết quả tham chiếu lấy từ CSDL: select m, r, f, calc_wage(m, r), calc_fee(calc_wage(m, r), f)
// Có cả các trường hợp làm tròn nửa (12750,5 → 12751; 249997,5 → 249998; 1,5 → 2).
const SQL_CASES: [minutes: number, rate: number, feeRate: number, wage: number, fee: number][] = [
  [300, 30000, 0.2, 150000, 30000],
  [240, 25500, 0.2, 102000, 20400],
  [299, 25500, 0.2, 127075, 25415],
  [1, 25500, 0.2, 425, 85],
  [7, 25500, 0.2, 2975, 595],
  [13, 30500, 0.2, 6608, 1322],
  [30, 25501, 0.2, 12751, 2550],
  [450, 33333, 0.18, 249998, 45000],
  [90, 41000, 0.15, 61500, 9225],
  [5, 26001, 0.15, 2167, 325],
  [3, 25500, 0.175, 1275, 223],
  [1, 600, 0.15, 10, 2],
];

describe('calcWage / calcFee khớp SQL', () => {
  it.each(SQL_CASES)('%i phút × %iđ, phí %f → %iđ + %iđ', (minutes, rate, feeRate, wage, fee) => {
    expect(calcWage(minutes, rate)).toBe(wage);
    expect(calcFee(wage, feeRate)).toBe(fee);
  });
});

const settings = { feeRate: 0.2, minHourlyRate: 25500, minLeadMinutes: 30, urgentBoostFee: 20000 };
const now = new Date('2026-11-05T08:00:00+07:00');

describe('estimateShift', () => {
  it('Gherkin 6.2: 17:00–22:00, 30.000đ/giờ, 2 người → tạm giữ 360.000đ', () => {
    const result = estimateShift({
      startAt: new Date('2026-11-05T17:00:00+07:00'),
      endAt: new Date('2026-11-05T22:00:00+07:00'),
      hourlyRate: 30000,
      headcount: 2,
      availableBalance: 2_000_000,
      settings,
      now,
    });
    expect(result).toMatchObject({
      paid_minutes: 300,
      wage_per_seat: 150000,
      fee_per_seat: 30000,
      seat_cost: 180000,
      total_hold: 360000,
      total_due_now: 360000,
      shortfall: 0,
      violations: [],
    });
  });

  it('Gherkin 6.2: số dư 100.000đ → còn thiếu 260.000đ', () => {
    const result = estimateShift({
      startAt: new Date('2026-11-05T17:00:00+07:00'),
      endAt: new Date('2026-11-05T22:00:00+07:00'),
      hourlyRate: 30000,
      headcount: 2,
      availableBalance: 100_000,
      settings,
      now,
    });
    expect(result.shortfall).toBe(260000);
  });

  it('báo vi phạm giống thứ tự kiểm tra của fn_publish_shift', () => {
    const result = estimateShift({
      startAt: new Date('2026-11-05T08:10:00+07:00'),
      endAt: new Date('2026-11-05T21:00:00+07:00'),
      hourlyRate: 20000,
      headcount: 0,
      availableBalance: 0,
      settings,
      now,
    });
    expect(result.violations).toEqual([
      'RATE_BELOW_MINIMUM',
      'INVALID_HEADCOUNT',
      'INVALID_TIME_RANGE',
      'LEAD_TIME_TOO_SHORT',
    ]);
  });

  it('nghỉ giữa ca bị trừ khỏi giờ công; ca gấp cộng phí đẩy', () => {
    const result = estimateShift({
      startAt: new Date('2026-11-05T11:00:00+07:00'),
      endAt: new Date('2026-11-05T15:00:00+07:00'),
      breakMinutes: 30,
      hourlyRate: 30000,
      headcount: 1,
      isUrgent: true,
      availableBalance: 1_000_000,
      settings,
      now,
    });
    expect(result.paid_minutes).toBe(210);
    expect(result.wage_per_seat).toBe(105000);
    expect(result.boost_fee).toBe(20000);
    expect(result.total_due_now).toBe(result.total_hold + 20000);
  });

  it('paidMinutes làm tròn xuống theo phút', () => {
    expect(paidMinutes(new Date('2026-11-05T10:00:00Z'), new Date('2026-11-05T10:59:59Z'), 0)).toBe(
      59,
    );
  });
});

describe('vnd', () => {
  it('định dạng tiền Việt', () => {
    expect(vnd(150000)).toBe('150.000đ');
    expect(vnd(2_000_000)).toBe('2.000.000đ');
  });
});
