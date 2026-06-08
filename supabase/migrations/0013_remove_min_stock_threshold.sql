-- إلغاء حدّ المخزون الأدنى (5000 لتر) — لا عتبة تنبيه للمخزون
update public.app_settings
set min_stock_threshold = 0
where id = 'singleton';

alter table public.app_settings
  alter column min_stock_threshold set default 0;
