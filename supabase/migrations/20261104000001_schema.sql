-- =====================================================================
-- 0001_schema.sql — Ca Nhanh: extensions, kiểu liệt kê, bảng, chỉ mục
-- Chạy trên Supabase (PostgreSQL 15+). Thứ tự: 0001 → 0002 → 0003 → 0004
-- =====================================================================
create extension if not exists postgis    with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------- Kiểu liệt kê ----------
create type public.user_role           as enum ('worker', 'shop_owner', 'admin');
create type public.account_status      as enum ('active', 'locked');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.shop_category       as enum ('cafe', 'milk_tea', 'restaurant', 'bakery', 'bar', 'fast_food', 'other');
create type public.shift_status        as enum ('open', 'full', 'in_progress', 'completed', 'cancelled', 'expired');
create type public.booking_status      as enum ('confirmed', 'checked_in', 'checked_out', 'disputed',
                                                'completed', 'cancelled', 'no_show');
create type public.booking_source      as enum ('marketplace', 'invite');
create type public.actor_type          as enum ('worker', 'shop', 'system', 'admin');
create type public.attendance_type     as enum ('check_in', 'check_out');
create type public.invite_status       as enum ('pending', 'accepted', 'declined', 'expired');
create type public.review_direction    as enum ('worker_to_shop', 'shop_to_worker');
create type public.worker_list_type    as enum ('favorite', 'blocked');
create type public.wallet_type         as enum ('worker', 'shop', 'platform');
create type public.txn_type            as enum ('topup', 'hold', 'release', 'shift_payment', 'earning',
                                                'platform_fee', 'boost_fee', 'compensation',
                                                'withdrawal', 'withdrawal_reversal', 'adjustment');
create type public.payment_kind        as enum ('topup', 'withdrawal');
create type public.payment_status      as enum ('pending', 'succeeded', 'failed', 'expired');
create type public.dispute_status      as enum ('open', 'resolved', 'rejected');

