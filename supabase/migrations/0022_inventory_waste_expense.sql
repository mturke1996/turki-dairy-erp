-- 0022: ربط هدر المخزون بالمصاريف (مصروف غير نقدي) + تصنيف سبب التسوية.
-- الهدر يُسجَّل كمصروف غير نقدي حتى لا تختفي قيمة الحليب المدفوع ثمنه.

-- 1) تصنيف سبب تسوية المخزون: 'loss' (هدر يُرحَّل للمصاريف) أو 'correction' (تصحيح كمية).
alter table public.inventory_adjustments
  add column if not exists reason_kind text;

-- 2) المصاريف غير النقدية (هدر) لا تُخصم من خزنة → نسمح بغياب مصدر الدفع.
alter table public.expenses
  add column if not exists non_cash boolean not null default false;
alter table public.expenses
  add column if not exists source_adjustment_id text;
alter table public.expenses
  alter column paid_from_type drop not null;
alter table public.expenses
  alter column paid_from_id drop not null;

-- فهرس لمزامنة/حذف مصروف الهدر المرتبط بتسوية المخزون.
create index if not exists idx_expenses_source_adjustment
  on public.expenses(source_adjustment_id);

-- 3) فئة مصروف الهدر الثابتة (تُنشأ هنا لتفادي مشاكل المفتاح الأجنبي).
insert into public.expense_categories (id, name, "group", is_recurring)
values ('cat-waste', 'هدر وتلف الحليب', 'operations', false)
on conflict (id) do nothing;
