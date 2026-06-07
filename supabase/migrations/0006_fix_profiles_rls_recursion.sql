-- ============================================================================
--  0006 — إصلاح خطأ 500 على profiles (تكرار لا نهائي في RLS)
--  السياسات التي تستعلم profiles داخل profiles تسبب infinite recursion.
--  الحل: دالة security definer تتحقق من دور المدير دون تفعيل RLS.
-- ============================================================================

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
  select coalesce((select role = 'admin'::app_role from public.profiles where id = auth.uid() limit 1), false);
$$;

revoke all on function public.auth_user_role() from public;
revoke all on function public.is_app_admin() from public;
grant execute on function public.auth_user_role() to authenticated;
grant execute on function public.is_app_admin() to authenticated;

-- ── إعادة بناء سياسات profiles (حذف ديناميكي — آمن للتشغيل المتكرر) ───────
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy "profiles_read" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_app_admin()
  );

create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles_admin_insert" on public.profiles
  for insert to authenticated
  with check (public.is_app_admin());

create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated
  using (public.is_app_admin());

-- السماح للمستخدم بإنشاء ملفه إذا لم يُنشأه الـ trigger بعد
create policy "profiles_self_insert" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
