-- REPLICA IDENTITY FULL للجداول المتبقية — مزامنة حذف/تحديث Realtime كاملة
do $do$
declare
  t text;
  tables text[] := array[
    'cash_vaults', 'bank_accounts', 'expense_categories', 'payroll_batches', 'audit_logs', 'app_settings'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $do$;
