-- =====================================================================
-- 0002_functions.sql — Ca Nhanh: trigger, tiện ích, hàm nghiệp vụ
-- Quy ước: hàm lệnh fn_* là SECURITY DEFINER, nhận p_actor (id người gọi đã
-- được API xác thực), chỉ service_role được EXECUTE (xem 0003).
-- Lỗi nghiệp vụ: RAISE EXCEPTION '<MÃ_LỖI>' (SQLSTATE P0001) → API ánh xạ HTTP.
-- =====================================================================

-- ---------- Trigger chung ----------
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'worker_profiles', 'shops', 'shifts', 'bookings',
                           'wallets', 'payment_orders', 'platform_settings'] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- Tạo hồ sơ + ví khi có tài khoản mới. Vai trò lấy từ metadata nhưng KHÔNG BAO GIỜ nhận 'admin'.
create or replace function public.tg_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := case when new.raw_user_meta_data ->> 'role' = 'shop_owner'
                                  then 'shop_owner'::public.user_role else 'worker'::public.user_role end;
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, v_role,
          left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                        nullif(split_part(new.email, '@', 1), ''), 'Người dùng'), 80));
  insert into public.wallets (owner_id, type)
  values (new.id, case when v_role = 'shop_owner' then 'shop'::public.wallet_type
                       else 'worker'::public.wallet_type end);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- ---------- Tiện ích ----------
create or replace function public.app_setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from public.platform_settings where key = p_key
$$;