-- ---------- Tài khoản ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         public.user_role not null default 'worker',
  full_name    text not null check (char_length(full_name) between 1 and 80),
  phone        text check (phone ~ '^(0|\+84)[0-9]{9,10}$'),
  avatar_url   text,
  status       public.account_status not null default 'active',
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.worker_profiles (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth     date not null,
  bio               text check (char_length(bio) <= 500),
  school            text,
  skills            text[] not null default '{}',
  home_location     extensions.geography(Point, 4326),
  kyc_status        public.verification_status not null default 'unverified',
  rating_avg        numeric(3,2) not null default 0,
  rating_count      int not null default 0,
  completed_count   int not null default 0,
  no_show_count     int not null default 0,
  suspended_until   timestamptz,
  bank_bin          text check (bank_bin ~ '^[0-9]{6}$'),
  bank_account_no   text check (bank_account_no ~ '^[0-9A-Za-z]{4,19}$'),
  bank_account_name text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index worker_profiles_home_gix on public.worker_profiles using gist (home_location);
create index worker_profiles_skills_gin on public.worker_profiles using gin (skills);

create table public.kyc_submissions (
  id               uuid primary key default gen_random_uuid(),
  worker_id        uuid not null references public.profiles(id) on delete cascade,
  id_last4         text check (id_last4 ~ '^[0-9]{4}$'),
  front_image_path text not null,
  back_image_path  text not null,
  selfie_path      text not null,
  status           public.verification_status not null default 'pending',
  reject_reason    text,
  reviewed_by      uuid references public.profiles(id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index kyc_submissions_status_idx on public.kyc_submissions (status, created_at);

-- ---------- Quán & ca ----------
create table public.positions (
  code       text primary key,
  name       text not null,
  icon       text,
  sort_order int not null default 0
);
insert into public.positions (code, name, icon, sort_order) values
  ('barista',        'Pha chế',            'coffee',       1),
  ('server',         'Phục vụ / chạy bàn', 'utensils',     2),
  ('cashier',        'Thu ngân',           'receipt',      3),
  ('kitchen_helper', 'Phụ bếp',            'chef-hat',     4),
  ('dishwasher',     'Rửa bát / tạp vụ',   'droplets',     5),
  ('event_staff',    'Nhân viên sự kiện',  'party-popper', 6);

create table public.shops (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles(id),
  name                text not null check (char_length(name) between 2 and 120),
  category            public.shop_category not null default 'cafe',
  description         text,
  address             text not null,
  district            text,
  city                text not null default 'Hà Nội',
  location            extensions.geography(Point, 4326) not null,
  geofence_radius_m   int not null default 150 check (geofence_radius_m between 30 and 1000),
  phone               text,
  cover_url           text,
  verification_status public.verification_status not null default 'pending',
  rating_avg          numeric(3,2) not null default 0,
  rating_count        int not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index shops_owner_idx    on public.shops (owner_id);
create index shops_location_gix on public.shops using gist (location);

create table public.shifts (
  id                   uuid primary key default gen_random_uuid(),
  shop_id              uuid not null references public.shops(id),
  position_code        text not null references public.positions(code),
  title                text not null check (char_length(title) between 5 and 120),
  description          text,
  requirements         text,
  start_at             timestamptz not null,
  end_at               timestamptz not null,
  period               tstzrange generated always as (tstzrange(start_at, end_at, '[)')) stored,
  break_minutes        int not null default 0 check (break_minutes between 0 and 120),
  hourly_rate          int not null check (hourly_rate between 10000 and 500000),
  headcount            int not null check (headcount between 1 and 20),
  filled_count         int not null default 0,
  status               public.shift_status not null default 'open',
  is_urgent            boolean not null default false,
  min_rating           numeric(2,1) not null default 0 check (min_rating between 0 and 5),
  favorites_only_until timestamptz,
  fee_rate             numeric(4,3) not null check (fee_rate between 0 and 0.5),
  est_wage_per_seat    bigint not null check (est_wage_per_seat >= 0),
  est_fee_per_seat     bigint not null check (est_fee_per_seat >= 0),
  hold_amount          bigint not null default 0 check (hold_amount >= 0),
  published_at         timestamptz not null default now(),
  filled_at            timestamptz,
  cancelled_at         timestamptz,
  cancel_reason        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint shifts_time_chk   check (end_at > start_at and end_at - start_at <= interval '12 hours'),
  constraint shifts_break_chk  check (break_minutes * interval '1 minute' < end_at - start_at),
  constraint shifts_filled_chk check (filled_count between 0 and headcount)
);
create index shifts_status_start_idx on public.shifts (status, start_at);
create index shifts_shop_start_idx   on public.shifts (shop_id, start_at desc);

create table public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  shift_id             uuid not null references public.shifts(id),
  shop_id              uuid not null references public.shops(id),      -- phi chuẩn hóa: lọc Realtime/RLS
  worker_id            uuid not null references public.profiles(id),
  source               public.booking_source not null default 'marketplace',
  status               public.booking_status not null default 'confirmed',
  period               tstzrange not null,                              -- sao chép từ shifts.period
  seat_hold            bigint not null default 0 check (seat_hold >= 0),
  booked_at            timestamptz not null default now(),
  cancelled_at         timestamptz,
  cancelled_by         public.actor_type,
  cancel_reason        text,
  penalty_points       int not null default 0 check (penalty_points >= 0),
  compensation_amount  bigint not null default 0 check (compensation_amount >= 0),
  check_in_at          timestamptz,
  check_in_distance_m  int,
  is_late              boolean not null default false,
  check_out_at         timestamptz,
  check_out_distance_m int,
  auto_checked_out     boolean not null default false,
  worked_minutes       int check (worked_minutes >= 0),
  wage_amount          bigint check (wage_amount >= 0),
  fee_amount           bigint check (fee_amount >= 0),
  approved_at          timestamptz,
  approved_by          uuid references public.profiles(id),
  adjustment_note      text,
  settled_at           timestamptz,
  reminder_sent_at     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint bookings_checkout_chk check (check_out_at is null or check_in_at is null or check_out_at >= check_in_at),
  -- Một người không thể giữ hai ca chồng giờ nhau (đảm bảo ở mức CSDL, kể cả khi gọi đồng thời)
  constraint bookings_no_overlap exclude using gist (worker_id with =, period with &&)
    where (status not in ('cancelled', 'no_show'))
);
create unique index bookings_one_active_per_shift on public.bookings (shift_id, worker_id) where status <> 'cancelled';
create index bookings_worker_idx on public.bookings (worker_id, status);
create index bookings_shop_idx   on public.bookings (shop_id, status);
create index bookings_shift_idx  on public.bookings (shift_id);

create table public.attendance_events (
  id           bigint generated always as identity primary key,
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  worker_id    uuid not null references public.profiles(id),
  shop_id      uuid not null references public.shops(id),
  type         public.attendance_type not null,
  accepted     boolean not null,
  reject_code  text,
  token_window bigint,
  lat          double precision,
  lng          double precision,
  accuracy_m   int,
  distance_m   int,
  scanned_at   timestamptz not null default now()
);
create index attendance_events_booking_idx on public.attendance_events (booking_id, scanned_at);

create table public.shift_invites (
  id           uuid primary key default gen_random_uuid(),
  shift_id     uuid not null references public.shifts(id) on delete cascade,
  shop_id      uuid not null references public.shops(id),
  worker_id    uuid not null references public.profiles(id),
  status       public.invite_status not null default 'pending',
  message      text check (char_length(message) <= 300),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (shift_id, worker_id)
);
create index shift_invites_worker_idx on public.shift_invites (worker_id, status);

create table public.shop_worker_lists (
  shop_id    uuid not null references public.shops(id) on delete cascade,
  worker_id  uuid not null references public.profiles(id) on delete cascade,
  list_type  public.worker_list_type not null,
  note       text,
  created_at timestamptz not null default now(),
  primary key (shop_id, worker_id)
);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  direction   public.review_direction not null,
  reviewer_id uuid not null references public.profiles(id),
  shop_id     uuid not null references public.shops(id),
  worker_id   uuid not null references public.profiles(id),
  stars       smallint not null check (stars between 1 and 5),
  tags        text[] not null default '{}',
  comment     text check (char_length(comment) <= 500),
  created_at  timestamptz not null default now(),
  unique (booking_id, direction)
);
create index reviews_shop_idx   on public.reviews (shop_id, created_at desc)   where direction = 'worker_to_shop';
create index reviews_worker_idx on public.reviews (worker_id, created_at desc) where direction = 'shop_to_worker';

create table public.disputes (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id) on delete cascade,
  opened_by        uuid not null references public.profiles(id),
  opener_role      public.actor_type not null check (opener_role in ('worker', 'shop')),
  reason_code      text not null check (reason_code in ('wrong_hours', 'no_show_claim', 'payment', 'behavior', 'other')),
  description      text not null check (char_length(description) between 10 and 1000),
  prev_status      public.booking_status not null,
  status           public.dispute_status not null default 'open',
  resolution       text,
  adjusted_minutes int check (adjusted_minutes >= 0),
  resolved_by      uuid references public.profiles(id),
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);
create unique index disputes_one_open_per_booking on public.disputes (booking_id) where status = 'open';

-- ---------- Ví & thanh toán ----------
create table public.wallets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid unique references public.profiles(id),
  type         public.wallet_type not null,
  balance      bigint not null default 0 check (balance >= 0),        -- số dư khả dụng (VND)
  held_balance bigint not null default 0 check (held_balance >= 0),   -- đang tạm giữ cho ca đã đăng
  updated_at   timestamptz not null default now(),
  constraint wallets_owner_chk check ((type = 'platform') = (owner_id is null))
);
create unique index wallets_single_platform on public.wallets (type) where type = 'platform';

