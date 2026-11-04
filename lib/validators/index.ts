// Schema Zod dùng chung cho Route Handler và form ở client (03 §3.3)
import { z } from 'zod';

// Thông điệp mặc định của Zod bằng tiếng Việt (schema tự đặt thông điệp riêng thì giữ nguyên)
z.config(z.locales.vi());

export const uuid = z.uuid('ID không hợp lệ');
export const phone = z
  .string()
  .trim()
  .regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ');
const isoDateTime = z.iso.datetime({
  offset: true,
  error: 'Thời gian phải theo ISO 8601 có múi giờ',
});
const isoDate = z.iso.date({ error: 'Ngày phải theo dạng YYYY-MM-DD' });
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---------- Tài khoản và hồ sơ (05 §4.2) ----------

export const onboardingSchema = z.object({
  role: z.enum(['worker', 'shop_owner'], { error: 'Vai trò phải là worker hoặc shop_owner' }),
  full_name: z.string().trim().min(1, 'Nhập họ tên').max(80),
  phone: phone.optional(),
  date_of_birth: isoDate.optional(),
});

export const updateMeSchema = z
  .object({
    full_name: z.string().trim().min(1).max(80),
    phone: phone.nullable(),
    avatar_url: z.string().max(500).nullable(),
  })
  .partial();

export const workerProfileSchema = z
  .object({
    bio: z.string().trim().max(500).nullable(),
    school: z.string().trim().max(120).nullable(),
    skills: z.array(z.string().min(1)).max(6),
    home_location: z.object({ lat, lng }).nullable(),
    bank: z
      .object({
        bin: z.string().regex(/^[0-9]{6}$/, 'Mã ngân hàng gồm 6 chữ số'),
        account_no: z.string().regex(/^[0-9A-Za-z]{4,19}$/, 'Số tài khoản 4–19 ký tự'),
        account_name: z.string().trim().min(2).max(80),
      })
      .nullable(),
  })
  .partial();

// ---------- Quán (05 §4.3) ----------

export const SHOP_CATEGORIES = [
  'cafe',
  'milk_tea',
  'restaurant',
  'bakery',
  'bar',
  'fast_food',
  'other',
] as const;

export const shopSchema = z.object({
  name: z.string().trim().min(2, 'Tên quán tối thiểu 2 ký tự').max(120),
  category: z.enum(SHOP_CATEGORIES).default('cafe'),
  address: z.string().trim().min(5, 'Nhập địa chỉ').max(200),
  district: z.string().trim().max(60).nullish(),
  lat,
  lng,
  phone: phone.nullish(),
  geofence_radius_m: z.number().int().min(30).max(1000).default(150),
  description: z.string().trim().max(1000).nullish(),
  cover_url: z.string().max(500).nullish(),
});

export const shopPatchSchema = shopSchema
  .partial()
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
    message: 'Gửi cả lat và lng',
    path: ['lat'],
  });

// ---------- Ca (05 §4.4) ----------

const shiftCore = {
  shop_id: uuid,
  start_at: isoDateTime,
  end_at: isoDateTime,
  break_minutes: z.number().int().min(0).max(240).default(0),
  hourly_rate: z.number().int().min(1).max(1_000_000),
  headcount: z.number().int().min(1).max(50),
  is_urgent: z.boolean().default(false),
};

export const estimateSchema = z.object(shiftCore);

export const publishShiftSchema = z.object({
  ...shiftCore,
  position_code: z.string().min(1, 'Chọn vị trí'),
  title: z.string().trim().min(3, 'Tên ca tối thiểu 3 ký tự').max(120),
  description: z.string().trim().max(2000).nullish(),
  requirements: z.string().trim().max(1000).nullish(),
  min_rating: z.number().min(0).max(5).default(0),
  favorites_only_minutes: z.number().int().min(0).max(1440).default(0),
});

export const SEARCH_SORTS = ['match', 'distance', 'start_time', 'rate'] as const;

export const searchShiftsSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius_km: z.coerce.number().min(1).max(20).default(5),
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
    positions: z
      .string()
      .optional()
      .transform((value) => (value ? value.split(',').filter(Boolean) : undefined)),
    min_rate: z.coerce.number().int().min(0).optional(),
    sort: z.enum(SEARCH_SORTS).default('match'),
  })
  .extend(paginationSchema.shape);

// ---------- Booking (05 §4.5) ----------

export const WORKER_SCOPES = ['upcoming', 'active', 'pending_approval', 'history'] as const;

export const bookingListSchema = z
  .object({
    scope: z.enum(WORKER_SCOPES).default('upcoming'),
    shop_id: uuid.optional(),
    status: z.string().optional(),
    date: isoDate.optional(),
  })
  .extend(paginationSchema.shape);

// ---------- Ví (05 §4.7) ----------

export const topupSchema = z.object({
  amount: z.number().int('Số tiền là số nguyên'),
});

export const webhookSchema = z.object({
  event: z.string(),
  provider: z.string().default('vietqr_sim'),
  provider_txn_id: z.string().nullish(),
  amount: z.number().int(),
  description: z.string().nullish(),
});

// ---------- Thông báo (05 §4.8) ----------

export const notificationReadSchema = z.union([
  z.object({ ids: z.array(z.number().int()).min(1).max(200) }),
  z.object({ all: z.literal(true) }),
]);

