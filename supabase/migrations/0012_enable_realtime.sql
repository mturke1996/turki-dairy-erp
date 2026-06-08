-- تفعيل Supabase Realtime لكل جداول ERP — تحديث فوري بين الأجهزة
do $do$
declare
  t text;
  tables text[] := array[
    'sessions', 'farmers', 'customers', 'cash_vaults', 'bank_accounts', 'expense_categories',
    'supplies', 'sales', 'payments', 'debt_entries', 'inventory_adjustments', 'cash_movements',
    'cash_transfers', 'expenses', 'employees', 'payroll_batches', 'audit_logs', 'app_settings'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $do$;

-- REPLICA IDENTITY FULL لبث التحديثات والحذف بشكل كامل
do $do$
declare
  t text;
  tables text[] := array[
    'sessions', 'farmers', 'customers', 'supplies', 'sales', 'payments', 'debt_entries',
    'employees', 'expenses', 'cash_movements', 'cash_transfers', 'inventory_adjustments'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $do$;
