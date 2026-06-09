-- تحسينات ERP (بعد commit قيم expense_group في 0015)

insert into public.expense_categories (id, name, "group", is_recurring) values
  ('cat-daily', 'مصاريف يومية', 'daily_life', true),
  ('cat-barn', 'مصاريف الحوش', 'barn', true),
  ('cat-osama', 'مصاريف أسامة', 'personal', true),
  ('cat-oweis', 'مصاريف أويس', 'personal', true),
  ('cat-factory-daily', 'مصاريف مصنعية يومية', 'factory', true),
  ('cat-factory-maint', 'صيانة المصنع', 'factory', false),
  ('cat-household', 'مصاريف منزلية', 'daily_life', true)
on conflict (id) do nothing;

-- ── الديون: اتجاه + أطراف خارجية ─────────────────────────────
alter table public.debt_entries
  add column if not exists direction text not null default 'payable'
    check (direction in ('payable', 'receivable'));

alter table public.debt_entries
  add column if not exists party_name text;

alter table public.debt_entries alter column party_id drop not null;

alter table public.debt_entries drop constraint if exists debt_entries_party_kind_check;
alter table public.debt_entries add constraint debt_entries_party_kind_check
  check (party_kind in ('farmer', 'customer', 'employee', 'external'));

update public.debt_entries set direction = 'payable'
  where party_kind = 'farmer' and direction is null;
update public.debt_entries set direction = 'receivable'
  where party_kind = 'customer' and direction is null;
update public.debt_entries set direction = 'receivable'
  where party_kind = 'employee' and direction is null;

-- ── مدخول خارج الخدمة ────────────────────────────────────────
create table if not exists public.external_incomes (
  id               text primary key,
  ref              text not null,
  session_id       text not null references public.sessions(id) on delete restrict,
  date             date not null,
  amount           numeric(14, 2) not null check (amount > 0),
  description      text not null,
  destination_type text not null check (destination_type in ('vault', 'bank')),
  destination_id   text not null,
  created_at       timestamptz not null default now(),
  created_by       text
);

create index if not exists idx_external_incomes_session on public.external_incomes(session_id);
create index if not exists idx_external_incomes_dest on public.external_incomes(destination_type, destination_id);

alter table public.external_incomes enable row level security;

drop policy if exists external_incomes_authenticated_all on public.external_incomes;
create policy external_incomes_authenticated_all on public.external_incomes
  for all to authenticated using (true) with check (true);

alter table public.external_incomes replica identity full;

grant select, insert, update, delete on public.external_incomes to authenticated;

do $do$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'external_incomes'
  ) then
    alter publication supabase_realtime add table public.external_incomes;
  end if;
end $do$;
