-- إضافة الآيبان للفلاحين وتخفيف الحقول الاختيارية
alter table public.farmers
  add column if not exists iban text;

alter table public.farmers
  alter column avg_daily_yield drop not null;

alter table public.farmers
  alter column livestock_type drop not null;

-- ترحيل الحسابات القديمة إلى iban عند الحاجة
update public.farmers
set iban = bank_account
where iban is null and bank_account is not null and bank_account <> '';