// ---------- Chấm công, duyệt, hủy, rút tiền, công cụ demo (Phase 2) ----------

export const attendanceSchema = z.object({
  token: z.string().min(10, 'Thiếu mã QR').max(200),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy_m: z.number().min(0).max(100_000).optional(),
});

export const approveSchema = z.object({
  worked_minutes: z.number().int().min(0).max(960).optional(),
  note: z.string().trim().max(500).optional(),
});

export const cancelSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const withdrawalSchema = z.object({
  amount: z.number().int('Số tiền là số nguyên'),
});

export const fastForwardSchema = z.object({
  shift_id: uuid,
  to: z.enum(['start', 'end']),
});

export const demoResetSchema = z.object({
  days: z.number().int().min(1).max(90).default(60),
  shop_balance: z.number().int().min(0).max(100_000_000).default(2_000_000),
});

// ---------- Phase 3: đánh giá, mời, quản trị (05 §4.5–4.8) ----------

/** Thẻ đánh giá nhanh theo chiều (05 §4.5) */
export const SHOP_REVIEW_TAGS = ['on_time', 'fast', 'polite', 'want_rebook'] as const;
export const WORKER_REVIEW_TAGS = [
  'as_described',
  'friendly',
  'clear_guidance',
  'paid_on_time',
] as const;

export const reviewSchema = z.object({
  stars: z.number().int().min(1, 'Chọn số sao').max(5),
  tags: z
    .array(z.enum([...SHOP_REVIEW_TAGS, ...WORKER_REVIEW_TAGS]))
    .max(4)
    .default([])
    .transform((tags) => [...new Set(tags)]),
  comment: z.string().trim().max(500).optional(),
});

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày dạng YYYY-MM-DD');

export const kpiQuerySchema = z
  .object({ from: isoDay, to: isoDay })
  .refine((q) => q.from <= q.to, { message: 'from phải trước hoặc bằng to', path: ['from'] });

const intIn = (min: number, max: number) => z.number().int().min(min).max(max);

/** Tham số admin sửa được (05 §4.8): mỗi khóa một schema; khóa lạ → 400 */
export const SETTING_SCHEMAS = {
  fee_rate: z.number().min(0).max(0.5),
  min_hourly_rate: intIn(10_000, 500_000),
  urgent_boost_fee: intIn(0, 500_000),
  min_lead_minutes: intIn(0, 1_440),
  checkin_open_before_minutes: intIn(0, 240),
  late_after_minutes: intIn(0, 120),
  no_show_after_minutes: intIn(5, 240),
  auto_checkout_after_minutes: intIn(0, 1_440),
  auto_approve_after_hours: intIn(1, 168),
  gps_accuracy_cap_m: intIn(0, 500),
  topup_min: intIn(10_000, 10_000_000),
  topup_expire_minutes: intIn(5, 1_440),
  withdraw_min: intIn(1_000, 10_000_000),
  shop_cancel_compensation_rate: z.number().min(0).max(1),
  suspension_threshold: intIn(1, 50),
  suspension_days: intIn(1, 90),
  penalty_window_days: intIn(1, 365),
  penalty_points: z.object({
    cancel_lt_24h: intIn(0, 10),
    cancel_lt_6h: intIn(0, 10),
    no_show: intIn(0, 10),
  }),
  demo_mode: z.object({
    enabled: z.boolean(),
    auto_verify: z.boolean(),
    skip_geofence: z.boolean(),
  }),
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;

export const settingsPatchSchema = z
  .object(SETTING_SCHEMAS)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Không có tham số nào để lưu' });

export const adminUsersQuerySchema = z
  .object({
    role: z.enum(['worker', 'shop_owner', 'admin']).optional(),
    status: z.enum(['active', 'locked']).optional(),
    q: z.string().trim().max(100).optional(),
  })
  .extend(paginationSchema.shape);

export const adminUserPatchSchema = z
  .object({
    status: z.enum(['active', 'locked']).optional(),
    clear_suspension: z.literal(true).optional(),
  })
  .refine((v) => v.status !== undefined || v.clear_suspension, {
    message: 'Cần status hoặc clear_suspension',
  });

export const shopReviewSchema = z
  .object({ approve: z.boolean(), reason: z.string().trim().min(5).max(300).optional() })
  .refine((v) => v.approve || v.reason, { message: 'Từ chối phải ghi lý do', path: ['reason'] });

export const paymentOrdersQuerySchema = z
  .object({
    kind: z.enum(['topup', 'withdrawal']).optional(),
    status: z.enum(['pending', 'succeeded', 'failed', 'expired']).optional(),
  })
  .extend(paginationSchema.shape);

export const completeWithdrawalSchema = z
  .object({ success: z.boolean(), reason: z.string().trim().min(3).max(300).optional() })
  .refine((v) => v.success || v.reason, { message: 'Thất bại phải ghi lý do', path: ['reason'] });

export const inviteSchema = z.object({
  worker_ids: z.array(uuid).min(1, 'Chọn ít nhất một người').max(50),
  message: z.string().trim().max(200).optional(),
});

export const workerListSchema = z.object({
  list_type: z.enum(['favorite', 'blocked']),
  note: z.string().trim().max(200).optional(),
});
