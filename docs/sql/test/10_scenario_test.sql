\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\set owner  '00000000-0000-0000-0000-0000000000a1'
\set minh   '00000000-0000-0000-0000-0000000000b1'
\set an     '00000000-0000-0000-0000-0000000000b2'
\set binh   '00000000-0000-0000-0000-0000000000b3'
\set kycw   '00000000-0000-0000-0000-0000000000b4'
\set admin  '00000000-0000-0000-0000-0000000000c1'
\set hacker '00000000-0000-0000-0000-0000000000e1'
\set shop   '00000000-0000-0000-0000-0000000005a1'

create function pg_temp.check(ok boolean, msg text) returns text language plpgsql as $$
begin
  if ok is not true then raise exception 'CHECK FAILED: %', msg; end if;
  return 'ok  ' || msg;
end $$;

create function pg_temp.expect_error(p_sql text, p_code text) returns text language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_code then return 'ok  raises ' || p_code; end if;
    raise exception 'EXPECTED % GOT %  (%)', p_code, sqlerrm, p_sql;
  end;
  raise exception 'EXPECTED % BUT SUCCEEDED (%)', p_code, p_sql;
end $$;

update platform_settings set value = '0' where key = 'min_lead_minutes';

\echo '--- 1. signup trigger'
insert into auth.users (id, email, raw_user_meta_data) values
 (:'owner',  'lan@demo.vn',   '{"role":"shop_owner","full_name":"Chị Lan"}'),
 (:'minh',   'minh@demo.vn',  '{"role":"worker","full_name":"Nguyễn Minh"}'),
 (:'an',     'an@demo.vn',    '{"role":"worker","full_name":"Trần An"}'),
 (:'binh',   'binh@demo.vn',  '{"role":"worker","full_name":"Lê Bình"}'),
 (:'admin',  'admin@demo.vn', '{"full_name":"Quản trị"}'),
 (:'hacker', 'x@demo.vn',     '{"role":"admin","full_name":"Hacker"}');
select pg_temp.check((select role from profiles where id = :'hacker') = 'worker', 'metadata role=admin is ignored');
select pg_temp.check((select count(*) from wallets) = 7, '6 user wallets + 1 platform wallet');
update profiles set role = 'admin' where id = :'admin';

\echo '--- 2. onboarding'
select pg_temp.check((select role from fn_complete_onboarding(:'owner', 'shop_owner', 'Nguyễn Thị Lan', '0912345678')) = 'shop_owner', 'owner onboarded');
select pg_temp.check((select role from fn_complete_onboarding(:'minh', 'worker', 'Nguyễn Văn Minh', '0987654321', '2004-05-12')) = 'worker', 'minh onboarded');
select pg_temp.check((select role from fn_complete_onboarding(:'an', 'worker', 'Trần Thị An', '0901112233', '2003-01-20')) = 'worker', 'an onboarded');
select pg_temp.expect_error(format('select fn_complete_onboarding(%L, %L, %L, null, (current_date - interval ''17 years'')::date)', :'binh', 'worker', 'Lê Bình'), 'AGE_RESTRICTED');
select pg_temp.check((select role from fn_complete_onboarding(:'binh', 'worker', 'Lê Văn Bình', null, '2002-09-09')) = 'worker', 'binh onboarded');
select pg_temp.expect_error(format('select fn_complete_onboarding(%L, %L, %L)', :'minh', 'shop_owner', 'Minh'), 'ROLE_LOCKED');
select pg_temp.check((select kyc_status from worker_profiles where user_id = :'minh') = 'verified', 'demo auto_verify → verified');

\echo '--- 3-4. shop + VietQR topup'
insert into shops (id, owner_id, name, category, address, district, location, verification_status)
values (:'shop', :'owner', 'Cà phê Góc Phố', 'cafe', '144 Xuân Thủy, Cầu Giấy', 'Cầu Giấy',
        st_setsrid(st_makepoint(105.7826, 21.0368), 4326)::geography, 'verified');
select reference_code as topup_ref from fn_create_topup(:'owner', 2000000, 'idem-1') \gset
select pg_temp.check((select reference_code from fn_create_topup(:'owner', 2000000, 'idem-1')) = :'topup_ref', 'idempotency key returns the same order');
select pg_temp.expect_error(format('select fn_create_topup(%L, 1000)', :'owner'), 'AMOUNT_OUT_OF_RANGE');
select pg_temp.expect_error(format('select fn_create_topup(%L, 100000)', :'minh'), 'FORBIDDEN');
select 'topup ' || status from fn_confirm_topup(:'topup_ref', 2000000);
select 'webhook retry ' || status from fn_confirm_topup(:'topup_ref', 2000000);
select pg_temp.check((select balance from wallets where owner_id = :'owner') = 2000000, 'shop balance 2.000.000 (credited once)');

