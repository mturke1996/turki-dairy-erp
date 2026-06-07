-- ============================================================================
--  مصنع التركي للحليب ومشتقاته — مخطط قاعدة البيانات (Supabase / PostgreSQL 16)
--  Turki Dairy ERP — Initial schema
--
--  كيفية النشر:
--    1) افتح Supabase Dashboard → SQL Editor → New query
--    2) الصق محتوى هذا الملف كاملاً ثم Run
--    (أو عبر CLI:  supabase db push)
--
--  ملاحظات:
--    • كل المفاتيح الأساسية نوعها TEXT لتطابق المعرّفات التي يولّدها التطبيق
--      (مثل  farmer-xxxx ، cycle-2026-06-1).
--    • الجداول مرتبطة ببعضها عبر FOREIGN KEYS (انظر قسم العلاقات في كل جدول).
--    • RLS مفعّل على كل الجداول مع سياسات وصول كاملة لمفتاح anon/authenticated
--      (أداة داخلية أحادية المستأجر). فعّل Supabase Auth وقيّد السياسات للإنتاج.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  0) الأنواع المعدودة (ENUMS) — تطابق أنواع TypeScript في src/lib/domain/types.ts
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'livestock_type') then
    create type livestock_type as enum ('cow','sheep','goat','mixed');
  end if;
  if not exists (select 1 from pg_type where typname = 'quality_tier') then
    create type quality_tier as enum ('A','B','C');
  end if;
  if not exists (select 1 from pg_type where typname = 'farmer_status') then
    create type farmer_status as enum ('active','suspended','inactive');
  end if;
  if not exists (select 1 from pg_type where typname = 'customer_type') then
    create type customer_type as enum ('factory','retailer','distributor','individual');
  end if;
  if not exists (select 1 from pg_type where typname = 'price_tier') then
    create type price_tier as enum ('wholesale','premium','standard');
  end if;
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type session_status as enum ('open','locked','archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash','bank','cheque');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_kind') then
    create type payment_kind as enum ('farmer_payment','customer_payment');
  end if;
  if not exists (select 1 from pg_type where typname = 'account_source_type') then
    create type account_source_type as enum ('vault','bank');
  end if;
  if not exists (select 1 from pg_type where typname = 'cash_movement_type') then
    create type cash_movement_type as enum
      ('income','expense','transfer_in','transfer_out','sale_payment','farmer_payout','salary','adjustment');
  end if;
  if not exists (select 1 from pg_type where typname = 'cash_direction') then
    create type cash_direction as enum ('in','out');
  end if;
  if not exists (select 1 from pg_type where typname = 'cash_reference_type') then
    create type cash_reference_type as enum
      ('sale','supply','expense','payroll','transfer','manual','opening','payment');
  end if;
  if not exists (select 1 from pg_type where typname = 'expense_group') then
    create type expense_group as enum ('operations','logistics','admin','labor');
  end if;
  if not exists (select 1 from pg_type where typname = 'expense_status') then
    create type expense_status as enum ('pending','approved','rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'department') then
    create type department as enum ('operations','finance','logistics','management');
  end if;
  if not exists (select 1 from pg_type where typname = 'contract_type') then
    create type contract_type as enum ('permanent','temporary','seasonal');
  end if;
  if not exists (select 1 from pg_type where typname = 'employee_status') then
    create type employee_status as enum ('active','on_leave','terminated');
  end if;
  if not exists (select 1 from pg_type where typname = 'payroll_type') then
    create type payroll_type as enum ('monthly','bi_monthly');
  end if;
  if not exists (select 1 from pg_type where typname = 'payroll_status') then
    create type payroll_status as enum ('draft','approved','paid');
  end if;
  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type audit_action as enum ('create','update','delete','login','export','close','transfer','pay');
  end if;
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin','accountant','operator','hr_manager','viewer');
  end if;
end $$;

-- ----------------------------------------------------------------------------
--  1) الدورات نصف الشهرية (SESSIONS / BI-MONTHLY CYCLES)  ← الجدول الأب الرئيسي
-- ----------------------------------------------------------------------------
create table if not exists public.sessions (
  id                   text primary key,
  label                text not null,
  period_from          date not null,
  period_to            date not null,
  status               session_status not null default 'open',
  cycle_number         smallint check (cycle_number in (1,2)),
  opening_stock        numeric(14,3) not null default 0,
  opening_avg_cost     numeric(14,3) not null default 0,
  opening_payables     numeric(14,2) not null default 0,
  opening_receivables  numeric(14,2) not null default 0,
  closed_at            timestamptz,
  archive              jsonb,
  created_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  2) الفلاحون (FARMERS)
