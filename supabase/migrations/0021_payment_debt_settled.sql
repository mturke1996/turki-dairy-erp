-- جزء الدفعة المُطبَّق على ديون مسجّلة (لتجنّب ازدواجية الأرصدة)
alter table public.payments
  add column if not exists debt_settled_amount numeric(14,2);
