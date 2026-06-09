-- تسوية الديون المسجّلة + مرجع حركة نقدية

alter table public.debt_entries
  add column if not exists settled_amount numeric(14, 2) not null default 0;

alter table public.debt_entries
  add column if not exists settled_at timestamptz;

alter type cash_reference_type add value if not exists 'debt';