\echo '--- 5. publish shift + hold'
select id as shift1 from fn_publish_shift(:'owner', :'shop', 'barista', 'Pha chế ca tối',
       now() + interval '3 hours', now() + interval '8 hours', 30000, 2) \gset
select pg_temp.check((select est_wage_per_seat = 150000 and est_fee_per_seat = 30000 and hold_amount = 360000 from shifts where id = :'shift1'), 'seat = 150.000 wage + 30.000 fee; hold 360.000');
select pg_temp.check((select balance = 1640000 and held_balance = 360000 from wallets where owner_id = :'owner'), 'shop 1.640.000 available / 360.000 held');
select pg_temp.expect_error(format($q$select fn_publish_shift(%L, %L, 'barista', 'Ca lương thấp', now() + interval '3 hours', now() + interval '5 hours', 20000, 1)$q$, :'owner', :'shop'), 'RATE_BELOW_MINIMUM');
select pg_temp.expect_error(format($q$select fn_publish_shift(%L, %L, 'barista', 'Ca quá dài', now() + interval '3 hours', now() + interval '16 hours', 30000, 1)$q$, :'owner', :'shop'), 'INVALID_TIME_RANGE');
select pg_temp.expect_error(format($q$select fn_publish_shift(%L, %L, 'barista', 'Ca quá đắt', now() + interval '3 hours', now() + interval '13 hours', 100000, 20)$q$, :'owner', :'shop'), 'INSUFFICIENT_BALANCE');
select pg_temp.expect_error(format($q$select fn_publish_shift(%L, %L, 'barista', 'Ca người khác', now() + interval '3 hours', now() + interval '5 hours', 30000, 1)$q$, :'minh', :'shop'), 'FORBIDDEN');
select pg_temp.check((select count(*) from shifts) = 1, 'failed publishes left nothing behind');

\echo '--- 6-7. booking, full, late cancel + penalty'
select id as bk_minh from fn_book_shift(:'minh', :'shift1') \gset
select id as bk_an from fn_book_shift(:'an', :'shift1') \gset
select pg_temp.check((select status = 'full' and filled_count = 2 and filled_at is not null from shifts where id = :'shift1'), 'shift1 full');
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'binh', :'shift1'), 'SHIFT_FULL');
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'owner', :'shift1'), 'FORBIDDEN');
select 'cancel ' || status from fn_cancel_booking(:'an', :'bk_an', 'Bận đột xuất');
select pg_temp.check((select penalty_points from bookings where id = :'bk_an') = 2, 'cancel < 6h → 2 points');
select pg_temp.check((select status = 'open' and filled_count = 1 and hold_amount = 360000 from shifts where id = :'shift1'), 'seat reopened, hold unchanged');
select pg_temp.check(penalty_points_of(:'an') = 2, 'An at 2/4 points, not suspended');
select id as bk_binh from fn_book_shift(:'binh', :'shift1') \gset

\echo '--- 8. overlap protection'
select id as shift2 from fn_publish_shift(:'owner', :'shop', 'server', 'Phục vụ ca tối', now() + interval '4 hours', now() + interval '6 hours', 28000, 1) \gset
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'minh', :'shift2'), 'BOOKING_OVERLAP');
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'minh', :'shift1'), 'ALREADY_BOOKED');

\echo '--- 9-10. shift starts, QR check-in with geofence'
update shifts set start_at = now() - interval '10 minutes', end_at = now() + interval '290 minutes' where id = :'shift1';
update bookings set period = (select period from shifts where id = :'shift1') where shift_id = :'shift1';
select 'tick ' || fn_cron_tick()::text;
select pg_temp.check((select status from shifts where id = :'shift1') = 'in_progress', 'cron → in_progress');
select pg_temp.check((fn_record_attendance(:'minh', :'bk_minh', 'check_in', '00000000-0000-0000-0000-000000009999', 1, 21.0368, 105.7826, 10) ->> 'reject_code') = 'WRONG_SHOP', 'QR of another shop rejected');
select pg_temp.check((fn_record_attendance(:'minh', :'bk_minh', 'check_in', :'shop', 1, 21.0500, 105.7826, 10) ->> 'reject_code') = 'OUT_OF_GEOFENCE', '1.5 km away rejected');
select pg_temp.check((fn_record_attendance(:'minh', :'bk_minh', 'check_in', :'shop', 1, null, null, null) ->> 'reject_code') = 'LOCATION_REQUIRED', 'no GPS rejected');
select pg_temp.check((fn_record_attendance(:'minh', :'bk_minh', 'check_in', :'shop', 1, 21.0370, 105.7828, 15) ->> 'accepted')::boolean, 'valid check-in accepted');
select pg_temp.check((select status = 'checked_in' and is_late and check_in_distance_m < 50 from bookings where id = :'bk_minh'), 'checked in, late flag, ~30 m');
select pg_temp.check((select count(*) = 4 and count(*) filter (where not accepted) = 3 from attendance_events where booking_id = :'bk_minh'), 'all 4 scans logged (3 rejected)');