-- ----------------------------------------------------------------------------
create table if not exists public.farmers (
  id                 text primary key,
  code               text not null,
  full_name          text not null,
  region             text not null default '',
  phone              text not null default '',
  livestock_type     livestock_type default 'cow',
  livestock_count    integer not null default 0,
  avg_daily_yield    numeric(12,2),
  bank_account       text,
  iban               text,
  quality_tier       quality_tier not null default 'A',
  default_buy_price  numeric(12,3) not null default 0,
  status             farmer_status not null default 'active',
  onboarding_date    date,
  notes              text,
  created_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3) العملاء (CUSTOMERS)
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id                  text primary key,
  code                text not null,
  entity_name         text not null,
  entity_type         customer_type not null default 'retailer',
  tax_number          text,
  phone               text not null default '',
  credit_limit        numeric(14,2) not null default 0,
  payment_terms       integer not null default 0,
  price_tier          price_tier not null default 'wholesale',
  default_sell_price  numeric(12,3) not null default 0,
  on_hold             boolean not null default false,
  onboarding_date     date,
  notes               text,
  created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  4) خزن النقد (CASH VAULTS)
-- ----------------------------------------------------------------------------
create table if not exists public.cash_vaults (
  id              text primary key,
  code            text not null,
  name            text not null,
  opening_balance numeric(14,2) not null default 0,
  is_active       boolean not null default true,
  responsible     text,
  location        text,
  min_threshold   numeric(14,2),
  notes           text,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  5) الحسابات البنكية (BANK ACCOUNTS)
-- ----------------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id               text primary key,
  code             text not null,
  bank_name        text not null,
  account_number   text not null default '',
  iban             text,
  account_holder   text not null default '',
  opening_balance  numeric(14,2) not null default 0,
  is_active        boolean not null default true,
  branch_name      text,
  contact_officer  text,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  6) تصنيفات المصاريف (EXPENSE CATEGORIES)
-- ----------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id              text primary key,
  name            text not null,
  "group"         expense_group not null default 'operations',
  budget_monthly  numeric(14,2),
  is_recurring    boolean not null default false
);

-- ----------------------------------------------------------------------------
--  7) عمليات التوريد (SUPPLIES)  → farmers, sessions
-- ----------------------------------------------------------------------------
create table if not exists public.supplies (
  id           text primary key,
  ref          text not null,
  farmer_id    text not null references public.farmers(id)  on delete restrict,
  session_id   text not null references public.sessions(id) on delete cascade,
  date         timestamptz not null default now(),
  quantity     numeric(14,3) not null default 0,
  unit_price   numeric(12,3) not null default 0,
  total        numeric(14,2) not null default 0,
  quality_tier quality_tier not null default 'A',
  fat_pct      numeric(6,2),
  notes        text,
  created_at   timestamptz not null default now(),
  created_by   text
);
create index if not exists idx_supplies_farmer  on public.supplies(farmer_id);
create index if not exists idx_supplies_session on public.supplies(session_id);
create index if not exists idx_supplies_date    on public.supplies(date);

-- ----------------------------------------------------------------------------
--  8) عمليات البيع (SALES)  → customers, sessions
-- ----------------------------------------------------------------------------
create table if not exists public.sales (
  id          text primary key,
  ref         text not null,
  customer_id text not null references public.customers(id) on delete restrict,
  session_id  text not null references public.sessions(id)  on delete cascade,
  date        timestamptz not null default now(),
  quantity    numeric(14,3) not null default 0,
  unit_price  numeric(12,3) not null default 0,
  total       numeric(14,2) not null default 0,
  due_date    date,
  notes       text,
  created_at  timestamptz not null default now(),
  created_by  text
);
create index if not exists idx_sales_customer on public.sales(customer_id);
create index if not exists idx_sales_session  on public.sales(session_id);
create index if not exists idx_sales_date     on public.sales(date);

