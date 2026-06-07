-- ============================================================================
--  0007 — إصلاح سياسات profiles (آمن للتشغيل المتكرر)
--  يشغّل هذا الملف إذا ظهر: policy "profiles_read" already exists
-- ============================================================================

-- 1) حذف كل السياسات الحالية على profiles
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

-- 2) دوال بدون تكرار RLS
create or replace function public.auth_user_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin'::app_role from public.profiles where id = auth.uid() limit 1),
    false
  );
$$;

revoke all on function public.auth_user_role() from public;
revoke all on function public.is_app_admin() from public;
grant execute on function public.auth_user_role() to authenticated;
grant execute on function public.is_app_admin() to authenticated;

-- 3) إعادة إنشاء السياسات
create policy "profiles_read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_app_admin());

create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles_self_insert" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_admin_insert" on public.profiles
  for insert to authenticated
  with check (public.is_app_admin());

create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated
  using (public.is_app_admin());