\echo '--- 11. check-out, timesheet, no-show'
update shifts set start_at = now() - interval '301 minutes', end_at = now() - interval '1 minute' where id = :'shift1';
update bookings set period = (select period from shifts where id = :'shift1') where shift_id = :'shift1';
update bookings set check_in_at = (select start_at from shifts where id = :'shift1') - interval '3 minutes' where id = :'bk_minh';
select pg_temp.check((fn_record_attendance(:'minh', :'bk_minh', 'check_out', :'shop', 2, 21.0369, 105.7827, 8) ->> 'accepted')::boolean, 'check-out accepted');
select pg_temp.check((select worked_minutes = 300 and wage_amount = 150000 and fee_amount = 30000 and status = 'checked_out' from bookings where id = :'bk_minh'), 'timesheet 300 min → 150.000 + 30.000 fee');
select 'tick ' || fn_cron_tick()::text;
select pg_temp.check((select status = 'no_show' and penalty_points = 4 and seat_hold = 0 from bookings where id = :'bk_binh'), 'Binh no_show, 4 points');
select pg_temp.check((select suspended_until > now() + interval '6 days' from worker_profiles where user_id = :'binh'), 'Binh suspended 7 days');
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'binh', :'shift2'), 'ACCOUNT_SUSPENDED');

\echo '--- 12. approve + settle'
select pg_temp.expect_error(format('select fn_approve_booking(%L, %L, 320)', :'owner', :'bk_minh'), 'ADJUSTMENT_NOTE_REQUIRED');
select pg_temp.expect_error(format('select fn_approve_booking(%L, %L)', :'minh', :'bk_minh'), 'FORBIDDEN');
select 'approve ' || status from fn_approve_booking(:'owner', :'bk_minh');
select pg_temp.check((select balance from wallets where owner_id = :'minh') = 150000, 'Minh +150.000');
select pg_temp.check((select balance from wallets where type = 'platform') = 30000, 'platform +30.000 fee');
select pg_temp.check((select balance = 1752800 and held_balance = 67200 from wallets where owner_id = :'owner'), 'shop 1.752.800 / 67.200 held');
select pg_temp.expect_error(format('select fn_settle_booking(%L)', :'bk_minh'), 'ALREADY_SETTLED');

\echo '--- 13. two-way reviews'
select 'review ' || stars from fn_submit_review(:'minh', :'bk_minh', 5, '{friendly,as_described}', 'Quán thân thiện');
select 'review ' || stars from fn_submit_review(:'owner', :'bk_minh', 5, '{on_time,want_rebook}', 'Nhanh nhẹn');
select pg_temp.expect_error(format('select fn_submit_review(%L, %L, 4)', :'minh', :'bk_minh'), 'ALREADY_REVIEWED');
select pg_temp.check((select rating_avg = 5 and rating_count = 1 from shops where id = :'shop'), 'shop rating 5.0 (1)');
select pg_temp.check((select list_type from shop_worker_lists where shop_id = :'shop' and worker_id = :'minh') = 'favorite', 'want_rebook → favorite');

\echo '--- 14. favorites-only window + invites'
select id as shift3 from fn_publish_shift(:'owner', :'shop', 'barista', 'Pha chế cuối tuần', now() + interval '2 days', now() + interval '2 days 4 hours', 32000, 1, 0, null, null, 0, 60) \gset
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'an', :'shift3'), 'FAVORITES_ONLY');
select pg_temp.check(fn_invite_workers(:'owner', :'shift3', array[:'minh', :'an']::uuid[], 'Cuối tuần làm nhé') = 1, 'only Minh (favorite) invited');
select 'invite → ' || (fn_respond_invite(:'minh', (select id from shift_invites where shift_id = :'shift3' and worker_id = :'minh'), true) -> 'booking' ->> 'source');
select pg_temp.check((select status from shift_invites where shift_id = :'shift3' and worker_id = :'minh') = 'accepted', 'invite accepted');

