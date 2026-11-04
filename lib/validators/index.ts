// Schema Zod dùng chung cho Route Handler và form ở client (03 §3.3)
import { z } from 'zod';

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
