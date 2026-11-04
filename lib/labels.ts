import type { BadgeTone } from '@/components/cn/badge';

export const SHIFT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  open: { label: 'Đang mở', tone: 'info' },
  full: { label: 'Đủ người', tone: 'deposit' },
  in_progress: { label: 'Đang diễn ra', tone: 'new' },
  completed: { label: 'Đã xong', tone: 'neutral' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
};

export const BOOKING_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  confirmed: { label: 'Đã nhận', tone: 'info' },
  checked_in: { label: 'Đang làm', tone: 'new' },
  checked_out: { label: 'Chờ duyệt', tone: 'warn' },
  disputed: { label: 'Đang khiếu nại', tone: 'warn' },
  completed: { label: 'Hoàn tất', tone: 'deposit' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },
  no_show: { label: 'Vắng mặt', tone: 'danger' },
};

/** Loại giao dịch trong sổ cái ví */
export const TXN_LABEL: Record<string, string> = {
  topup: 'Nạp tiền',
  hold: 'Tạm giữ cho ca',
  release: 'Hoàn tiền tạm giữ',
  shift_payment: 'Trả tiền công',
  earning: 'Tiền công',
  platform_fee: 'Phí nền tảng',
  boost_fee: 'Phí đẩy ca gấp',
  compensation: 'Bồi thường',
  withdrawal: 'Rút tiền',
  withdrawal_reversal: 'Hoàn tiền rút',
  adjustment: 'Điều chỉnh',
};
