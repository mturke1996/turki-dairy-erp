-- عينة التوريد + تسوية الدفع
alter table public.supplies
  add column if not exists sample_qty numeric(12,3);

alter table public.payments
  add column if not exists settlement_complete boolean not null default false;
