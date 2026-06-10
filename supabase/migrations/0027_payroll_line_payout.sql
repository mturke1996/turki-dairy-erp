-- 0027: صرف راتب فردي — حقول paidAt / paidFrom على كل سطر في lines (jsonb).
comment on column public.payroll_batches.lines is
  'سطور الكشف: grossSalary, bonusAmount, debtBefore, advanceDeducted, debtCarriedForward, debtMode, paidAt, paidFromType, paidFromId, netSalary';
