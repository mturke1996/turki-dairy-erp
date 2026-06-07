-- ============================================================================
--  0004 — أمان RLS + مزامنة + ملفات المستخدمين
--  • إلغاء وصول anon على بيانات ERP
--  • سياسات authenticated فقط (أداة داخلية أحادية المستأجر)
--  • إدارة profiles للمدير
--  • trigger إنشاء profile تلقائياً
--  • sync_version لكشف التعارض بين الأجهزة
-- ============================================================================

-- ── sync metadata ───────────────────────────────────────────────────────────
alter table public.app_settings
  add column if not exists sync_version bigint not null default 0,
  add column if not exists sync_device_id text,
  add column if not exists sync_updated_at timestamptz;

-- ── إلغاء السياسات المفتوحة ────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'sessions','farmers','customers','cash_vaults','bank_accounts','expense_categories',
    'supplies','sales','payments','inventory_adjustments','cash_movements','cash_transfers',
    'expenses','employees','payroll_batches','audit_logs','app_settings'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "full_access" on public.%I;', t);
    execute format('drop policy if exists "authenticated_full_access" on public.%I;', t);
    execute format(
      'create policy "authenticated_full_access" on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ── profiles: سياسات محسّنة ─────────────────────────────────────────────────
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_modify" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;

-- دوال security definer تتجنّب تكرار RLS لا نهائي (انظر 0006 للترقية)
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin'::app_role from public.profiles where id = auth.uid() limit 1), false);
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

create policy "profiles_read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_app_admin());

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

create policy "profiles_self_insert" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

-- ── سحب صلاحيات anon من جداول ERP ───────────────────────────────────────────
revoke all on all tables in schema public from anon;
grant usage on schema public to anon;
grant select on public.expense_categories to anon;
grant select on public.app_settings to anon;

-- ── trigger: إنشاء profile عند تسجيل مستخدم جديد ────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce((new.raw_app_meta_data->>'role')::app_role, 'admin')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── فهرس profiles ───────────────────────────────────────────────────────────
create index if not exists idx_profiles_role on public.profiles(role);
