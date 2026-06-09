-- 0023: تسجيل وارد الحليب لفترة كاملة (مثلاً كل 15 يوماً) بسجل واحد + سعر الشراء الافتراضي 2.85.

-- 1) فترة التجميع على عمليات الاستلام — اختيارية، تُستخدم عند التسجيل المجمّع.
alter table public.supplies
  add column if not exists period_from date;
alter table public.supplies
  add column if not exists period_to date;

-- 2) سعر شراء اللتر الافتراضي عند تسجيل فلاح جديد = 2.85 د.ل.
-- يُحدَّث فقط إذا كانت القيمة هي الافتراضي القديم (1.85 أو 0) حتى لا نمسّ قيمة عدّلها المستخدم.
update public.app_settings
set default_buy_price = 2.85
where id = 'singleton' and default_buy_price in (0, 1.85);
