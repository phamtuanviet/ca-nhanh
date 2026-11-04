-- =====================================================================
-- 0004_cron_realtime.sql — Ca Nhanh: lịch chạy định kỳ + kênh Realtime
-- Trước khi chạy: Dashboard → Database → Extensions → bật pg_cron.
-- =====================================================================
create extension if not exists pg_cron with schema pg_catalog;   -- Supabase: bật pg_cron (một lần)
select cron.schedule('ca-nhanh-tick', '* * * * *', $$select public.fn_cron_tick()$$);

-- Realtime (postgres_changes) tôn trọng RLS: mỗi người chỉ nhận thay đổi của dòng mình được đọc
alter publication supabase_realtime add table
  public.notifications, public.bookings, public.shifts, public.wallets, public.payment_orders;