create table public.wallet_transactions (
  id            bigint generated always as identity primary key,
  wallet_id     uuid not null references public.wallets(id),
  type          public.txn_type not null,
  balance_delta bigint not null default 0,
  held_delta    bigint not null default 0,
  balance_after bigint not null,
  held_after    bigint not null,
  ref_type      text check (ref_type in ('shift', 'booking', 'payment_order', 'admin')),
  ref_id        uuid,
  note          text,
  created_at    timestamptz not null default now(),
  constraint wallet_txn_nonzero check (balance_delta <> 0 or held_delta <> 0)
);
create index wallet_transactions_wallet_idx on public.wallet_transactions (wallet_id, created_at desc);
create index wallet_transactions_ref_idx    on public.wallet_transactions (ref_type, ref_id);

create table public.payment_orders (
  id              uuid primary key default gen_random_uuid(),
  wallet_id       uuid not null references public.wallets(id),
  kind            public.payment_kind not null,
  amount          bigint not null check (amount > 0),
  status          public.payment_status not null default 'pending',
  reference_code  text not null unique,             -- nội dung chuyển khoản, ví dụ CN7F3A9C21
  provider        text not null default 'vietqr_sim',
  provider_txn_id text,
  bank_snapshot   jsonb,                            -- rút tiền: ngân hàng nhận tại thời điểm yêu cầu
  idempotency_key text,
  expires_at      timestamptz,
  completed_at    timestamptz,
  failure_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (wallet_id, idempotency_key)
);
create index payment_orders_status_idx on public.payment_orders (kind, status, created_at);

