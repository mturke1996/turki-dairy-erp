-- 0026: توسيع سطور كشف الرواتب (jsonb) — دين، مكافآت، ترحيل.
-- الحقول الجديدة في PayrollLine[] داخل payroll_batches.lines:
--   grossSalary, bonusAmount, debtBefore, debtCarriedForward, debtMode ('deduct' | 'carry_forward')
-- لا حاجة لتعديل الأعمدة — jsonb مرن؛ التطبيق يطبّع السطور القديمة عبر normalizePayrollLine.

comment on column public.payroll_batches.lines is
  'سطور الكشف: grossSalary, bonusAmount, debtBefore, advanceDeducted, debtCarriedForward, debtMode, netSalary';
