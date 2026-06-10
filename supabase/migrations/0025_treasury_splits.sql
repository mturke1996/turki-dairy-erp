-- تقسيم المبلغ بين خزنتين/بنكين — ربط حركات النقد
alter table public.cash_movements
  add column if not exists split_group_id text,
  add column if not exists split_index smallint,
  add column if not exists split_count smallint,
  add column if not exists split_total_amount numeric(14,2);

alter table public.payments
  add column if not exists treasury_splits jsonb;

create index if not exists idx_cash_mov_split_group
  on public.cash_movements(split_group_id)
  where split_group_id is not null;
