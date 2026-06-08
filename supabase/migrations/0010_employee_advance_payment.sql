-- سلف الموظفين — نوع دفعة جديد
do $$ begin
  alter type payment_kind add value if not exists 'employee_advance';
exception
  when duplicate_object then null;
end $$;
