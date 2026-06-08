-- تسجيل ديون يدوية (افتتاحية أو مستقلة) — بدون تأثير على المخزون
create table if not exists public.debt_entries (
  id text primary key,
  ref text not null,
  session_id text not null references public.sessions(id) on delete restrict,
  date date not null,
  party_kind text not null check (party_kind in ('farmer', 'customer', 'employee')),
  party_id text not null,
  amount numeric(14, 2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists idx_debt_entries_party on public.debt_entries(party_kind, party_id);
create index if not exists idx_debt_entries_session on public.debt_entries(session_id);

alter table public.debt_entries enable row level security;

drop policy if exists debt_entries_authenticated_all on public.debt_entries;
create policy debt_entries_authenticated_all on public.debt_entries
  for all to authenticated using (true) with check (true);