\echo '--- 15. shop cancels < 24h → compensation'
select id as shift4 from fn_publish_shift(:'owner', :'shop', 'cashier', 'Thu ngân ca sáng', now() + interval '10 hours', now() + interval '14 hours', 30000, 2) \gset
select id as bk_an4 from fn_book_shift(:'an', :'shift4') \gset
select 'shop cancels worker ' || status from fn_cancel_booking(:'owner', :'bk_an4', 'Quán đóng cửa sớm');
select pg_temp.check((select compensation_amount from bookings where id = :'bk_an4') = 60000, '50% of 120.000 = 60.000');
select pg_temp.check((select balance from wallets where owner_id = :'an') = 60000, 'An received compensation');
select id as bk_minh4 from fn_book_shift(:'minh', :'shift4') \gset
select 'cancel shift ' || status from fn_cancel_shift(:'owner', :'shift4', 'Mất điện');
select pg_temp.check((select status = 'cancelled' and hold_amount = 0 and filled_count = 0 from shifts where id = :'shift4'), 'shift4 cancelled, hold 0');
select pg_temp.check((select balance from wallets where owner_id = :'minh') = 210000, 'Minh 150.000 + 60.000 compensation');

\echo '--- 16. withdrawals'
select pg_temp.expect_error(format('select fn_request_withdrawal(%L, 50000)', :'minh'), 'BANK_ACCOUNT_MISSING');
update worker_profiles set bank_bin = '970436', bank_account_no = '0011001234567', bank_account_name = 'NGUYEN VAN MINH' where user_id = :'minh';
select pg_temp.expect_error(format('select fn_request_withdrawal(%L, 999999999)', :'minh'), 'INSUFFICIENT_BALANCE');
select id as wd1 from fn_request_withdrawal(:'minh', 100000, 'wd-1') \gset
select 'withdraw ' || status from fn_complete_withdrawal(:'wd1', true, 'NAPAS-123');
select id as wd2 from fn_request_withdrawal(:'minh', 50000) \gset
select 'withdraw ' || status from fn_complete_withdrawal(:'wd2', false, null, 'Sai số tài khoản');
select pg_temp.check((select balance from wallets where owner_id = :'minh') = 110000, '210k − 100k ok − 50k failed&reversed = 110k');

\echo '--- 17. dispute on timesheet'
select id as shift5 from fn_publish_shift(:'owner', :'shop', 'server', 'Phục vụ ca trưa', now() + interval '3 days', now() + interval '3 days 4 hours', 30000, 1) \gset
select id as bk_an5 from fn_book_shift(:'an', :'shift5') \gset
update shifts set start_at = now() - interval '4 hours', end_at = now() where id = :'shift5';
update bookings set period = (select period from shifts where id = :'shift5'), status = 'checked_in', check_in_at = now() - interval '3 hours' where id = :'bk_an5';
select 'minutes ' || (fn_record_attendance(:'an', :'bk_an5', 'check_out', :'shop', 3, 21.0368, 105.7826, 5) -> 'booking' ->> 'worked_minutes');
select id as dsp from fn_open_dispute(:'an', :'bk_an5', 'wrong_hours', 'Em vào từ 10h nhưng quét QR lỗi, đã làm đủ 4 tiếng') \gset
select pg_temp.expect_error(format('select fn_approve_booking(%L, %L)', :'owner', :'bk_an5'), 'INVALID_STATE');
select 'dispute ' || status from fn_resolve_dispute(:'admin', :'dsp', true, 'Camera quán xác nhận có mặt từ 10h', 240);
select pg_temp.check((select status = 'completed' and worked_minutes = 240 and wage_amount = 120000 from bookings where id = :'bk_an5'), 'dispute accepted → 240 min = 120.000');