-- ----------------------------------------------------------------------------
--  9) المدفوعات والمقبوضات (PAYMENTS)  → sessions
--     party_id يشير إلى فلاح أو عميل (متعدد الأشكال) لذا بلا FK مباشر.
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id              text primary key,
  ref             text not null,
  kind            payment_kind not null,
  party_id        text not null,
  session_id      text not null references public.sessions(id) on delete cascade,
  date            timestamptz not null default now(),
  amount          numeric(14,2) not null default 0,
  method          payment_method not null default 'cash',
  paid_from_type  account_source_type,
  paid_from_id    text,
  reference       text,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      text
);
create index if not exists idx_payments_party   on public.payments(party_id);
create index if not exists idx_payments_session on public.payments(session_id);
create index if not exists idx_payments_kind    on public.payments(kind);

-- ----------------------------------------------------------------------------
-- 10) تسويات المخزون (INVENTORY ADJUSTMENTS)  → sessions
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_adjustments (
  id         text primary key,
  ref        text not null,
  session_id text not null references public.sessions(id) on delete cascade,
  date       timestamptz not null default now(),
  quantity   numeric(14,3) not null default 0,
  unit_cost  numeric(12,3) not null default 0,
  reason     text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_adjustments_session on public.inventory_adjustments(session_id);

-- ----------------------------------------------------------------------------
-- 11) حركات النقد (CASH MOVEMENTS)  → sessions
--     source_id / reference_id متعدد الأشكال (خزنة أو بنك / مستند مرجعي).
-- ----------------------------------------------------------------------------
create table if not exists public.cash_movements (
  id             text primary key,
  ref            text not null,
  movement_type  cash_movement_type not null,
  source_type    account_source_type not null,
  source_id      text not null,
  amount         numeric(14,2) not null default 0,
  direction      cash_direction not null,
  reference_type cash_reference_type not null default 'manual',
  reference_id   text,
  description    text not null default '',
  session_id     text not null references public.sessions(id) on delete cascade,
  date           timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     text
);
create index if not exists idx_cash_mov_session on public.cash_movements(session_id);
create index if not exists idx_cash_mov_source  on public.cash_movements(source_type, source_id);
create index if not exists idx_cash_mov_ref     on public.cash_movements(reference_type, reference_id);

-- ----------------------------------------------------------------------------
-- 12) التحويلات بين الحسابات (CASH TRANSFERS)  → sessions
-- ----------------------------------------------------------------------------
create table if not exists public.cash_transfers (
  id            text primary key,
  ref           text not null,
  from_type     account_source_type not null,
  from_id       text not null,
  to_type       account_source_type not null,
  to_id         text not null,
  amount        numeric(14,2) not null default 0,
  date          timestamptz not null default now(),
  reference_doc text,
  notes         text,
  session_id    text not null references public.sessions(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists idx_transfers_session on public.cash_transfers(session_id);

-- ----------------------------------------------------------------------------
-- 13) المصاريف (EXPENSES)  → expense_categories, sessions
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id             text primary key,
  ref            text not null,
  category_id    text not null references public.expense_categories(id) on delete restrict,
  amount         numeric(14,2) not null default 0,
  description    text not null default '',
  date           timestamptz not null default now(),
  paid_from_type account_source_type not null,
  paid_from_id   text not null,
  invoice_ref    text,
  session_id     text not null references public.sessions(id) on delete cascade,
  status         expense_status not null default 'approved',
  recorded_by    text,
  approved_by    text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_expenses_category on public.expenses(category_id);
create index if not exists idx_expenses_session  on public.expenses(session_id);

-- ----------------------------------------------------------------------------
-- 14) الموظفون (EMPLOYEES)  → bank_accounts
--     allowances مخزّنة كـ jsonb: { housing, transport, food }
-- ----------------------------------------------------------------------------
create table if not exists public.employees (
  id            text primary key,
  code          text not null,
  full_name     text not null,
  national_id   text,
  job_title     text not null default '',
  department    department not null default 'operations',
  base_salary   numeric(14,2) not null default 0,
  allowances    jsonb not null default '{"housing":0,"transport":0,"food":0}'::jsonb,
  hire_date     date,
  contract_type contract_type not null default 'permanent',
  bank_id       text references public.bank_accounts(id) on delete set null,
  phone         text not null default '',
  status        employee_status not null default 'active',
  created_at    timestamptz not null default now()
);
create index if not exists idx_employees_bank on public.employees(bank_id);

