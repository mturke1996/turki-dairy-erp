-- السماح ب amount = 0 بعد تسوية الدين بالكامل
alter table public.debt_entries drop constraint if exists debt_entries_amount_check;
alter table public.debt_entries add constraint debt_entries_amount_check check (amount >= 0);
