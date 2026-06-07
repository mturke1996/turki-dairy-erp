-- ============================================================================
--  0008 — مزامنة مستخدمي Supabase Auth كمديرين (فريق 3 أشخاص)
--  شغّل مرة واحدة في SQL Editor بعد إنشاء الحسابات في Authentication
-- ============================================================================

-- 1) مزامنة كل مستخدمي auth.users → profiles بدور admin
insert into public.profiles (id, email, name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', split_part(coalesce(u.email, 'user'), '@', 1)),
  'admin'::app_role
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  name  = coalesce(nullif(excluded.name, ''), profiles.name),
  role  = 'admin'::app_role;

-- 2) المستخدمون الجدد يُسجَّلون تلقائياً كمديرين
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
    coalesce((new.raw_app_meta_data->>'role')::app_role, 'admin'::app_role)
  )
  on conflict (id) do update set
    email = excluded.email,
    name  = coalesce(excluded.name, profiles.name),
    role  = coalesce(excluded.role, profiles.role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