-- ----------------------------------------------------------------------------
-- 15) دفعات الرواتب (PAYROLL BATCHES)  → sessions
--     lines مخزّنة كـ jsonb: PayrollLine[]
-- ----------------------------------------------------------------------------
create table if not exists public.payroll_batches (
  id             text primary key,
  ref            text not null,
  label          text not null,
  payroll_type   payroll_type not null default 'monthly',
  period_from    date,
  period_to      date,
  lines          jsonb not null default '[]'::jsonb,
  total_amount   numeric(14,2) not null default 0,
  paid_from_type account_source_type,
  paid_from_id   text,
  status         payroll_status not null default 'draft',
  session_id     text not null references public.sessions(id) on delete cascade,
  created_by     text,
  approved_by    text,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_payroll_session on public.payroll_batches(session_id);

-- ----------------------------------------------------------------------------
-- 16) سجل التدقيق (AUDIT LOGS)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id                 text primary key,
  entity_type        text not null,
  entity_id          text not null,
  action             audit_action not null,
  summary            text not null default '',
  performed_by       text not null default '',
  performed_by_role  app_role not null default 'viewer',
  performed_at       timestamptz not null default now(),
  reason             text
);
create index if not exists idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_at     on public.audit_logs(performed_at);

-- ----------------------------------------------------------------------------
-- 17) إعدادات التطبيق (APP SETTINGS) — صف واحد
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  id                  text primary key default 'singleton',
  min_stock_threshold numeric(14,3) not null default 5000,
  default_buy_price   numeric(12,3) not null default 0,
  default_sell_price  numeric(12,3) not null default 0,
  currency_label      text not null default 'د.ل',
  active_session_id   text,
  updated_at          timestamptz not null default now(),
  constraint app_settings_singleton check (id = 'singleton')
);

-- ----------------------------------------------------------------------------
-- 18) ملفات المستخدمين (PROFILES) — لربط Supabase Auth بالأدوار (اختياري)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  role       app_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  RLS + السياسات + الصلاحيات
--  (أداة داخلية: وصول كامل لـ anon/authenticated. قيّدها عند تفعيل Auth الحقيقي.)
-- ----------------------------------------------------------------------------
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
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "full_access" on public.%I;', t);
    execute format(
      'create policy "full_access" on public.%I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- profiles: كل مستخدم يقرأ/يعدّل ملفه فقط
alter table public.profiles enable row level security;
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_modify" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_self_modify" on public.profiles
  for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- إتاحة الجداول لواجهة البيانات (Data API)
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- ----------------------------------------------------------------------------
--  بيانات إعداد ثابتة (ليست بيانات تجريبية): تصنيفات المصاريف الافتراضية + صف الإعدادات
-- ----------------------------------------------------------------------------
insert into public.expense_categories (id, name, "group", budget_monthly, is_recurring) values
  ('cat-fuel',         'وقود ونقل',                'logistics',  9000, true),
  ('cat-power',        'كهرباء وماء',              'operations', 4500, true),
  ('cat-maint',        'صيانة معدات',              'operations', 3000, false),
  ('cat-supplies',     'مستلزمات تشغيل',           'operations', 2500, false),
  ('cat-transport-in', 'نقل الحليب من الفلاحين',   'logistics',  6000, true),
  ('cat-rent',         'إيجار المقر',              'admin',      5000, true),
  ('cat-comm',         'اتصالات وإنترنت',          'admin',       800, true),
  ('cat-gov',          'رسوم وتراخيص',             'admin',      null, false),
  ('cat-salary',       'رواتب وأجور',              'labor',      null, true)
on conflict (id) do nothing;

insert into public.app_settings (id) values ('singleton')
on conflict (id) do nothing;

-- ============================================================================
--  تم. الجداول الآن منشورة ومرتبطة. شغّل المزامنة من التطبيق (الإعدادات → Supabase).
-- ============================================================================