create or replace function public.app_setting_int(p_key text) returns int
language sql stable security definer set search_path = public as $$
  select (value #>> '{}')::int from public.platform_settings where key = p_key
$$;

create or replace function public.app_setting_num(p_key text) returns numeric
language sql stable security definer set search_path = public as $$
  select (value #>> '{}')::numeric from public.platform_settings where key = p_key
$$;

create or replace function public.demo_flag(p_flag text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((value ->> 'enabled')::boolean, false) and coalesce((value ->> p_flag)::boolean, false)
    from public.platform_settings where key = 'demo_mode'
$$;

create or replace function public.fmt_vnd(p bigint) returns text
language sql immutable as $$
  select replace(to_char(p, 'FM999,999,999,990'), ',', '.') || 'đ'
$$;

create or replace function public.fmt_time(p timestamptz) returns text
language sql stable as $$
  select to_char(p at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM')
$$;

create or replace function public.calc_wage(p_minutes int, p_hourly_rate int) returns bigint
language sql immutable as $$
  select round(greatest(coalesce(p_minutes, 0), 0)::numeric * p_hourly_rate / 60)::bigint
$$;

create or replace function public.calc_fee(p_wage bigint, p_fee_rate numeric) returns bigint
language sql immutable as $$
  select round(p_wage * p_fee_rate)::bigint
$$;

-- Dùng trong chính sách RLS
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = (select auth.uid()) and role = 'admin' and status = 'active')
$$;

create or replace function public.owns_shop(p_shop_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops where id = p_shop_id and owner_id = (select auth.uid()))
$$;

create or replace function public.wallet_of(p_owner uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.wallets where owner_id = p_owner
$$;

create or replace function public.platform_wallet() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.wallets where type = 'platform'
$$;

create or replace function public.fn_notify(p_user uuid, p_type text, p_title text,
                                            p_body text default null, p_data jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb));
$$;

-- ---------- Sổ cái ví: điểm DUY NHẤT thay đổi số dư ----------
create or replace function public.fn_ledger(
  p_wallet_id uuid, p_type public.txn_type, p_balance_delta bigint, p_held_delta bigint default 0,
  p_ref_type text default null, p_ref_id uuid default null, p_note text default null
) returns public.wallets
language plpgsql security definer set search_path = public as $$
declare
  w public.wallets;
begin
  if p_wallet_id is null then raise exception 'WALLET_NOT_FOUND'; end if;
  if coalesce(p_balance_delta, 0) = 0 and coalesce(p_held_delta, 0) = 0 then
    select * into w from public.wallets where id = p_wallet_id;
    return w;
  end if;
  begin
    update public.wallets
       set balance      = balance + coalesce(p_balance_delta, 0),
           held_balance = held_balance + coalesce(p_held_delta, 0)
     where id = p_wallet_id
    returning * into w;
  exception when check_violation then
    raise exception 'INSUFFICIENT_BALANCE';   -- CHECK (balance >= 0) chặn số dư âm
  end;
  if w.id is null then raise exception 'WALLET_NOT_FOUND'; end if;
  insert into public.wallet_transactions (wallet_id, type, balance_delta, held_delta,
                                          balance_after, held_after, ref_type, ref_id, note)
  values (p_wallet_id, p_type, coalesce(p_balance_delta, 0), coalesce(p_held_delta, 0),
          w.balance, w.held_balance, p_ref_type, p_ref_id, p_note);
  return w;
end $$;

-- ---------- Điểm phạt ----------
create or replace function public.penalty_points_of(p_worker uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(penalty_points), 0)::int
    from public.bookings
   where worker_id = p_worker and penalty_points > 0
     and coalesce(cancelled_at, lower(period))
         > now() - make_interval(days => public.app_setting_int('penalty_window_days'))
$$;

create or replace function public.fn_apply_penalty(p_worker uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_points int := public.penalty_points_of(p_worker);
  v_days   int := public.app_setting_int('suspension_days');
begin
  if v_points >= public.app_setting_int('suspension_threshold') then
    update public.worker_profiles
       set suspended_until = greatest(coalesce(suspended_until, now()), now() + make_interval(days => v_days))
     where user_id = p_worker;
    perform public.fn_notify(p_worker, 'account.suspended', 'Tạm khóa nhận ca',
      format('Bạn có %s điểm phạt trong %s ngày gần nhất nên bị tạm khóa nhận ca %s ngày.',
             v_points, public.app_setting_int('penalty_window_days'), v_days),
      jsonb_build_object('points', v_points));
  else
    perform public.fn_notify(p_worker, 'account.penalty', 'Bạn bị cộng điểm phạt',
      format('Điểm phạt hiện tại: %s/%s.', v_points, public.app_setting_int('suspension_threshold')),
      jsonb_build_object('points', v_points));
  end if;
end $$;

-- ---------- Onboarding & xác minh ----------
create or replace function public.fn_complete_onboarding(
  p_actor uuid, p_role public.user_role, p_full_name text,
  p_phone text default null, p_date_of_birth date default null
) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
begin
  if p_role not in ('worker', 'shop_owner') then raise exception 'FORBIDDEN'; end if;
  select * into p from public.profiles where id = p_actor for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.onboarded_at is not null and p.role <> p_role then raise exception 'ROLE_LOCKED'; end if;

  if p_role = 'worker' then
    if p_date_of_birth is null then raise exception 'PROFILE_INCOMPLETE'; end if;
    if p_date_of_birth > (current_date - interval '18 years')::date then raise exception 'AGE_RESTRICTED'; end if;
    insert into public.worker_profiles (user_id, date_of_birth, kyc_status)
    values (p_actor, p_date_of_birth,
            case when public.demo_flag('auto_verify') then 'verified'::public.verification_status
                 else 'unverified'::public.verification_status end)
    on conflict (user_id) do update set date_of_birth = excluded.date_of_birth;
  end if;

  update public.wallets
     set type = case when p_role = 'shop_owner' then 'shop'::public.wallet_type else 'worker'::public.wallet_type end
   where owner_id = p_actor and balance = 0 and held_balance = 0;

  update public.profiles
     set role = p_role, full_name = p_full_name, phone = coalesce(p_phone, phone),
         onboarded_at = coalesce(onboarded_at, now())
   where id = p_actor
  returning * into p;
  return p;
end $$;

create or replace function public.fn_submit_kyc(p_actor uuid, p_front text, p_back text, p_selfie text,
                                                p_id_last4 text default null)
returns public.kyc_submissions
language plpgsql security definer set search_path = public as $$
declare
  k public.kyc_submissions;
  v_status public.verification_status;
begin
  select kyc_status into v_status from public.worker_profiles where user_id = p_actor for update;
  if not found then raise exception 'PROFILE_INCOMPLETE'; end if;
  if v_status = 'verified' then raise exception 'INVALID_STATE'; end if;
  if v_status = 'pending' then raise exception 'KYC_PENDING'; end if;
  if not (p_front like p_actor::text || '/%' and p_back like p_actor::text || '/%'
          and p_selfie like p_actor::text || '/%') then
    raise exception 'FORBIDDEN';                     -- ảnh phải nằm trong thư mục của chính người gửi
  end if;
  insert into public.kyc_submissions (worker_id, id_last4, front_image_path, back_image_path, selfie_path)
  values (p_actor, p_id_last4, p_front, p_back, p_selfie)
  returning * into k;
  update public.worker_profiles set kyc_status = 'pending' where user_id = p_actor;
  return k;
end $$;

create or replace function public.fn_review_kyc(p_admin uuid, p_submission_id uuid, p_approve boolean,
                                                p_reason text default null)
returns public.kyc_submissions
language plpgsql security definer set search_path = public as $$
declare
  k public.kyc_submissions;
begin
  if not exists (select 1 from public.profiles where id = p_admin and role = 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  select * into k from public.kyc_submissions where id = p_submission_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if k.status <> 'pending' then raise exception 'INVALID_STATE'; end if;
  if not p_approve and coalesce(trim(p_reason), '') = '' then raise exception 'VALIDATION_ERROR'; end if;

  update public.kyc_submissions
     set status = case when p_approve then 'verified'::public.verification_status
                       else 'rejected'::public.verification_status end,
         reject_reason = case when p_approve then null else p_reason end,
         reviewed_by = p_admin, reviewed_at = now()
   where id = k.id
  returning * into k;
  update public.worker_profiles set kyc_status = k.status where user_id = k.worker_id;
  perform public.fn_notify(k.worker_id, 'kyc.reviewed',
    case when p_approve then 'Hồ sơ đã được xác minh' else 'Hồ sơ chưa được duyệt' end,
    case when p_approve then 'Bạn đã có thể nhận ca.' else 'Lý do: ' || p_reason end,
    jsonb_build_object('submission_id', k.id));
  return k;
end $$;

-- ---------- Ca làm ----------
create or replace function public.fn_boost_shift(p_actor uuid, p_shift_id uuid) returns public.shifts
language plpgsql security definer set search_path = public, extensions as $$
declare
  s      public.shifts;
  v_shop public.shops;
  v_fee  bigint := public.app_setting_int('urgent_boost_fee');
begin
  select * into s from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_shop from public.shops where id = s.shop_id;
  if v_shop.owner_id <> p_actor then raise exception 'FORBIDDEN'; end if;
  if s.status <> 'open' or s.start_at <= now() then raise exception 'INVALID_STATE'; end if;
  if s.is_urgent then return s; end if;

  perform public.fn_ledger(public.wallet_of(p_actor), 'boost_fee', -v_fee, 0, 'shift', s.id, 'Phí đẩy ca gấp');
  perform public.fn_ledger(public.platform_wallet(), 'boost_fee', v_fee, 0, 'shift', s.id, 'Doanh thu đẩy ca gấp');
  update public.shifts set is_urgent = true where id = s.id returning * into s;

  -- Báo cho người làm đã xác minh, sống trong bán kính 3 km, có kỹ năng phù hợp
  perform public.fn_notify(w.user_id, 'shift.urgent_nearby', 'Ca gấp gần bạn: ' || v_shop.name,
            format('%s, %s, %s/giờ.', s.title, public.fmt_time(s.start_at), public.fmt_vnd(s.hourly_rate)),
            jsonb_build_object('shift_id', s.id))
     from public.worker_profiles w
    where w.kyc_status = 'verified' and w.home_location is not null
      and st_dwithin(w.home_location, v_shop.location, 3000)
      and s.position_code = any (w.skills);
  return s;
end $$;

create or replace function public.fn_publish_shift(
  p_actor uuid, p_shop_id uuid, p_position_code text, p_title text,
  p_start_at timestamptz, p_end_at timestamptz, p_hourly_rate int, p_headcount int,
  p_break_minutes int default 0, p_description text default null, p_requirements text default null,
  p_min_rating numeric default 0, p_favorites_only_minutes int default 0, p_is_urgent boolean default false
) returns public.shifts
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_shop     public.shops;
  v_fee_rate numeric := public.app_setting_num('fee_rate');
  v_minutes  int;
  v_wage     bigint;
  v_fee      bigint;
  v_hold     bigint;
  s          public.shifts;
begin
  select * into v_shop from public.shops where id = p_shop_id;
  if not found or v_shop.owner_id <> p_actor then raise exception 'FORBIDDEN'; end if;
  if not v_shop.is_active then raise exception 'SHOP_INACTIVE'; end if;
  if v_shop.verification_status <> 'verified' then raise exception 'SHOP_NOT_VERIFIED'; end if;
  if not exists (select 1 from public.positions where code = p_position_code) then
    raise exception 'VALIDATION_ERROR';
  end if;
  if p_hourly_rate < public.app_setting_int('min_hourly_rate') then raise exception 'RATE_BELOW_MINIMUM'; end if;
  if p_headcount is null or p_headcount not between 1 and 20 then raise exception 'INVALID_HEADCOUNT'; end if;
  if p_end_at <= p_start_at or p_end_at - p_start_at > interval '12 hours'
     or p_start_at > now() + interval '30 days' then
    raise exception 'INVALID_TIME_RANGE';
  end if;
  if p_start_at < now() + make_interval(mins => public.app_setting_int('min_lead_minutes')) then
    raise exception 'LEAD_TIME_TOO_SHORT';
  end if;

  v_minutes := floor(extract(epoch from (p_end_at - p_start_at)) / 60)::int - coalesce(p_break_minutes, 0);
  if v_minutes <= 0 then raise exception 'INVALID_TIME_RANGE'; end if;
  v_wage := public.calc_wage(v_minutes, p_hourly_rate);
  v_fee  := public.calc_fee(v_wage, v_fee_rate);
  v_hold := (v_wage + v_fee) * p_headcount;

  insert into public.shifts (shop_id, position_code, title, description, requirements, start_at, end_at,
                             break_minutes, hourly_rate, headcount, min_rating, favorites_only_until,
                             fee_rate, est_wage_per_seat, est_fee_per_seat, hold_amount)
  values (p_shop_id, p_position_code, p_title, p_description, p_requirements, p_start_at, p_end_at,
          coalesce(p_break_minutes, 0), p_hourly_rate, p_headcount, coalesce(p_min_rating, 0),
          case when coalesce(p_favorites_only_minutes, 0) > 0
               then least(now() + make_interval(mins => p_favorites_only_minutes), p_start_at) end,
          v_fee_rate, v_wage, v_fee, v_hold)
  returning * into s;

  -- Ký quỹ: trừ khả dụng, cộng tạm giữ. Thiếu tiền → INSUFFICIENT_BALANCE, toàn bộ giao dịch rollback.
  perform public.fn_ledger(public.wallet_of(p_actor), 'hold', -v_hold, v_hold, 'shift', s.id,
                           'Tạm giữ chi phí ca: ' || s.title);

  if s.favorites_only_until is not null then
    perform public.fn_notify(l.worker_id, 'shift.priority_invite', v_shop.name || ' vừa đăng ca cho người quen',
              format('%s, %s. Bạn được ưu tiên nhận đến %s.', s.title, public.fmt_time(s.start_at),
                     public.fmt_time(s.favorites_only_until)),
              jsonb_build_object('shift_id', s.id))
       from public.shop_worker_lists l
      where l.shop_id = p_shop_id and l.list_type = 'favorite';
  end if;

  if p_is_urgent then
    s := public.fn_boost_shift(p_actor, s.id);
  end if;
  return s;
end $$;

-- Tăng/giảm số người cần (chỉ ghế trống). Giờ và lương KHÔNG sửa được sau khi đăng (BR-05).
create or replace function public.fn_resize_shift(p_actor uuid, p_shift_id uuid, p_headcount int)
returns public.shifts
language plpgsql security definer set search_path = public as $$
declare
  s       public.shifts;
  v_owner uuid;
  v_seat  bigint;
  v_delta int;
begin
  select * into s from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select owner_id into v_owner from public.shops where id = s.shop_id;
  if v_owner <> p_actor then raise exception 'FORBIDDEN'; end if;
  if s.status not in ('open', 'full') or s.start_at <= now() then raise exception 'INVALID_STATE'; end if;
  if p_headcount is null or p_headcount < greatest(s.filled_count, 1) or p_headcount > 20 then
    raise exception 'INVALID_HEADCOUNT';
  end if;

  v_seat  := s.est_wage_per_seat + s.est_fee_per_seat;
  v_delta := p_headcount - s.headcount;
  if v_delta > 0 then
    perform public.fn_ledger(public.wallet_of(p_actor), 'hold', -(v_seat * v_delta), v_seat * v_delta,
                             'shift', s.id, 'Tạm giữ thêm do tăng số người');
  elsif v_delta < 0 then
    perform public.fn_ledger(public.wallet_of(p_actor), 'release', v_seat * (-v_delta), -(v_seat * (-v_delta)),
                             'shift', s.id, 'Hoàn tạm giữ do giảm số người');
  end if;

  update public.shifts
     set headcount   = p_headcount,
         hold_amount = hold_amount + v_seat * v_delta,
         status      = case when filled_count >= p_headcount then 'full'::public.shift_status
                            else 'open'::public.shift_status end,
         filled_at   = case when filled_count >= p_headcount then coalesce(filled_at, now()) else filled_at end
   where id = s.id
  returning * into s;
  return s;
end $$;

create or replace function public.fn_cancel_shift(p_actor uuid, p_shift_id uuid, p_reason text)
returns public.shifts
language plpgsql security definer set search_path = public as $$
declare
  s        public.shifts;
  v_shop   public.shops;
  b        public.bookings;
  v_wallet uuid;
  v_hours  numeric;
  v_comp   bigint;
  v_total  bigint := 0;
begin
  select * into s from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_shop from public.shops where id = s.shop_id;
  if v_shop.owner_id <> p_actor then raise exception 'FORBIDDEN'; end if;
  if s.status not in ('open', 'full') or s.start_at <= now() then raise exception 'INVALID_STATE'; end if;
  v_wallet := public.wallet_of(p_actor);
  v_hours  := extract(epoch from (s.start_at - now())) / 3600.0;

  for b in select * from public.bookings where shift_id = s.id and status = 'confirmed' for update loop
    v_comp := case when v_hours < 24
                   then round(s.est_wage_per_seat * public.app_setting_num('shop_cancel_compensation_rate'))
                   else 0 end;
    update public.bookings
       set status = 'cancelled', cancelled_at = now(), cancelled_by = 'shop', cancel_reason = p_reason,
           compensation_amount = v_comp, seat_hold = 0
     where id = b.id;
    if v_comp > 0 then
      perform public.fn_ledger(public.wallet_of(b.worker_id), 'compensation', v_comp, 0, 'booking', b.id,
                               'Bồi thường do quán hủy ca');
      v_total := v_total + v_comp;
    end if;
    perform public.fn_notify(b.worker_id, 'shift.cancelled', 'Quán đã hủy ca',
              format('%s hủy ca "%s" (%s).%s', v_shop.name, s.title, public.fmt_time(s.start_at),
                     case when v_comp > 0 then ' Bạn được bồi thường ' || public.fmt_vnd(v_comp) || '.' else '' end),
              jsonb_build_object('shift_id', s.id, 'booking_id', b.id));
  end loop;

  if s.hold_amount > 0 then
    perform public.fn_ledger(v_wallet, 'release', s.hold_amount, -s.hold_amount, 'shift', s.id, 'Hoàn tạm giữ do hủy ca');
  end if;
  if v_total > 0 then
    perform public.fn_ledger(v_wallet, 'compensation', -v_total, 0, 'shift', s.id, 'Bồi thường người làm do hủy ca muộn');
  end if;

  update public.shift_invites set status = 'expired', responded_at = now()
   where shift_id = s.id and status = 'pending';
  update public.shifts
     set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason, hold_amount = 0, filled_count = 0
   where id = s.id
  returning * into s;
  return s;
end $$;

-- ---------- Nhận ca: trái tim của sàn ----------
create or replace function public.fn_book_shift(p_actor uuid, p_shift_id uuid,
                                                p_source public.booking_source default 'marketplace')
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles;
  v_wp      public.worker_profiles;
  s         public.shifts;
  b         public.bookings;
  v_list    public.worker_list_type;
  v_invited boolean;
  v_owner   uuid;
begin
  select * into v_profile from public.profiles where id = p_actor;
  if not found or v_profile.role <> 'worker' then raise exception 'FORBIDDEN'; end if;
  if v_profile.status <> 'active' then raise exception 'ACCOUNT_LOCKED'; end if;
  select * into v_wp from public.worker_profiles where user_id = p_actor;
  if not found then raise exception 'PROFILE_INCOMPLETE'; end if;
  if v_wp.kyc_status <> 'verified' then raise exception 'KYC_REQUIRED'; end if;
  if v_wp.suspended_until > now() then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if v_wp.date_of_birth > (current_date - interval '18 years')::date then raise exception 'AGE_RESTRICTED'; end if;

  -- Khóa dòng ca: hai người bấm "Nhận ca" cho ghế cuối cùng sẽ được xếp hàng, chỉ một người thắng
  select * into s from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from public.bookings
              where shift_id = s.id and worker_id = p_actor and status <> 'cancelled') then
    raise exception 'ALREADY_BOOKED';
  end if;
  if s.status = 'full' then raise exception 'SHIFT_FULL'; end if;
  if s.status <> 'open' or s.start_at <= now() then raise exception 'SHIFT_NOT_OPEN'; end if;

  select list_type into v_list from public.shop_worker_lists where shop_id = s.shop_id and worker_id = p_actor;
  if v_list = 'blocked' then raise exception 'BLOCKED_BY_SHOP'; end if;
  v_invited := exists (select 1 from public.shift_invites
                        where shift_id = s.id and worker_id = p_actor and status = 'pending');

  if not v_invited then
    if s.favorites_only_until > now() and v_list is distinct from 'favorite' then
      raise exception 'FAVORITES_ONLY';
    end if;
    if s.min_rating > 0 and v_wp.rating_count > 0 and v_wp.rating_avg < s.min_rating then
      raise exception 'RATING_TOO_LOW';
    end if;
  end if;

  if exists (select 1 from public.bookings
              where worker_id = p_actor and status not in ('cancelled', 'no_show') and period && s.period) then
    raise exception 'BOOKING_OVERLAP';
  end if;

  insert into public.bookings (shift_id, shop_id, worker_id, source, period, seat_hold)
  values (s.id, s.shop_id, p_actor,
          case when v_invited then 'invite'::public.booking_source else p_source end,
          s.period, s.est_wage_per_seat + s.est_fee_per_seat)
  returning * into b;

  update public.shifts
     set filled_count = filled_count + 1,
         status    = case when filled_count + 1 >= headcount then 'full'::public.shift_status else status end,
         filled_at = case when filled_count + 1 >= headcount then coalesce(filled_at, now()) else filled_at end
   where id = s.id;

  if v_invited then
    update public.shift_invites set status = 'accepted', responded_at = now()
     where shift_id = s.id and worker_id = p_actor;
  end if;

  select owner_id into v_owner from public.shops where id = s.shop_id;
  perform public.fn_notify(v_owner, 'booking.created', v_profile.full_name || ' đã nhận ca',
            format('"%s" %s · %s/%s người.', s.title, public.fmt_time(s.start_at), s.filled_count + 1, s.headcount),
            jsonb_build_object('shift_id', s.id, 'booking_id', b.id));
  return b;
exception
  when exclusion_violation then raise exception 'BOOKING_OVERLAP';
  when unique_violation then raise exception 'ALREADY_BOOKED';
end $$;

create or replace function public.fn_cancel_booking(p_actor uuid, p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  s        public.shifts;
  v_shop   public.shops;
  v_by     public.actor_type;
  v_hours  numeric;
  v_points int := 0;
  v_comp   bigint := 0;
  v_pp     jsonb := public.app_setting('penalty_points');
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into s from public.shifts where id = b.shift_id for update;
  select * into v_shop from public.shops where id = b.shop_id;

  if p_actor = b.worker_id then v_by := 'worker';
  elsif p_actor = v_shop.owner_id then v_by := 'shop';
  else raise exception 'FORBIDDEN';
  end if;
  if b.status <> 'confirmed' then raise exception 'INVALID_STATE'; end if;
  if s.start_at <= now() then raise exception 'TOO_LATE_TO_CANCEL'; end if;

  v_hours := extract(epoch from (s.start_at - now())) / 3600.0;
  if v_by = 'worker' then
    v_points := case when v_hours >= 24 then 0
                     when v_hours >= 6  then coalesce((v_pp ->> 'cancel_lt_24h')::int, 1)
                     else coalesce((v_pp ->> 'cancel_lt_6h')::int, 2) end;
  elsif v_hours < 24 then
    v_comp := round(s.est_wage_per_seat * public.app_setting_num('shop_cancel_compensation_rate'));
  end if;

  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_by, cancel_reason = p_reason,
         penalty_points = v_points, compensation_amount = v_comp, seat_hold = 0
   where id = b.id
  returning * into b;

  -- Ghế mở lại; khoản tạm giữ của ghế vẫn nằm trong shifts.hold_amount cho người nhận sau
  update public.shifts
     set filled_count = filled_count - 1,
         status = case when status = 'full' then 'open'::public.shift_status else status end
   where id = s.id;

  if v_comp > 0 then
    perform public.fn_ledger(public.wallet_of(v_shop.owner_id), 'compensation', -v_comp, 0, 'booking', b.id,
                             'Bồi thường do hủy người làm trong vòng 24 giờ');
    perform public.fn_ledger(public.wallet_of(b.worker_id), 'compensation', v_comp, 0, 'booking', b.id,
                             'Bồi thường do quán hủy ca');
  end if;

  if v_by = 'worker' then
    perform public.fn_notify(v_shop.owner_id, 'booking.cancelled_by_worker', 'Người làm đã hủy ca',
              format('Ca "%s" (%s) đã mở lại 1 chỗ trống.', s.title, public.fmt_time(s.start_at)),
              jsonb_build_object('shift_id', s.id, 'booking_id', b.id));
    -- "Danh sách dự phòng": báo ngay cho người quen của quán
    perform public.fn_notify(l.worker_id, 'shift.seat_reopened', v_shop.name || ' vừa có chỗ trống',
              format('%s, %s.', s.title, public.fmt_time(s.start_at)), jsonb_build_object('shift_id', s.id))
       from public.shop_worker_lists l
      where l.shop_id = s.shop_id and l.list_type = 'favorite' and l.worker_id <> b.worker_id;
    if v_points > 0 then perform public.fn_apply_penalty(b.worker_id); end if;
  else
    perform public.fn_notify(b.worker_id, 'booking.cancelled_by_shop', 'Quán đã hủy ca của bạn',
              format('Ca "%s" (%s).%s', s.title, public.fmt_time(s.start_at),
                     case when v_comp > 0 then ' Bạn được bồi thường ' || public.fmt_vnd(v_comp) || '.' else '' end),
              jsonb_build_object('shift_id', s.id, 'booking_id', b.id));
  end if;
  return b;
end $$;

-- ---------- Lời mời người quen ----------
create or replace function public.fn_invite_workers(p_actor uuid, p_shift_id uuid, p_worker_ids uuid[],
                                                    p_message text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  s       public.shifts;
  v_shop  public.shops;
  v_count int;
begin
  select * into s from public.shifts where id = p_shift_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_shop from public.shops where id = s.shop_id;
  if v_shop.owner_id <> p_actor then raise exception 'FORBIDDEN'; end if;
  if s.status <> 'open' or s.start_at <= now() then raise exception 'INVALID_STATE'; end if;

  -- Chỉ mời được người quen (favorite) hoặc người đã từng hoàn thành ca ở quán
  with eligible as (
    select distinct w as worker_id
      from unnest(p_worker_ids) as w
     where exists (select 1 from public.shop_worker_lists l
                    where l.shop_id = s.shop_id and l.worker_id = w and l.list_type = 'favorite')
        or (exists (select 1 from public.bookings bk
                     where bk.shop_id = s.shop_id and bk.worker_id = w and bk.status = 'completed')
            and not exists (select 1 from public.shop_worker_lists l
                             where l.shop_id = s.shop_id and l.worker_id = w and l.list_type = 'blocked'))
  ), ins as (
    insert into public.shift_invites (shift_id, shop_id, worker_id, message)
    select s.id, s.shop_id, e.worker_id, p_message from eligible e
    on conflict (shift_id, worker_id) do nothing
    returning worker_id
  )
  select count(*) into v_count
    from (select public.fn_notify(ins.worker_id, 'invite.received', v_shop.name || ' mời bạn làm ca',
                   format('%s, %s, %s/giờ.', s.title, public.fmt_time(s.start_at), public.fmt_vnd(s.hourly_rate)),
                   jsonb_build_object('shift_id', s.id))
            from ins) x;
  return v_count;
end $$;

create or replace function public.fn_respond_invite(p_actor uuid, p_invite_id uuid, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  i       public.shift_invites;
  b       public.bookings;
  v_owner uuid;
begin
  select * into i from public.shift_invites where id = p_invite_id for update;
  if not found or i.worker_id <> p_actor then raise exception 'NOT_FOUND'; end if;
  if i.status <> 'pending' then raise exception 'INVALID_STATE'; end if;
  if p_accept then
    b := public.fn_book_shift(p_actor, i.shift_id, 'invite');
    select * into i from public.shift_invites where id = p_invite_id;
    return jsonb_build_object('invite', to_jsonb(i), 'booking', to_jsonb(b));
  end if;
  update public.shift_invites set status = 'declined', responded_at = now() where id = i.id returning * into i;
  select owner_id into v_owner from public.shops where id = i.shop_id;
  perform public.fn_notify(v_owner, 'invite.declined', 'Một lời mời đã bị từ chối', null,
                           jsonb_build_object('shift_id', i.shift_id));
  return jsonb_build_object('invite', to_jsonb(i));
end $$;

-- ---------- Chấm công & giờ công ----------
create or replace function public.fn_compute_timesheet(p_booking_id uuid, p_check_out_at timestamptz,
                                                       p_distance_m int, p_auto boolean)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b         public.bookings;
  s         public.shifts;
  v_minutes int;
  v_wage    bigint;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  select * into s from public.shifts where id = b.shift_id;
  -- Tính từ max(giờ vào, giờ bắt đầu) đến min(giờ ra, giờ kết thúc), trừ thời gian nghỉ (BR-12)
  v_minutes := greatest(0,
      floor(extract(epoch from (least(p_check_out_at, s.end_at) - greatest(b.check_in_at, s.start_at))) / 60)::int
      - s.break_minutes);
  v_wage := public.calc_wage(v_minutes, s.hourly_rate);
  update public.bookings
     set status = 'checked_out', check_out_at = p_check_out_at, check_out_distance_m = p_distance_m,
         auto_checked_out = p_auto, worked_minutes = v_minutes, wage_amount = v_wage,
         fee_amount = public.calc_fee(v_wage, s.fee_rate)
   where id = b.id
  returning * into b;
  return b;
end $$;

-- API đã xác thực chữ ký QR (HMAC) và độ mới của token rồi truyền shop_id/window vào đây.
-- Hàm trả về jsonb (không RAISE khi bị từ chối) để lần quét lỗi vẫn được ghi log chống gian lận.
create or replace function public.fn_record_attendance(
  p_actor uuid, p_booking_id uuid, p_type public.attendance_type,
  p_token_shop_id uuid, p_token_window bigint,
  p_lat double precision default null, p_lng double precision default null, p_accuracy_m int default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  b          public.bookings;
  s          public.shifts;
  v_shop     public.shops;
  v_name     text;
  v_now      timestamptz := now();
  v_code     text;
  v_dist     int;
  v_allow    int;
  v_skip_geo boolean := public.demo_flag('skip_geofence');
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.worker_id <> p_actor then raise exception 'NOT_FOUND'; end if;
  select * into s from public.shifts where id = b.shift_id;
  select * into v_shop from public.shops where id = b.shop_id;

  if p_lat is not null and p_lng is not null then
    v_dist := round(st_distance(v_shop.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography));
  end if;

  if p_token_shop_id is distinct from b.shop_id then
    v_code := 'WRONG_SHOP';
  elsif (p_type = 'check_in' and b.status <> 'confirmed') or (p_type = 'check_out' and b.status <> 'checked_in') then
    v_code := 'INVALID_STATE';
  elsif p_type = 'check_in'
        and (v_now < s.start_at - make_interval(mins => public.app_setting_int('checkin_open_before_minutes'))
             or v_now >= s.end_at) then
    v_code := 'OUTSIDE_CHECKIN_WINDOW';
  elsif not v_skip_geo and v_dist is null then
    v_code := 'LOCATION_REQUIRED';
  elsif not v_skip_geo then
    v_allow := v_shop.geofence_radius_m
               + least(coalesce(p_accuracy_m, 0), public.app_setting_int('gps_accuracy_cap_m'));
    if v_dist > v_allow then v_code := 'OUT_OF_GEOFENCE'; end if;
  end if;

  insert into public.attendance_events (booking_id, worker_id, shop_id, type, accepted, reject_code,
                                        token_window, lat, lng, accuracy_m, distance_m)
  values (b.id, b.worker_id, b.shop_id, p_type, v_code is null, v_code,
          p_token_window, p_lat, p_lng, p_accuracy_m, v_dist);

  if v_code is not null then
    return jsonb_build_object('accepted', false, 'reject_code', v_code, 'distance_m', v_dist);
  end if;

  select full_name into v_name from public.profiles where id = b.worker_id;
  if p_type = 'check_in' then
    update public.bookings
       set status = 'checked_in', check_in_at = v_now, check_in_distance_m = v_dist,
           is_late = v_now > s.start_at + make_interval(mins => public.app_setting_int('late_after_minutes'))
     where id = b.id
    returning * into b;
    perform public.fn_notify(v_shop.owner_id, 'attendance.checked_in', v_name || ' đã check-in',
              format('Lúc %s%s%s.', to_char(v_now at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI'),
                     case when v_dist is not null then ', cách quán ' || v_dist || ' m' else '' end,
                     case when b.is_late then ' (đi muộn)' else '' end),
              jsonb_build_object('booking_id', b.id, 'shift_id', b.shift_id));
  else
    b := public.fn_compute_timesheet(b.id, v_now, v_dist, false);
    perform public.fn_notify(v_shop.owner_id, 'timesheet.pending', 'Chờ duyệt giờ công: ' || v_name,
              format('%s phút · %s tiền công.', b.worked_minutes, public.fmt_vnd(b.wage_amount)),
              jsonb_build_object('booking_id', b.id, 'shift_id', b.shift_id));
  end if;
  return jsonb_build_object('accepted', true, 'distance_m', v_dist, 'booking', to_jsonb(b));
end $$;

-- ---------- Quyết toán ----------
create or replace function public.fn_settle_booking(p_booking_id uuid, p_worked_minutes int default null,
                                                    p_note text default null, p_approved_by uuid default null)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b         public.bookings;
  s         public.shifts;
  v_owner   uuid;
  v_wallet  uuid;
  v_minutes int;
  v_wage    bigint;
  v_fee     bigint;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if b.settled_at is not null then raise exception 'ALREADY_SETTLED'; end if;
  select * into s from public.shifts where id = b.shift_id for update;
  select owner_id into v_owner from public.shops where id = b.shop_id;
  v_wallet := public.wallet_of(v_owner);

  v_minutes := coalesce(p_worked_minutes, b.worked_minutes, 0);
  v_wage    := public.calc_wage(v_minutes, s.hourly_rate);
  v_fee     := public.calc_fee(v_wage, s.fee_rate);

  -- (1) hoàn tạm giữ của ghế  (2) quán trả tiền công + phí  (3) ghi có người làm và nền tảng
  if b.seat_hold > 0 then
    perform public.fn_ledger(v_wallet, 'release', b.seat_hold, -b.seat_hold, 'booking', b.id, 'Hoàn tạm giữ ghế');
    update public.shifts set hold_amount = hold_amount - b.seat_hold where id = s.id;
  end if;
  if v_wage + v_fee > 0 then
    perform public.fn_ledger(v_wallet, 'shift_payment', -(v_wage + v_fee), 0, 'booking', b.id,
                             'Thanh toán ca: ' || s.title);
  end if;
  if v_wage > 0 then
    perform public.fn_ledger(public.wallet_of(b.worker_id), 'earning', v_wage, 0, 'booking', b.id,
                             'Tiền công ca: ' || s.title);
  end if;
  if v_fee > 0 then
    perform public.fn_ledger(public.platform_wallet(), 'platform_fee', v_fee, 0, 'booking', b.id, 'Phí nền tảng');
  end if;

  update public.bookings
     set status = 'completed', worked_minutes = v_minutes, wage_amount = v_wage, fee_amount = v_fee,
         seat_hold = 0, approved_at = now(), approved_by = p_approved_by,
         adjustment_note = coalesce(p_note, adjustment_note), settled_at = now()
   where id = b.id
  returning * into b;
  update public.worker_profiles set completed_count = completed_count + 1 where user_id = b.worker_id;

  perform public.fn_notify(b.worker_id, 'earning.credited', '+' || public.fmt_vnd(v_wage) || ' đã vào ví',
            format('Ca "%s": %s phút làm việc.', s.title, v_minutes), jsonb_build_object('booking_id', b.id));
  return b;
end $$;

create or replace function public.fn_approve_booking(p_actor uuid, p_booking_id uuid,
                                                     p_worked_minutes int default null, p_note text default null)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  v_owner uuid;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select owner_id into v_owner from public.shops where id = b.shop_id;
  if v_owner <> p_actor then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'checked_out' then raise exception 'INVALID_STATE'; end if;
  if p_worked_minutes is not null then
    if p_worked_minutes not between 0 and 960 then raise exception 'VALIDATION_ERROR'; end if;
    if p_worked_minutes <> b.worked_minutes and coalesce(char_length(trim(p_note)), 0) < 5 then
      raise exception 'ADJUSTMENT_NOTE_REQUIRED';
    end if;
  end if;
  return public.fn_settle_booking(b.id, p_worked_minutes, p_note, p_actor);
end $$;

-- ---------- Khiếu nại ----------
create or replace function public.fn_open_dispute(p_actor uuid, p_booking_id uuid, p_reason_code text,
                                                  p_description text)
returns public.disputes
language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  v_owner uuid;
  v_role  public.actor_type;
  d       public.disputes;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select owner_id into v_owner from public.shops where id = b.shop_id;
  v_role := case when p_actor = b.worker_id then 'worker'::public.actor_type
                 when p_actor = v_owner then 'shop'::public.actor_type end;
  if v_role is null then raise exception 'FORBIDDEN'; end if;
  if not (b.status = 'checked_out'
          or (b.status = 'no_show' and v_role = 'worker' and lower(b.period) > now() - interval '72 hours')) then
    raise exception 'DISPUTE_NOT_ALLOWED';
  end if;

  insert into public.disputes (booking_id, opened_by, opener_role, reason_code, description, prev_status)
  values (b.id, p_actor, v_role, p_reason_code, p_description, b.status)
  returning * into d;
  update public.bookings set status = 'disputed' where id = b.id;

  perform public.fn_notify(case when v_role = 'worker' then v_owner else b.worker_id end, 'dispute.opened',
            'Có khiếu nại về ca làm', p_description, jsonb_build_object('dispute_id', d.id, 'booking_id', b.id));
  perform public.fn_notify(p.id, 'dispute.opened', 'Khiếu nại mới cần xử lý', p_description,
            jsonb_build_object('dispute_id', d.id, 'booking_id', b.id))
     from public.profiles p
    where p.role = 'admin';
  return d;
end $$;

create or replace function public.fn_resolve_dispute(p_admin uuid, p_dispute_id uuid, p_accept boolean,
                                                     p_resolution text, p_adjusted_minutes int default null)
returns public.disputes
language plpgsql security definer set search_path = public as $$
declare
  d       public.disputes;
  b       public.bookings;
  v_owner uuid;
begin
  if not exists (select 1 from public.profiles where id = p_admin and role = 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  select * into d from public.disputes where id = p_dispute_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if d.status <> 'open' then raise exception 'INVALID_STATE'; end if;
  select * into b from public.bookings where id = d.booking_id for update;

  if d.prev_status = 'checked_out' then
    -- Ca đã làm: luôn quyết toán; chấp nhận khiếu nại → dùng số phút admin điều chỉnh
    perform public.fn_settle_booking(b.id, case when p_accept then p_adjusted_minutes end,
                                     'Giải quyết khiếu nại: ' || p_resolution, p_admin);
  elsif p_accept then
    -- Người làm chứng minh có mặt dù bị đánh dấu vắng: gỡ điểm phạt và trả công
    if p_adjusted_minutes is null then raise exception 'VALIDATION_ERROR'; end if;
    update public.bookings set penalty_points = 0 where id = b.id;
    update public.worker_profiles set no_show_count = greatest(no_show_count - 1, 0) where user_id = b.worker_id;
    perform public.fn_settle_booking(b.id, p_adjusted_minutes, 'Giải quyết khiếu nại: ' || p_resolution, p_admin);
  else
    update public.bookings set status = 'no_show' where id = b.id;
  end if;

  update public.disputes
     set status = case when p_accept then 'resolved'::public.dispute_status else 'rejected'::public.dispute_status end,
         resolution = p_resolution, adjusted_minutes = p_adjusted_minutes, resolved_by = p_admin, resolved_at = now()
   where id = d.id
  returning * into d;

  select owner_id into v_owner from public.shops where id = b.shop_id;
  perform public.fn_notify(u, 'dispute.resolved', 'Khiếu nại đã được xử lý', p_resolution,
                           jsonb_build_object('dispute_id', d.id, 'booking_id', b.id))
     from unnest(array[b.worker_id, v_owner]) as u;
  return d;
end $$;

-- ---------- Đánh giá hai chiều ----------
create or replace function public.fn_submit_review(p_actor uuid, p_booking_id uuid, p_stars int,
                                                   p_tags text[] default '{}', p_comment text default null)
returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  v_owner uuid;
  v_dir   public.review_direction;
  r       public.reviews;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select owner_id into v_owner from public.shops where id = b.shop_id;
  v_dir := case when p_actor = b.worker_id then 'worker_to_shop'::public.review_direction
                when p_actor = v_owner then 'shop_to_worker'::public.review_direction end;
  if v_dir is null then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'completed' then raise exception 'INVALID_STATE'; end if;
  if b.settled_at < now() - interval '7 days' then raise exception 'REVIEW_WINDOW_CLOSED'; end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'VALIDATION_ERROR'; end if;

  begin
    insert into public.reviews (booking_id, direction, reviewer_id, shop_id, worker_id, stars, tags, comment)
    values (b.id, v_dir, p_actor, b.shop_id, b.worker_id, p_stars, coalesce(p_tags, '{}'), p_comment)
    returning * into r;
  exception when unique_violation then
    raise exception 'ALREADY_REVIEWED';
  end;

  if v_dir = 'worker_to_shop' then
    update public.shops sh
       set rating_avg = x.avg, rating_count = x.cnt
      from (select round(avg(stars)::numeric, 2) as avg, count(*) as cnt
              from public.reviews where shop_id = b.shop_id and direction = 'worker_to_shop') x
     where sh.id = b.shop_id;
    perform public.fn_notify(v_owner, 'review.received', 'Quán nhận được đánh giá ' || p_stars || '★',
                             p_comment, jsonb_build_object('booking_id', b.id));
  else
    update public.worker_profiles wp
       set rating_avg = x.avg, rating_count = x.cnt
      from (select round(avg(stars)::numeric, 2) as avg, count(*) as cnt
              from public.reviews where worker_id = b.worker_id and direction = 'shop_to_worker') x
     where wp.user_id = b.worker_id;
    if 'want_rebook' = any (coalesce(p_tags, '{}')) then
      insert into public.shop_worker_lists (shop_id, worker_id, list_type)
      values (b.shop_id, b.worker_id, 'favorite')
      on conflict do nothing;
    end if;
    perform public.fn_notify(b.worker_id, 'review.received', 'Quán đánh giá bạn ' || p_stars || '★',
                             p_comment, jsonb_build_object('booking_id', b.id));
  end if;
  return r;
end $$;

-- ---------- Nạp / rút tiền ----------
create or replace function public.fn_create_topup(p_actor uuid, p_amount bigint, p_idempotency_key text default null)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  w public.wallets;
  o public.payment_orders;
begin
  select * into w from public.wallets where owner_id = p_actor;
  if not found or w.type <> 'shop' then raise exception 'FORBIDDEN'; end if;
  if p_amount is null or p_amount < public.app_setting_int('topup_min') or p_amount > 50000000 then
    raise exception 'AMOUNT_OUT_OF_RANGE';
  end if;
  if p_idempotency_key is not null then
    select * into o from public.payment_orders where wallet_id = w.id and idempotency_key = p_idempotency_key;
    if found then return o; end if;
  end if;
  insert into public.payment_orders (wallet_id, kind, amount, reference_code, expires_at, idempotency_key)
  values (w.id, 'topup', p_amount, 'CN' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
          now() + make_interval(mins => public.app_setting_int('topup_expire_minutes')), p_idempotency_key)
  returning * into o;
  return o;
end $$;

-- Gọi từ webhook (cổng thanh toán/ngân hàng) hoặc nút "Giả lập đã chuyển khoản". Idempotent.
create or replace function public.fn_confirm_topup(p_reference_code text, p_amount bigint,
                                                   p_provider text default 'vietqr_sim',
                                                   p_provider_txn_id text default null)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  o       public.payment_orders;
  v_owner uuid;
begin
  select * into o from public.payment_orders
   where reference_code = upper(p_reference_code) and kind = 'topup' for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if o.status = 'succeeded' then return o; end if;
  if o.status not in ('pending', 'expired') then raise exception 'INVALID_STATE'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'AMOUNT_OUT_OF_RANGE'; end if;

  update public.payment_orders
     set status = 'succeeded', amount = p_amount, provider = coalesce(p_provider, provider),
         provider_txn_id = p_provider_txn_id, completed_at = now()
   where id = o.id
  returning * into o;
  perform public.fn_ledger(o.wallet_id, 'topup', p_amount, 0, 'payment_order', o.id,
                           'Nạp tiền qua VietQR ' || o.reference_code);
  select owner_id into v_owner from public.wallets where id = o.wallet_id;
  perform public.fn_notify(v_owner, 'wallet.topup_succeeded', 'Nạp tiền thành công', '+' || public.fmt_vnd(p_amount),
                           jsonb_build_object('payment_order_id', o.id));
  return o;
end $$;

create or replace function public.fn_request_withdrawal(p_actor uuid, p_amount bigint,
                                                        p_idempotency_key text default null)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  w  public.wallets;
  wp public.worker_profiles;
  o  public.payment_orders;
begin
  select * into w from public.wallets where owner_id = p_actor;
  if not found or w.type <> 'worker' then raise exception 'FORBIDDEN'; end if;
  select * into wp from public.worker_profiles where user_id = p_actor;
  if wp.bank_bin is null or wp.bank_account_no is null or wp.bank_account_name is null then
    raise exception 'BANK_ACCOUNT_MISSING';
  end if;
  if p_amount is null or p_amount < public.app_setting_int('withdraw_min') then raise exception 'AMOUNT_OUT_OF_RANGE'; end if;
  if p_idempotency_key is not null then
    select * into o from public.payment_orders where wallet_id = w.id and idempotency_key = p_idempotency_key;
    if found then return o; end if;
  end if;

  insert into public.payment_orders (wallet_id, kind, amount, reference_code, bank_snapshot, idempotency_key)
  values (w.id, 'withdrawal', p_amount, 'CNW' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
          jsonb_build_object('bank_bin', wp.bank_bin, 'account_no', wp.bank_account_no,
                             'account_name', wp.bank_account_name),
          p_idempotency_key)
  returning * into o;
  perform public.fn_ledger(w.id, 'withdrawal', -p_amount, 0, 'payment_order', o.id,
                           'Rút tiền về tài khoản ' || wp.bank_account_no);
  return o;
end $$;

create or replace function public.fn_complete_withdrawal(p_order_id uuid, p_success boolean,
                                                         p_provider_txn_id text default null,
                                                         p_reason text default null)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  o       public.payment_orders;
  v_owner uuid;
begin
  select * into o from public.payment_orders where id = p_order_id and kind = 'withdrawal' for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if o.status <> 'pending' then raise exception 'INVALID_STATE'; end if;
  update public.payment_orders
     set status = case when p_success then 'succeeded'::public.payment_status else 'failed'::public.payment_status end,
         provider_txn_id = p_provider_txn_id, failure_reason = p_reason, completed_at = now()
   where id = o.id
  returning * into o;
  if not p_success then
    perform public.fn_ledger(o.wallet_id, 'withdrawal_reversal', o.amount, 0, 'payment_order', o.id,
                             'Hoàn tiền do rút thất bại');
  end if;
  select owner_id into v_owner from public.wallets where id = o.wallet_id;
  perform public.fn_notify(v_owner,
            case when p_success then 'wallet.withdrawal_succeeded' else 'wallet.withdrawal_failed' end,
            case when p_success then 'Đã chuyển ' || public.fmt_vnd(o.amount) || ' về tài khoản'
                 else 'Rút tiền thất bại, tiền đã hoàn về ví' end,
            p_reason, jsonb_build_object('payment_order_id', o.id));
  return o;
end $$;

-- ---------- Tìm ca (đọc, cấp cho authenticated) ----------
create or replace function public.search_shifts(
  p_lat double precision, p_lng double precision, p_radius_m int default 5000,
  p_from timestamptz default now(), p_to timestamptz default now() + interval '7 days',
  p_positions text[] default null, p_min_rate int default null,
  p_sort text default 'match', p_limit int default 20, p_offset int default 0
) returns table (
  shift_id uuid, shop_id uuid, shop_name text, shop_category public.shop_category, shop_rating numeric,
  shop_address text, lat double precision, lng double precision, distance_m int,
  position_code text, title text, start_at timestamptz, end_at timestamptz, hourly_rate int,
  est_earning bigint, headcount int, filled_count int, is_urgent boolean,
  favorites_only_until timestamptz, match_score numeric, total_count bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with me as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as pt,
           (select wp.skills from public.worker_profiles wp where wp.user_id = auth.uid()) as skills
  ),
  base as (
    select s.*, sh.name as shop_name, sh.category as shop_category, sh.rating_avg as shop_rating,
           sh.rating_count as shop_rating_count, sh.address as shop_address,
           st_y(sh.location::geometry) as lat, st_x(sh.location::geometry) as lng,
           st_distance(sh.location, me.pt) as dist, me.skills
      from public.shifts s
      join public.shops sh on sh.id = s.shop_id
     cross join me
     where s.status = 'open' and s.start_at > now()
       and s.start_at >= p_from and s.start_at < p_to
       and st_dwithin(sh.location, me.pt, p_radius_m)
       and (p_positions is null or s.position_code = any (p_positions))
       and (p_min_rate is null or s.hourly_rate >= p_min_rate)
       and not exists (select 1 from public.shop_worker_lists l
                        where l.shop_id = s.shop_id and l.worker_id = auth.uid() and l.list_type = 'blocked')
  ),
  scored as (
    -- Điểm phù hợp (BR-20): 40% khoảng cách, 25% lương, 20% uy tín quán, 15% đúng kỹ năng, +0,1 nếu ca gấp
    select b.*,
           round((0.40 * greatest(0, 1 - b.dist / p_radius_m)
                + 0.25 * least(1, b.hourly_rate / 50000.0)
                + 0.20 * case when b.shop_rating_count = 0 then 0.8 else b.shop_rating / 5 end
                + 0.15 * case when b.position_code = any (coalesce(b.skills, '{}')) then 1 else 0.3 end
                + case when b.is_urgent then 0.10 else 0 end)::numeric, 3) as score
      from base b
  )
  select id, shop_id, shop_name, shop_category, shop_rating, shop_address, lat, lng, round(dist)::int,
         position_code, title, start_at, end_at, hourly_rate, est_wage_per_seat, headcount, filled_count,
         is_urgent, favorites_only_until, score, count(*) over ()
    from scored
   order by case when p_sort = 'distance' then dist end asc nulls last,
            case when p_sort = 'start_time' then start_at end asc nulls last,
            case when p_sort = 'rate' then hourly_rate end desc nulls last,
            score desc, start_at asc
   limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

-- ---------- Tác vụ định kỳ (pg_cron gọi fn_cron_tick mỗi phút) ----------
create or replace function public.fn_cron_send_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select bk.id, bk.worker_id, s.title, s.start_at, sh.name as shop_name
      from public.bookings bk
      join public.shifts s  on s.id = bk.shift_id
      join public.shops  sh on sh.id = bk.shop_id
     where bk.status = 'confirmed' and bk.reminder_sent_at is null
       and s.start_at between now() and now() + interval '2 hours'
       for update of bk skip locked
  loop
    perform public.fn_notify(r.worker_id, 'booking.reminder', 'Sắp đến ca: ' || r.shop_name,
              format('"%s" bắt đầu lúc %s. Nhớ quét QR khi đến quán.', r.title, public.fmt_time(r.start_at)),
              jsonb_build_object('booking_id', r.id));
    update public.bookings set reminder_sent_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.fn_cron_start_shifts() returns int
language plpgsql security definer set search_path = public as $$
declare
  s          public.shifts;
  v_assigned bigint;
  v_free     bigint;
  v_owner    uuid;
  n          int := 0;
begin
  for s in select * from public.shifts where status in ('open', 'full') and start_at <= now()
           for update skip locked loop
    select coalesce(sum(seat_hold), 0) into v_assigned from public.bookings where shift_id = s.id;
    v_free := greatest(s.hold_amount - v_assigned, 0);
    select owner_id into v_owner from public.shops where id = s.shop_id;
    if v_free > 0 then
      perform public.fn_ledger(public.wallet_of(v_owner), 'release', v_free, -v_free, 'shift', s.id,
                               'Hoàn tạm giữ ghế trống');
    end if;
    update public.shifts
       set hold_amount = s.hold_amount - v_free,
           status = case when s.filled_count = 0 then 'expired'::public.shift_status
                         else 'in_progress'::public.shift_status end
     where id = s.id;
    update public.shift_invites set status = 'expired', responded_at = now()
     where shift_id = s.id and status = 'pending';
    if s.filled_count = 0 then
      perform public.fn_notify(v_owner, 'shift.expired', 'Ca không có người nhận',
                format('Ca "%s" đã hết hạn, %s tạm giữ đã được hoàn về ví.', s.title, public.fmt_vnd(v_free)),
                jsonb_build_object('shift_id', s.id));
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.fn_cron_mark_no_shows() returns int
language plpgsql security definer set search_path = public as $$
declare
  r        record;
  n        int := 0;
  v_points int := coalesce((public.app_setting('penalty_points') ->> 'no_show')::int, 4);
begin
  for r in
    select bk.id, bk.worker_id, bk.shift_id, bk.seat_hold, s.title, sh.owner_id
      from public.bookings bk
      join public.shifts s  on s.id = bk.shift_id
      join public.shops  sh on sh.id = bk.shop_id
     where bk.status = 'confirmed'
       and s.start_at + make_interval(mins => public.app_setting_int('no_show_after_minutes')) < now()
       for update of bk skip locked
  loop
    if r.seat_hold > 0 then
      perform public.fn_ledger(public.wallet_of(r.owner_id), 'release', r.seat_hold, -r.seat_hold, 'booking', r.id,
                               'Hoàn tạm giữ do người làm vắng mặt');
      update public.shifts set hold_amount = hold_amount - r.seat_hold where id = r.shift_id;
    end if;
    update public.bookings set status = 'no_show', penalty_points = v_points, seat_hold = 0 where id = r.id;
    update public.worker_profiles set no_show_count = no_show_count + 1 where user_id = r.worker_id;
    perform public.fn_notify(r.owner_id, 'booking.no_show', 'Người làm vắng mặt',
              format('Ca "%s": quá %s phút chưa check-in. Tiền tạm giữ của chỗ này đã hoàn về ví.',
                     r.title, public.app_setting_int('no_show_after_minutes')),
              jsonb_build_object('booking_id', r.id, 'shift_id', r.shift_id));
    perform public.fn_apply_penalty(r.worker_id);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.fn_cron_auto_checkout() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  b public.bookings;
  n int := 0;
begin
  for r in
    select bk.id, bk.worker_id, s.end_at, s.title, sh.owner_id
      from public.bookings bk
      join public.shifts s  on s.id = bk.shift_id
      join public.shops  sh on sh.id = bk.shop_id
     where bk.status = 'checked_in'
       and s.end_at + make_interval(mins => public.app_setting_int('auto_checkout_after_minutes')) < now()
       for update of bk skip locked
  loop
    b := public.fn_compute_timesheet(r.id, r.end_at, null, true);
    perform public.fn_notify(r.owner_id, 'timesheet.pending', 'Chờ duyệt giờ công (tự check-out)',
              format('Ca "%s": %s phút.', r.title, b.worked_minutes), jsonb_build_object('booking_id', r.id));
    perform public.fn_notify(r.worker_id, 'attendance.auto_checked_out', 'Hệ thống đã check-out giúp bạn',
              format('Ca "%s" được tính đến giờ kết thúc ca.', r.title), jsonb_build_object('booking_id', r.id));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.fn_cron_auto_approve() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.bookings
     where status = 'checked_out'
       and check_out_at + make_interval(hours => public.app_setting_int('auto_approve_after_hours')) < now()
       for update skip locked
  loop
    perform public.fn_settle_booking(r.id, null,
              'Tự động duyệt sau ' || public.app_setting_int('auto_approve_after_hours') || ' giờ', null);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.fn_cron_complete_shifts() returns int
language sql security definer set search_path = public as $$
  with done as (
    update public.shifts s set status = 'completed'
     where s.status = 'in_progress' and s.end_at < now()
       and not exists (select 1 from public.bookings b
                        where b.shift_id = s.id and b.status in ('confirmed', 'checked_in', 'checked_out', 'disputed'))
    returning 1
  )
  select count(*)::int from done
$$;

create or replace function public.fn_cron_expire_payments() returns int
language sql security definer set search_path = public as $$
  with x as (
    update public.payment_orders set status = 'expired'
     where kind = 'topup' and status = 'pending' and expires_at < now()
    returning 1
  )
  select count(*)::int from x
$$;

create or replace function public.fn_cron_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v jsonb := '{}'::jsonb;
begin
  v := v || jsonb_build_object('reminders',        public.fn_cron_send_reminders());
  v := v || jsonb_build_object('started',          public.fn_cron_start_shifts());
  v := v || jsonb_build_object('no_shows',         public.fn_cron_mark_no_shows());
  v := v || jsonb_build_object('auto_checkouts',   public.fn_cron_auto_checkout());
  v := v || jsonb_build_object('auto_approved',    public.fn_cron_auto_approve());
  v := v || jsonb_build_object('completed',        public.fn_cron_complete_shifts());
  v := v || jsonb_build_object('expired_payments', public.fn_cron_expire_payments());
  return v;
end $$;

-- ---------- KPI cho dashboard admin ----------
create or replace view public.v_kpi_daily with (security_invoker = true) as
with shift_day as (
  select (s.start_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
         count(*)         as shifts_posted,
         sum(s.headcount) as seats_posted,
         percentile_cont(0.5) within group (order by extract(epoch from (s.filled_at - s.published_at)) / 60)
           filter (where s.filled_at is not null) as median_minutes_to_fill
    from public.shifts s
   where s.status <> 'cancelled'
   group by 1
), booking_day as (
  select (lower(b.period) at time zone 'Asia/Ho_Chi_Minh')::date as day,
         count(*) filter (where b.status <> 'cancelled') as seats_filled,
         count(*) filter (where b.status = 'completed')  as bookings_completed,
         count(*) filter (where b.status = 'no_show')    as no_shows,
         count(*) filter (where b.status = 'cancelled' and b.cancelled_by = 'worker' and b.penalty_points > 0) as late_cancels,
         coalesce(sum(b.wage_amount + b.fee_amount) filter (where b.status = 'completed'), 0) as gmv,
         coalesce(sum(b.fee_amount) filter (where b.status = 'completed'), 0) as fee_revenue
    from public.bookings b
   group by 1
)
select sd.day, sd.shifts_posted, sd.seats_posted,
       coalesce(bd.seats_filled, 0) as seats_filled,
       round(coalesce(bd.seats_filled, 0)::numeric / nullif(sd.seats_posted, 0), 3) as fill_rate,
       round(sd.median_minutes_to_fill::numeric, 1) as median_minutes_to_fill,
       coalesce(bd.bookings_completed, 0) as bookings_completed,
       coalesce(bd.no_shows, 0) as no_shows,
       coalesce(bd.late_cancels, 0) as late_cancels,
       coalesce(bd.gmv, 0) as gmv,
       coalesce(bd.fee_revenue, 0) as fee_revenue
  from shift_day sd
  left join booking_day bd using (day);

create or replace function public.fn_kpi_summary(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'shifts_posted',      coalesce(sum(k.shifts_posted), 0),
    'seats_posted',       coalesce(sum(k.seats_posted), 0),
    'seats_filled',       coalesce(sum(k.seats_filled), 0),
    'fill_rate',          round(coalesce(sum(k.seats_filled), 0)::numeric / nullif(sum(k.seats_posted), 0), 3),
    'bookings_completed', coalesce(sum(k.bookings_completed), 0),
    'no_show_rate',       round(coalesce(sum(k.no_shows), 0)::numeric / nullif(sum(k.seats_filled), 0), 3),
    'gmv',                coalesce(sum(k.gmv), 0),
    'fee_revenue',        coalesce(sum(k.fee_revenue), 0),
    'boost_revenue', (select coalesce(sum(t.balance_delta), 0) from public.wallet_transactions t
                       where t.wallet_id = public.platform_wallet() and t.type = 'boost_fee'
                         and (t.created_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to),
    'median_minutes_to_fill', (select round(percentile_cont(0.5) within group
                                     (order by extract(epoch from (s.filled_at - s.published_at)) / 60)::numeric, 1)
                                 from public.shifts s
                                where s.filled_at is not null
                                  and (s.start_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to),
    'active_workers', (select count(distinct b.worker_id) from public.bookings b
                        where b.status = 'completed'
                          and (lower(b.period) at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to),
    'active_shops',   (select count(distinct s.shop_id) from public.shifts s
                        where (s.start_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to),
    'rebook_rate', (select round(avg(case when exists (
                                  select 1 from public.bookings p
                                   where p.shop_id = b.shop_id and p.worker_id = b.worker_id
                                     and p.status = 'completed' and lower(p.period) < lower(b.period))
                                 then 1 else 0 end)::numeric, 3)
                      from public.bookings b
                     where b.status = 'completed'
                       and (lower(b.period) at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to),
    'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from public.v_kpi_daily d
                        where d.day between p_from and p_to), '[]'::jsonb)
  )
  from public.v_kpi_daily k
 where k.day between p_from and p_to
$$;

-- ---------- Dữ liệu demo ----------
-- Sinh lịch sử N ngày (ca đã hoàn tất, đánh giá) để dashboard có số liệu. Cần sẵn quán và người làm.
create or replace function public.fn_demo_seed_history(p_days int default 60) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_shop     record;
  s          public.shifts;
  d          int;
  k          int;
  v_seat     int;
  v_n        int := 0;
  v_start    timestamptz;
  v_hours    int;
  v_rate     int;
  v_pos      text;
  v_head     int;
  v_wage     bigint;
  v_worker   uuid;
  v_roll     float8;
  v_status   public.booking_status;
  v_booking  uuid;
  v_fee_rate numeric := public.app_setting_num('fee_rate');
begin
  for d in reverse p_days..1 loop
    for k in 1..(6 + floor(random() * 7))::int loop
      select id, owner_id into v_shop from public.shops where is_active order by random() limit 1;
      exit when v_shop.id is null;
      v_pos   := (array['barista', 'server', 'cashier', 'kitchen_helper', 'dishwasher'])[1 + floor(random() * 5)::int];
      v_hours := 4 + floor(random() * 2)::int;
      v_start := (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') - make_interval(days => d)
                  + make_interval(hours => (array[7, 11, 17])[1 + floor(random() * 3)::int]))
                 at time zone 'Asia/Ho_Chi_Minh';
      v_rate  := 25500 + (floor(random() * 30) * 500)::int;
      v_head  := 1 + floor(random() * 3)::int;
      v_wage  := public.calc_wage(v_hours * 60, v_rate);

      insert into public.shifts (shop_id, position_code, title, start_at, end_at, hourly_rate, headcount,
                                 status, fee_rate, est_wage_per_seat, est_fee_per_seat, hold_amount,
                                 published_at, created_at)
      values (v_shop.id, v_pos,
              (select name from public.positions where code = v_pos) || ' ca ' ||
                to_char(v_start at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI'),
              v_start, v_start + make_interval(hours => v_hours), v_rate, v_head,
              'completed', v_fee_rate, v_wage, public.calc_fee(v_wage, v_fee_rate), 0,
              v_start - make_interval(mins => 120 + floor(random() * 600)::int), v_start - interval '1 day')
      returning * into s;

      for v_seat in 1..v_head loop
        v_booking := null;
        v_roll := random();
        continue when v_roll < 0.06;                                   -- 6% ghế không ai nhận
        select wp.user_id into v_worker from public.worker_profiles wp
         where wp.kyc_status = 'verified' order by random() limit 1;
        exit when v_worker is null;
        v_status := case when v_roll < 0.10 then 'no_show'::public.booking_status
                         when v_roll < 0.16 then 'cancelled'::public.booking_status
                         else 'completed'::public.booking_status end;
        insert into public.bookings (shift_id, shop_id, worker_id, status, period, booked_at,
                                     cancelled_at, cancelled_by, check_in_at, check_out_at,
                                     worked_minutes, wage_amount, fee_amount, approved_at, settled_at)
        values (s.id, s.shop_id, v_worker, v_status, s.period,
                s.published_at + make_interval(mins => 5 + floor(random() * 90)::int),
                case when v_status = 'cancelled' then s.start_at - interval '30 hours' end,
                case when v_status = 'cancelled' then 'worker'::public.actor_type end,
                case when v_status = 'completed' then s.start_at - make_interval(mins => floor(random() * 10)::int) end,
                case when v_status = 'completed' then s.end_at + make_interval(mins => floor(random() * 10)::int) end,
                case when v_status = 'completed' then v_hours * 60 end,
                case when v_status = 'completed' then v_wage end,
                case when v_status = 'completed' then public.calc_fee(v_wage, v_fee_rate) end,
                case when v_status = 'completed' then s.end_at + interval '1 hour' end,
                case when v_status = 'completed' then s.end_at + interval '1 hour' end)
        on conflict do nothing                                          -- bỏ qua nếu trùng giờ của người làm
        returning id into v_booking;

        if v_booking is not null and v_status <> 'cancelled' then
          update public.shifts set filled_count = filled_count + 1 where id = s.id;
        end if;
        if v_booking is not null and v_status = 'completed' and random() < 0.7 then
          insert into public.reviews (booking_id, direction, reviewer_id, shop_id, worker_id, stars, tags)
          values (v_booking, 'worker_to_shop', v_worker, s.shop_id, v_worker,
                  (array[3, 4, 4, 5, 5, 5])[1 + floor(random() * 6)::int], '{}'),
                 (v_booking, 'shop_to_worker', v_shop.owner_id, s.shop_id, v_worker,
                  (array[3, 4, 5, 5, 5])[1 + floor(random() * 5)::int], '{}');
        end if;
      end loop;

      update public.shifts
         set filled_at = case when filled_count = headcount
                              then published_at + make_interval(mins => 8 + floor(random() * 170)::int) end
       where id = s.id;
      v_n := v_n + 1;
    end loop;
  end loop;

  update public.shops sh set rating_avg = x.avg, rating_count = x.cnt
    from (select shop_id, round(avg(stars)::numeric, 2) avg, count(*) cnt
            from public.reviews where direction = 'worker_to_shop' group by shop_id) x
   where sh.id = x.shop_id;
  update public.worker_profiles wp set rating_avg = x.avg, rating_count = x.cnt
    from (select worker_id, round(avg(stars)::numeric, 2) avg, count(*) cnt
            from public.reviews where direction = 'shop_to_worker' group by worker_id) x
   where wp.user_id = x.worker_id;
  update public.worker_profiles wp set completed_count = x.c, no_show_count = x.n
    from (select worker_id, count(*) filter (where status = 'completed') c,
                 count(*) filter (where status = 'no_show') n
            from public.bookings group by worker_id) x
   where wp.user_id = x.worker_id;
  return v_n;
end $$;

-- Nút "Reset dữ liệu demo": xóa giao dịch, sinh lại lịch sử, nạp sẵn số dư cho quán
create or replace function public.fn_demo_reset(p_days int default 60, p_shop_balance bigint default 2000000)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_shifts int;
  w        record;
begin
  if not public.demo_flag('enabled') then raise exception 'DEMO_DISABLED'; end if;
  truncate table public.notifications, public.attendance_events, public.reviews, public.disputes,
                 public.shift_invites, public.shop_worker_lists, public.wallet_transactions,
                 public.payment_orders, public.bookings, public.shifts restart identity cascade;
  update public.wallets set balance = 0, held_balance = 0;
  update public.worker_profiles
     set rating_avg = 0, rating_count = 0, completed_count = 0, no_show_count = 0, suspended_until = null;
  update public.shops set rating_avg = 0, rating_count = 0;

  v_shifts := public.fn_demo_seed_history(p_days);

  -- Mỗi quán có sẵn 3 "người quen" để demo tính năng mời lại
  insert into public.shop_worker_lists (shop_id, worker_id, list_type)
  select shop_id, worker_id, 'favorite'
    from (select shop_id, worker_id, row_number() over (partition by shop_id order by count(*) desc) rn
            from public.bookings where status = 'completed' group by shop_id, worker_id) x
   where rn <= 3
  on conflict do nothing;

  for w in select id from public.wallets where type = 'shop' loop
    perform public.fn_ledger(w.id, 'adjustment', p_shop_balance, 0, 'admin', null, 'Số dư khởi tạo cho demo');
  end loop;
  return jsonb_build_object('history_shifts', v_shifts, 'shop_balance', p_shop_balance);
end $$;

-- Nút "⏩ Tua thời gian" khi thuyết trình: dịch cả ca (và booking) về quá khứ để giờ hiện tại
-- = 1 phút TRƯỚC giờ bắt đầu ('start': vào ca đúng giờ) hoặc 1 phút SAU giờ kết thúc ('end'). Chỉ chạy khi demo bật.
create or replace function public.fn_demo_fast_forward(p_shift_id uuid, p_to text) returns public.shifts
language plpgsql security definer set search_path = public as $$
declare
  s       public.shifts;
  v_delta interval;
begin
  if not public.demo_flag('enabled') then raise exception 'DEMO_DISABLED'; end if;
  select * into s from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  v_delta := case p_to when 'start' then s.start_at - now() - interval '1 minute'
                       when 'end'   then s.end_at   - now() + interval '1 minute' end;
  if v_delta is null then raise exception 'VALIDATION_ERROR'; end if;
  if v_delta <= interval '0' then return s; end if;            -- đã qua mốc này rồi
  update public.shifts
     set start_at = start_at - v_delta, end_at = end_at - v_delta,
         published_at = published_at - v_delta, filled_at = filled_at - v_delta,
         favorites_only_until = favorites_only_until - v_delta
   where id = s.id
  returning * into s;
  update public.bookings
     set period = s.period, booked_at = booked_at - v_delta, check_in_at = check_in_at - v_delta
   where shift_id = s.id;
  return s;
end $$;
