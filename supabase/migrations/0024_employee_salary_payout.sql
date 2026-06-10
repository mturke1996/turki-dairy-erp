-- 0024: نوع الراتب (شهري / يومي / نصف شهر) وربط مصدر الصرف الافتراضي بالموظف.

-- 1) نوع الراتب للموظف
do $$ begin
  if not exists (select 1 from pg_type where typname = 'salary_type') then
    create type salary_type as enum ('monthly', 'daily', 'half_month');
  end if;
end $$;

alter table public.employees
  add column if not exists salary_type salary_type not null default 'monthly';

alter table public.employees
  add column if not exists default_payout_type account_source_type;

alter table public.employees
  add column if not exists default_payout_id text;

create index if not exists idx_employees_salary_type
  on public.employees(salary_type);

-- 2) كشوف الرواتب اليومية
alter type payroll_type add value if not exists 'daily';

comment on column public.employees.salary_type is
  'monthly=شهري، daily=أجر يومي (base_salary=الأجر/يوم)، half_month=نصف شهر';
comment on column public.employees.default_payout_type is
  'خزنة أو بنك افتراضي لصرف راتب هذا الموظف';
comment on column public.employees.default_payout_id is
  'معرّف الخزنة أو الحساب البنكي الافتراضي';
