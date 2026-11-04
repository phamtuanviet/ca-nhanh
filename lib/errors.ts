// Danh mục mã lỗi API, khớp docs/05-API-Specification.md §9 (kiểm bằng tests/unit/errors.test.ts).
// Hàm fn_* trong CSDL dùng RAISE EXCEPTION '<MÃ>' (SQLSTATE P0001) nên message của lỗi chính là mã.

type ErrorDef = {
  status: number;
  /** Thông điệp dùng khi không có đủ dữ liệu để điền vào template */
  message: string;
  /** Thông điệp có chỗ trống {…}, điền từ `details` (xem PLACEHOLDERS) */
  template?: string;
};

export const ERRORS = {
  VALIDATION_ERROR: { status: 400, message: 'Dữ liệu không hợp lệ' },
  IDEMPOTENCY_KEY_REQUIRED: { status: 400, message: 'Thiếu header Idempotency-Key' },
  UNAUTHENTICATED: { status: 401, message: 'Vui lòng đăng nhập' },
  INVALID_SIGNATURE: { status: 401, message: 'Chữ ký webhook không hợp lệ' },
  FORBIDDEN: { status: 403, message: 'Bạn không có quyền thực hiện thao tác này' },
  ACCOUNT_LOCKED: { status: 403, message: 'Tài khoản đang bị khóa' },
  DEMO_DISABLED: { status: 403, message: 'Chỉ dùng được ở chế độ demo' },
  AGE_RESTRICTED: { status: 403, message: 'Ca Nhanh chỉ nhận người làm từ 18 tuổi' },
  KYC_REQUIRED: { status: 403, message: 'Bạn cần xác minh danh tính trước khi nhận ca' },
  ACCOUNT_SUSPENDED: {
    status: 403,
    message: 'Bạn đang bị tạm khóa nhận ca',
    template: 'Bạn đang bị tạm khóa nhận ca đến {thời điểm}',
  },
  BLOCKED_BY_SHOP: { status: 403, message: 'Bạn không thể nhận ca của quán này' },
  FAVORITES_ONLY: {
    status: 403,
    message: 'Ca đang ưu tiên người quen của quán',
    template: 'Ca đang ưu tiên người quen của quán đến {giờ}',
  },
  RATING_TOO_LOW: {
    status: 403,
    message: 'Ca yêu cầu điểm đánh giá cao hơn',
    template: 'Ca yêu cầu điểm đánh giá tối thiểu {x}',
  },
  SHOP_NOT_VERIFIED: { status: 403, message: 'Quán đang chờ duyệt, chưa đăng ca được' },
  SHOP_INACTIVE: { status: 403, message: 'Quán đang tạm ngưng' },
  NOT_FOUND: { status: 404, message: 'Không tìm thấy' },
  PAYMENT_NOT_FOUND: { status: 404, message: 'Không tìm thấy lệnh thanh toán' },
  SHIFT_FULL: { status: 409, message: 'Ca vừa đủ người' },
  SHIFT_NOT_OPEN: { status: 409, message: 'Ca không còn nhận người' },
  ALREADY_BOOKED: { status: 409, message: 'Bạn đã nhận ca này rồi' },
  BOOKING_OVERLAP: { status: 409, message: 'Bạn đã có ca trùng giờ' },
  TOO_LATE_TO_CANCEL: { status: 409, message: 'Ca đã bắt đầu, không thể hủy' },
  INVALID_STATE: { status: 409, message: 'Trạng thái hiện tại không cho phép thao tác này' },
  ROLE_LOCKED: { status: 409, message: 'Không thể đổi vai trò sau khi đã hoàn tất đăng ký' },
  KYC_PENDING: { status: 409, message: 'Hồ sơ xác minh đang chờ duyệt' },
  ALREADY_SETTLED: { status: 409, message: 'Ca này đã được quyết toán' },
  DISPUTE_NOT_ALLOWED: { status: 409, message: 'Không thể khiếu nại ở trạng thái này' },
  ALREADY_REVIEWED: { status: 409, message: 'Bạn đã đánh giá ca này' },
  REVIEW_WINDOW_CLOSED: { status: 409, message: 'Đã quá 7 ngày, không thể đánh giá' },
  PROFILE_INCOMPLETE: { status: 422, message: 'Hãy hoàn thiện hồ sơ trước' },
  FIELD_NOT_EDITABLE: {
    status: 422,
    message: 'Không sửa giờ và lương sau khi đăng ca. Hãy hủy và đăng lại',
  },
  RATE_BELOW_MINIMUM: { status: 422, message: 'Lương tối thiểu là 25.500đ/giờ' },
  INVALID_TIME_RANGE: {
    status: 422,
    message: 'Thời gian ca không hợp lệ (tối đa 12 giờ, trong 30 ngày tới)',
  },
  LEAD_TIME_TOO_SHORT: {
    status: 422,
    message: 'Ca phải bắt đầu muộn hơn',
    template: 'Ca phải bắt đầu sau ít nhất {n} phút',
  },
  INVALID_HEADCOUNT: { status: 422, message: 'Số người không hợp lệ' },
  INSUFFICIENT_BALANCE: { status: 422, message: 'Số dư không đủ' },
  AMOUNT_OUT_OF_RANGE: { status: 422, message: 'Số tiền không hợp lệ' },
  BANK_ACCOUNT_MISSING: { status: 422, message: 'Hãy thêm tài khoản ngân hàng nhận tiền' },
  ADJUSTMENT_NOTE_REQUIRED: { status: 422, message: 'Nhập lý do điều chỉnh (tối thiểu 5 ký tự)' },
  QR_INVALID: { status: 422, message: 'Mã QR không hợp lệ' },
  QR_EXPIRED: { status: 422, message: 'Mã QR đã hết hạn, hãy quét mã mới trên màn hình quán' },
  WRONG_SHOP: { status: 422, message: 'Mã QR không thuộc quán của ca này' },
  OUTSIDE_CHECKIN_WINDOW: {
    status: 422,
    message: 'Chưa tới giờ check-in (mở trước giờ bắt đầu 30 phút)',
  },
  LOCATION_REQUIRED: { status: 422, message: 'Hãy bật định vị để chấm công' },
  OUT_OF_GEOFENCE: {
    status: 422,
    message: 'Bạn đang ở ngoài khu vực quán',
    template: 'Bạn đang ở ngoài khu vực quán (cách {d} m)',
  },
  RATE_LIMITED: { status: 429, message: 'Thao tác quá nhanh, thử lại sau ít giây' },
  INTERNAL_ERROR: { status: 500, message: 'Có lỗi xảy ra, vui lòng thử lại' },
} as const satisfies Record<string, ErrorDef>;

