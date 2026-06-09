-- أرصدة الأطراف المُرحّلة عند فتح دورة جديدة
alter table public.sessions
  add column if not exists carry_forward_balances jsonb;
