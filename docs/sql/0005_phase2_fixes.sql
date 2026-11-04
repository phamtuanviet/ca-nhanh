-- =============================================================================
-- Ca Nhanh · 0005 · Sửa sau Phase 2 (04/11/2026)
-- 1. Chống trùng giờ chỉ áp cho cam kết còn hiệu lực (đã nhận, đang làm). Booking đã check-out, đang
--    khiếu nại hoặc hoàn tất không còn giữ người làm: về sớm vẫn nhận được ca sau, và "Tua tới giờ kết
--    thúc" của công cụ demo không đụng ca đã tua trước đó của cùng người làm (buổi chạy tập trước demo).
-- 2. fn_cancel_shift từ chối khi đã có người check-in: trước đây chỉ hủy booking "confirmed", booking
--    đang làm bị bỏ lại trên ca đã hủy.
-- =============================================================================

alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (worker_id with =, period with &&)
  where (status in ('confirmed', 'checked_in'));

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
              where worker_id = p_actor and status in ('confirmed', 'checked_in') and period && s.period) then
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
  -- Check-in mở trước giờ bắt đầu 30 phút: đã có người đang làm thì không hủy cả ca được nữa
  if exists (select 1 from public.bookings where shift_id = s.id and status = 'checked_in') then
    raise exception 'INVALID_STATE';
  end if;
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
