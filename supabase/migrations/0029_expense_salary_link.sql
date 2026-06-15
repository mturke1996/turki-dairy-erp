-- 0029: ربط مصروف الراتب بكشف الرواتب المولِّد له.
-- عند صرف راتب موظف (من بروفايله أو من كشف الرواتب) يُنشأ «مصروف انعكاسي»
-- يظهر في سجل المصاريف ويُؤرشَف ضمن الدورة. الحركة النقدية والقيد المحاسبي
-- يأتيان من كشف الرواتب نفسه، فلا يُحتسب هذا المصروف مرتين.

-- 1) عمود الربط: يشير إلى معرّف كشف الرواتب.
alter table public.expenses
  add column if not exists source_payroll_batch_id text;

-- فهرس لمزامنة/حذف مصروف الراتب المرتبط بكشف الرواتب.
create index if not exists idx_expenses_source_payroll_batch
  on public.expenses(source_payroll_batch_id);

-- 2) فئة مصروف الرواتب الثابتة (تُنشأ هنا لتفادي مشاكل المفتاح الأجنبي).
insert into public.expense_categories (id, name, "group", is_recurring)
values ('cat-salary', 'رواتب وأجور', 'labor', true)
on conflict (id) do nothing;
