\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create function pg_temp.check(ok boolean, msg text) returns text language plpgsql as $$
begin if ok is not true then raise exception 'CHECK FAILED: %', msg; end if; return 'ok  ' || msg; end $$;
\set owner '00000000-0000-0000-0000-0000000000a1'
\set minh  '00000000-0000-0000-0000-0000000000b1'
\set shop  '00000000-0000-0000-0000-0000000005a1'
-- live-demo flow: post a shift starting in 10 min, book, fast-forward to start, check in, fast-forward to end, check out
select id as sx from fn_publish_shift(:'owner', :'shop', 'barista', 'Ca demo trên lớp', now() + interval '10 minutes', now() + interval '4 hours 10 minutes', 30000, 1) \gset
select id as bx from fn_book_shift(:'minh', :'sx') \gset
select 'ff start → starts in ' || to_char(start_at - now(), 'MI:SS') from fn_demo_fast_forward(:'sx', 'start');
select pg_temp.check((fn_record_attendance(:'minh', :'bx', 'check_in', :'shop', 1, 21.0368, 105.7826, 10) ->> 'accepted')::boolean, 'check-in right after fast-forward to start');
select pg_temp.check((select not is_late from bookings where id = :'bx'), 'not late');
select 'ff end → ends ' || to_char(now() - end_at, 'MI:SS') || ' ago' from fn_demo_fast_forward(:'sx', 'end');
select pg_temp.check((fn_record_attendance(:'minh', :'bx', 'check_out', :'shop', 2, 21.0368, 105.7826, 10) -> 'booking' ->> 'worked_minutes')::int = 240, 'check-out after fast-forward to end → full 240 min');
select 'settled: +' || wage_amount || 'đ' from fn_approve_booking(:'owner', :'bx');
