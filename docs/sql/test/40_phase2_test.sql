\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
-- 0005: chống trùng giờ chỉ với cam kết còn hiệu lực; không hủy cả ca khi đã có người check-in.
-- Chạy sau 30_fast_forward_test.sql (Minh đã có một ca hoàn tất vừa được tua về 4 giờ trước).
create function pg_temp.check(ok boolean, msg text) returns text language plpgsql as $$
begin if ok is not true then raise exception 'CHECK FAILED: %', msg; end if; return 'ok  ' || msg; end $$;
create function pg_temp.expect_error(p_sql text, p_code text) returns text language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_code then return 'ok  raises ' || p_code; end if;
    raise exception 'EXPECTED % GOT %  (%)', p_code, sqlerrm, p_sql;
  end;
  raise exception 'EXPECTED % BUT SUCCEEDED  (%)', p_code, p_sql;
end $$;
\set owner '00000000-0000-0000-0000-0000000000a1'
\set minh  '00000000-0000-0000-0000-0000000000b1'
\set shop  '00000000-0000-0000-0000-0000000005a1'

\echo '--- 1. chạy tập rồi demo thật: tua tới giờ kết thúc lần hai cho cùng người làm'
select id as s1 from fn_publish_shift(:'owner', :'shop', 'barista', 'Chạy tập', now() + interval '10 minutes', now() + interval '4 hours 10 minutes', 30000, 1) \gset
select id as b1 from fn_book_shift(:'minh', :'s1') \gset
select 'ff start s1' from fn_demo_fast_forward(:'s1', 'start');
select 'check-in s1 ' || (fn_record_attendance(:'minh', :'b1', 'check_in', :'shop', 1, 21.0368, 105.7826, 10) ->> 'accepted');
select 'ff end s1' from fn_demo_fast_forward(:'s1', 'end');
select 'check-out s1 ' || (fn_record_attendance(:'minh', :'b1', 'check_out', :'shop', 2, 21.0368, 105.7826, 10) -> 'booking' ->> 'status');
select id as s2 from fn_publish_shift(:'owner', :'shop', 'barista', 'Demo thật', now() + interval '10 minutes', now() + interval '4 hours 10 minutes', 30000, 1) \gset
select id as b2 from fn_book_shift(:'minh', :'s2') \gset
select 'ff start s2' from fn_demo_fast_forward(:'s2', 'start');
select pg_temp.check((fn_record_attendance(:'minh', :'b2', 'check_in', :'shop', 3, 21.0368, 105.7826, 10) ->> 'accepted')::boolean, 'demo thật: check-in sau khi tua tới giờ bắt đầu');
select pg_temp.check((select (now() - end_at) < interval '2 minutes' from fn_demo_fast_forward(:'s2', 'end')), 'tua tới giờ kết thúc lần hai không vướng ca chạy tập đang chờ duyệt');
select pg_temp.check((fn_record_attendance(:'minh', :'b2', 'check_out', :'shop', 4, 21.0368, 105.7826, 10) -> 'booking' ->> 'worked_minutes')::int = 240, 'demo thật: check-out → 240 phút');
select pg_temp.check((select count(*) = 2 from bookings where id in (:'b1', :'b2') and status = 'checked_out'), 'hai booking chờ duyệt cùng tồn tại');

\echo '--- 2. vẫn chặn hai cam kết còn hiệu lực chồng giờ'
select id as s3 from fn_publish_shift(:'owner', :'shop', 'barista', 'Ca tối', now() + interval '5 hours', now() + interval '7 hours', 30000, 1) \gset
select id as s4 from fn_publish_shift(:'owner', :'shop', 'barista', 'Ca chồng giờ', now() + interval '6 hours', now() + interval '8 hours', 30000, 1) \gset
select 'book s3 ' || status from fn_book_shift(:'minh', :'s3');
select pg_temp.expect_error(format('select fn_book_shift(%L, %L)', :'minh', :'s4'), 'BOOKING_OVERLAP');

\echo '--- 3. không hủy cả ca khi đã có người check-in'
select id as s5 from fn_publish_shift(:'owner', :'shop', 'barista', 'Ca sắp bắt đầu', now() + interval '20 minutes', now() + interval '2 hours 20 minutes', 30000, 1) \gset
select id as b5 from fn_book_shift(:'minh', :'s5') \gset
select pg_temp.check((fn_record_attendance(:'minh', :'b5', 'check_in', :'shop', 5, 21.0368, 105.7826, 10) ->> 'accepted')::boolean, 'check-in sớm 20 phút trước giờ bắt đầu');
select pg_temp.expect_error(format('select fn_cancel_shift(%L, %L, %L)', :'owner', :'s5', 'Đổi kế hoạch'), 'INVALID_STATE');
select pg_temp.check((select status = 'full' and hold_amount = 72000 from shifts where id = :'s5'), 'ca vẫn còn (đủ người), tạm giữ không đổi');
select pg_temp.check((select status = 'checked_in' from bookings where id = :'b5'), 'booking vẫn đang làm');
select pg_temp.check((select status = 'cancelled' from fn_cancel_shift(:'owner', :'s4', 'Không cần nữa')), 'ca chưa ai check-in vẫn hủy được');
select pg_temp.expect_error(format('update bookings set period = (select period from shifts where id = %L) where id = %L', :'s3', :'b5'), 'conflicting key value violates exclusion constraint "bookings_no_overlap"');
