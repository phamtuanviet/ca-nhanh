-- =====================================================================
-- 0003_security.sql — Ca Nhanh: RLS, phân quyền cột, phân quyền hàm, Storage
-- Nguyên tắc: client chỉ ĐỌC qua RLS; mọi GHI đi qua API (service_role) + hàm fn_*.
-- =====================================================================

-- ---------- Bật RLS cho mọi bảng ----------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'worker_profiles', 'kyc_submissions', 'positions', 'shops', 'shifts',
                           'bookings', 'attendance_events', 'shift_invites', 'shop_worker_lists', 'reviews',
                           'disputes', 'wallets', 'wallet_transactions', 'payment_orders', 'notifications',
                           'platform_settings'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Chính sách SELECT (không có chính sách INSERT/UPDATE/DELETE → client không ghi trực tiếp) ----------
create policy profiles_select          on public.profiles          for select to authenticated using (true);
create policy worker_profiles_select   on public.worker_profiles   for select to authenticated using (true);
create policy positions_select         on public.positions         for select to anon, authenticated using (true);
create policy shops_select             on public.shops             for select to authenticated using (true);
create policy reviews_select           on public.reviews           for select to authenticated using (true);
create policy platform_settings_select on public.platform_settings for select to anon, authenticated using (is_public);

create policy shifts_select on public.shifts for select to authenticated using (
  status in ('open', 'full')
  or public.owns_shop(shop_id)
  or public.is_admin()
  or exists (select 1 from public.bookings b where b.shift_id = shifts.id and b.worker_id = (select auth.uid()))
);

create policy bookings_select on public.bookings for select to authenticated using (
  worker_id = (select auth.uid()) or public.owns_shop(shop_id) or public.is_admin()
);
create policy attendance_events_select on public.attendance_events for select to authenticated using (
  worker_id = (select auth.uid()) or public.owns_shop(shop_id) or public.is_admin()
);
create policy shift_invites_select on public.shift_invites for select to authenticated using (
  worker_id = (select auth.uid()) or public.owns_shop(shop_id) or public.is_admin()
);
create policy shop_worker_lists_select on public.shop_worker_lists for select to authenticated using (
  public.owns_shop(shop_id) or public.is_admin()       -- người làm không biết mình bị chặn
);
create policy kyc_submissions_select on public.kyc_submissions for select to authenticated using (
  worker_id = (select auth.uid()) or public.is_admin()
);
create policy wallets_select on public.wallets for select to authenticated using (
  owner_id = (select auth.uid()) or public.is_admin()
);
create policy wallet_transactions_select on public.wallet_transactions for select to authenticated using (
  wallet_id in (select id from public.wallets where owner_id = (select auth.uid())) or public.is_admin()
);
create policy payment_orders_select on public.payment_orders for select to authenticated using (
  wallet_id in (select id from public.wallets where owner_id = (select auth.uid())) or public.is_admin()
);
create policy notifications_select on public.notifications for select to authenticated using (
  user_id = (select auth.uid())
);
create policy disputes_select on public.disputes for select to authenticated using (
  opened_by = (select auth.uid())
  or public.is_admin()
  or exists (select 1 from public.bookings b
              where b.id = disputes.booking_id
                and (b.worker_id = (select auth.uid()) or public.owns_shop(b.shop_id)))
);

-- ---------- Phân quyền cột: ẩn dữ liệu nhạy cảm (SĐT, ngày sinh, tài khoản ngân hàng, vị trí nhà) ----------
revoke select on public.profiles from anon, authenticated;
grant select (id, role, full_name, avatar_url, status, created_at) on public.profiles to authenticated;

revoke select on public.worker_profiles from anon, authenticated;
grant select (user_id, bio, school, skills, kyc_status, rating_avg, rating_count, completed_count, no_show_count)
  on public.worker_profiles to authenticated;

-- ---------- Phân quyền hàm ----------
-- Postgres/Supabase mặc định cho mọi role EXECUTE hàm mới → thu hồi hết rồi cấp lại có chọn lọc.
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
-- Hàm dùng trong RLS và hàm đọc an toàn cho client
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_shop(uuid) to authenticated;
grant execute on function public.search_shifts(double precision, double precision, int, timestamptz, timestamptz,
                                               text[], int, text, int, int) to authenticated;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values
  ('public-media', 'public-media', true),     -- ảnh đại diện, ảnh quán
  ('kyc-private',  'kyc-private',  false)     -- ảnh CCCD + selfie: chỉ chủ sở hữu và admin
on conflict (id) do nothing;

create policy "media_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "kyc_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "kyc_select_owner_or_admin" on storage.objects for select to authenticated
  using (bucket_id = 'kyc-private'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
