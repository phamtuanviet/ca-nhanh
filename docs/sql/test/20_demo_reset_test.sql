\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create function pg_temp.check(ok boolean, msg text) returns text language plpgsql as $$
begin
  if ok is not true then raise exception 'CHECK FAILED: %', msg; end if;
  return 'ok  ' || msg;
end $$;

-- 12 more demo workers + a second shop so history has variety
insert into auth.users (id, email, raw_user_meta_data)
select gen_random_uuid(), 'w' || g || '@demo.vn', jsonb_build_object('role', 'worker', 'full_name', 'Người làm ' || g)
  from generate_series(1, 12) g;
update platform_settings set value = '{"enabled": true, "auto_verify": true, "skip_geofence": false}' where key = 'demo_mode';
select 'onboarded ' || count(*) from (select fn_complete_onboarding(id, 'worker', full_name, null, '2003-03-03')
                                       from profiles where full_name like 'Người làm %') x;
insert into shops (owner_id, name, category, address, district, location, verification_status)
values ('00000000-0000-0000-0000-0000000000a1', 'Trà sữa Mây', 'milk_tea', '25 Tạ Quang Bửu, Hai Bà Trưng', 'Hai Bà Trưng',
        st_setsrid(st_makepoint(105.8466, 21.0039), 4326)::geography, 'verified');

select 'reset → ' || fn_demo_reset(30, 2000000)::text;
select pg_temp.check((select count(*) from shifts) between 30 * 6 and 30 * 12, 'history: 180–360 shifts');
select pg_temp.check((select count(*) from bookings where status = 'completed') > 100, '> 100 completed bookings');
select pg_temp.check((select count(*) from shop_worker_lists) between 1 and 6, 'favorites seeded (≤ 3 per shop)');
select pg_temp.check((select bool_and(suspended_until is null) from worker_profiles), 'no one suspended after reset');
select pg_temp.check((select sum(balance + held_balance) from wallets)
                     = (select sum(balance_delta) from wallet_transactions where type = 'adjustment'), 'money = demo adjustments only');
select 'kpi → ' || (fn_kpi_summary(current_date - 30, current_date) - 'daily')::text;
select pg_temp.check((fn_kpi_summary(current_date - 30, current_date) ->> 'fill_rate')::numeric between 0.6 and 1, 'fill rate realistic');
select 'daily rows: ' || jsonb_array_length(fn_kpi_summary(current_date - 30, current_date) -> 'daily');
select 'search from ĐHQG: ' || count(*) from search_shifts(21.0380, 105.7820, 10000);