-- ---------- Thông báo & cấu hình ----------
create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  is_public   boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);
insert into public.platform_settings (key, value, description) values
  ('fee_rate',                      '0.20',  'Phí nền tảng: % trên tiền công, quán trả thêm'),
  ('min_hourly_rate',               '25500', 'Lương tối thiểu theo giờ, Vùng I (NĐ 293/2025/NĐ-CP)'),
  ('urgent_boost_fee',              '20000', 'Phí đẩy ca gấp (đ/ca)'),
  ('min_lead_minutes',              '30',    'Ca phải bắt đầu sau ít nhất N phút kể từ lúc đăng'),
  ('checkin_open_before_minutes',   '30',    'Được check-in sớm nhất N phút trước giờ bắt đầu'),
  ('late_after_minutes',            '5',     'Check-in sau giờ bắt đầu + N phút bị đánh dấu đi muộn'),
  ('no_show_after_minutes',         '30',    'Quá giờ bắt đầu + N phút chưa check-in → vắng mặt'),
  ('auto_checkout_after_minutes',   '120',   'Quên check-out: tự check-out tại giờ kết thúc sau N phút'),
  ('auto_approve_after_hours',      '12',    'Quán không duyệt giờ công sau N giờ → tự duyệt'),
  ('qr_rotation_seconds',           '30',    'Chu kỳ đổi mã QR chấm công'),
  ('gps_accuracy_cap_m',            '100',   'Sai số GPS tối đa được cộng vào bán kính geofence'),
  ('penalty_points',                '{"cancel_lt_24h": 1, "cancel_lt_6h": 2, "no_show": 4}', 'Điểm phạt người làm'),
  ('penalty_window_days',           '30',    'Cửa sổ cộng dồn điểm phạt (ngày)'),
  ('suspension_threshold',          '4',     'Ngưỡng điểm phạt bị tạm khóa nhận ca'),
  ('suspension_days',               '7',     'Số ngày tạm khóa nhận ca'),
  ('shop_cancel_compensation_rate', '0.5',   'Quán hủy trong vòng 24h: bồi thường % tiền công dự kiến'),
  ('topup_min',                     '50000', 'Số tiền nạp tối thiểu'),
  ('withdraw_min',                  '10000', 'Số tiền rút tối thiểu'),
  ('topup_expire_minutes',          '15',    'Lệnh nạp hết hạn sau N phút'),
  ('demo_mode', '{"enabled": true, "auto_verify": true, "skip_geofence": false}', 'Cờ chế độ demo');

-- Ví của nền tảng (doanh thu phí)
insert into public.wallets (owner_id, type) values (null, 'platform');
