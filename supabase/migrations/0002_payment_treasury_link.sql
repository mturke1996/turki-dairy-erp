-- ربط المدفوعات بالخزينة/البنك (تطابق paidFromType/paidFromId في التطبيق)
alter table public.payments
  add column if not exists paid_from_type account_source_type,
  add column if not exists paid_from_id text;

create index if not exists idx_payments_treasury on public.payments(paid_from_type, paid_from_id);