export type ErrorCode = keyof typeof ERRORS;

/** Mã CSDL báo lỗi bất biến nội bộ, trả cho client dưới dạng 500 INTERNAL_ERROR */
export const INTERNAL_DB_CODES = new Set(['WALLET_NOT_FOUND']);

/** Chỗ trống trong template → khóa trong `details` */
const PLACEHOLDERS: Record<string, string> = {
  '{thời điểm}': 'until',
  '{giờ}': 'until',
  '{x}': 'min_rating',
  '{n}': 'min_lead_minutes',
  '{d}': 'distance_m',
};

function formatValue(placeholder: string, value: unknown): string {
  if ((placeholder === '{thời điểm}' || placeholder === '{giờ}') && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        ...(placeholder === '{thời điểm}' ? { day: '2-digit', month: '2-digit' } : {}),
      });
    }
  }
  return String(value);
}

export function errorMessage(code: ErrorCode, details?: unknown): string {
  const def: ErrorDef = ERRORS[code];
  if (!def.template) return def.message;
  const values = (details && typeof details === 'object' ? details : {}) as Record<string, unknown>;
  let text = def.template;
  for (const [placeholder, key] of Object.entries(PLACEHOLDERS)) {
    if (!text.includes(placeholder)) continue;
    if (values[key] === undefined || values[key] === null) return def.message;
    text = text.replace(placeholder, formatValue(placeholder, values[key]));
  }
  return text;
}

export function isErrorCode(value: string): value is ErrorCode {
  return Object.prototype.hasOwnProperty.call(ERRORS, value);
}

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly details: unknown = null,
    /** Ghi đè thông điệp mặc định (ví dụ 503 khi CSDL không phản hồi) */
    message?: string,
    /** Ghi đè mã HTTP mặc định của code */
    public readonly statusOverride?: number,
  ) {
    super(message ?? errorMessage(code, details));
    this.name = 'ApiError';
  }

  get status(): number {
    return this.statusOverride ?? ERRORS[this.code].status;
  }
}

type PostgrestLikeError = { code?: string | null; message: string; details?: string | null };

/** Ánh xạ lỗi từ supabase-js (PostgREST) sang ApiError */
export function fromPostgrest(error: PostgrestLikeError): ApiError {
  if (error.code === 'P0001') {
    if (isErrorCode(error.message)) {
      let details: unknown = null;
      if (error.details) {
        try {
          details = JSON.parse(error.details);
        } catch {
          details = null;
        }
      }
      return new ApiError(error.message, details);
    }
    return new ApiError('INTERNAL_ERROR', null, undefined);
  }
  // 22P02 sai kiểu (uuid…), 23503 khóa ngoại, 23514 vi phạm CHECK, 22007/22008 sai ngày giờ
  if (['22P02', '23503', '23514', '22007', '22008'].includes(error.code ?? '')) {
    return new ApiError('VALIDATION_ERROR');
  }
  return new ApiError('INTERNAL_ERROR');
}