\echo '--- 18. KYC flow, boost, resize'
update platform_settings set value = '{"enabled": true, "auto_verify": false, "skip_geofence": false}' where key = 'demo_mode';
insert into auth.users (id, email, raw_user_meta_data) values (:'kycw', 'kyc@demo.vn', '{"role":"worker","full_name":"Phạm Kiểm"}');
select 'onboard ' || role from fn_complete_onboarding(:'kycw', 'worker', 'Phạm Văn Kiểm', null, '2001-01-01');
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'kycw', :'shift2'), 'KYC_REQUIRED');
select pg_temp.expect_error(format($q$select fn_submit_kyc(%L, 'x/front.jpg', 'x/back.jpg', 'x/selfie.jpg')$q$, :'kycw'), 'FORBIDDEN');
select id as kyc1 from fn_submit_kyc(:'kycw', :'kycw' || '/front.jpg', :'kycw' || '/back.jpg', :'kycw' || '/selfie.jpg', '1234') \gset
select pg_temp.expect_error(format($q$select fn_submit_kyc(%L, %L, %L, %L)$q$, :'kycw', :'kycw' || '/a.jpg', :'kycw' || '/b.jpg', :'kycw' || '/c.jpg'), 'KYC_PENDING');
select pg_temp.expect_error(format('select fn_review_kyc(%L, %L, true)', :'owner', :'kyc1'), 'FORBIDDEN');
select 'kyc ' || status from fn_review_kyc(:'admin', :'kyc1', true);
select 'kyc worker books shift2 ' || status from fn_book_shift(:'kycw', :'shift2');
select balance as platform_before from wallets where type = 'platform' \gset
select id as shift6 from fn_publish_shift(:'owner', :'shop', 'dishwasher', 'Rửa bát ca tối gấp', now() + interval '1 hour', now() + interval '4 hours', 27000, 3, 0, null, null, 0, 0, true) \gset
select pg_temp.check((select is_urgent from shifts where id = :'shift6'), 'shift6 urgent');
select pg_temp.check((select balance from wallets where type = 'platform') = :platform_before + 20000, 'boost fee 20.000 → platform');
select 'resize → ' || headcount from fn_resize_shift(:'owner', :'shift6', 1);
select pg_temp.check((select hold_amount = est_wage_per_seat + est_fee_per_seat from shifts where id = :'shift6'), 'resize 3→1 releases 2 seats');
select pg_temp.expect_error(format('select fn_resize_shift(%L, %L, 0)', :'owner', :'shift6'), 'INVALID_HEADCOUNT');

\echo '--- 19. money invariants'
select pg_temp.check(
  (select sum(balance + held_balance) from wallets)
  = (select coalesce(sum(amount), 0) from payment_orders where kind = 'topup' and status = 'succeeded')
  - (select coalesce(sum(amount), 0) from payment_orders where kind = 'withdrawal' and status in ('pending', 'succeeded'))
  + (select coalesce(sum(balance_delta), 0) from wallet_transactions where type = 'adjustment'),
  'conservation: Σ wallets = topups − withdrawals + adjustments');
select pg_temp.check(
  (select held_balance from wallets where owner_id = :'owner')
  = (select sum(s.hold_amount) from shifts s join shops sh on sh.id = s.shop_id where sh.owner_id = :'owner'),
  'Σ shifts.hold_amount = shop held_balance');
select pg_temp.check(
  (select bool_and(w.balance = x.b and w.held_balance = x.h)
     from wallets w join (select wallet_id, sum(balance_delta) b, sum(held_delta) h
                            from wallet_transactions group by wallet_id) x on x.wallet_id = w.id),
  'every wallet = sum of its ledger rows');
select pg_temp.check((fn_kpi_summary(current_date - 7, current_date + 7) ->> 'bookings_completed')::int = 2, 'KPI: 2 completed bookings');

\echo '--- 20. RLS / privileges as an end user'
select set_config('request.jwt.claim.sub', :'an', false);
select pg_temp.check((select count(*) from search_shifts(21.0368, 105.7826, 3000)) >= 1, 'search_shifts finds open shifts');
set role authenticated;
select pg_temp.check((select count(*) from bookings) = 3, 'An sees only her 3 bookings');
select pg_temp.check((select count(*) from wallets) = 1, 'An sees only her wallet');
select pg_temp.check((select count(*) from shop_worker_lists) = 0, 'workers cannot see shop lists');
select pg_temp.check((select count(*) from search_shifts(21.0368, 105.7826, 3000)) >= 1, 'authenticated may call search_shifts');
select pg_temp.expect_error('select phone from profiles limit 1', 'permission denied for table profiles');
select pg_temp.expect_error('select bank_account_no from worker_profiles limit 1', 'permission denied for table worker_profiles');
select pg_temp.expect_error($q$insert into notifications (user_id, type, title) values (auth.uid(), 'x', 'y')$q$, 'new row violates row-level security policy for table "notifications"');
with u as (update wallets set balance = 99999999 returning 1)
select pg_temp.check(count(*) = 0, 'direct UPDATE on wallets touches 0 rows (no policy)') from u;
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'an', :'shift6'), 'permission denied for function fn_book_shift');
reset role;
