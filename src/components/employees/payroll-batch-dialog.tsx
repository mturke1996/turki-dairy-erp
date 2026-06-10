'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BadgeDollarSign, CalendarRange, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { Money, moneyText } from '@/components/shared/money';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayoutSourceSelect, buildPayoutOptions } from '@/components/employees/payout-source-select';
import { PAYROLL_TYPE_LABELS, PAYROLL_TYPE_ORDER, SALARY_TYPE_LABELS } from '@/lib/domain/constants';
import {
  buildPayrollLine,
  parsePayoutAccountValue,
  payrollBatchAdvanceDeducted,
  payrollBatchGrossTotal,
  payrollBatchTotal,
  resolveSuggestedPayout,
  salaryTypeMatchesBatch,
} from '@/lib/domain/payroll';
import type {
  AccountSourceType,
  BankAccount,
  CashVault,
  Employee,
  PayrollType,
  SalaryType,
} from '@/lib/domain/types';

const SALARY_TYPE_ORDER: SalaryType[] = ['monthly', 'half_month', 'daily'];

export function PayrollBatchDialog({
  open,
  onOpenChange,
  employees,
  vaults,
  banks,
  advanceBalanceOf,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  vaults: CashVault[];
  banks: BankAccount[];
  advanceBalanceOf: (employeeId: string) => number;
  onSubmit: (input: {
    label: string;
    payrollType: PayrollType;
    periodFrom: string;
    periodTo: string;
    paidFromType?: AccountSourceType;
    paidFromId?: string;
  }) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [label, setLabel] = useState('');
  const [payrollType, setPayrollType] = useState<PayrollType>('bi_monthly');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [busy, setBusy] = useState(false);

  const active = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees],
  );

  const eligible = useMemo(
    () => active.filter((e) => salaryTypeMatchesBatch(e.salaryType, payrollType)),
    [active, payrollType],
  );

  const previewLines = useMemo(() => {
    const from = periodFrom || today;
    const to = periodTo || from;
    return eligible.map((employee) =>
      buildPayrollLine({
        employee,
        batchType: payrollType,
        periodFrom: from,
        periodTo: to,
        advanceBalance: advanceBalanceOf(employee.id),
      }),
    );
  }, [eligible, payrollType, periodFrom, periodTo, today, advanceBalanceOf]);

  const previewTotal = payrollBatchTotal(previewLines);
  const previewGross = payrollBatchGrossTotal(previewLines);
  const previewDeducted = payrollBatchAdvanceDeducted(previewLines);

  const typeCounts = useMemo(() => {
    const counts: Record<SalaryType, number> = { monthly: 0, half_month: 0, daily: 0 };
    for (const e of active) {
      counts[e.salaryType ?? 'monthly'] += 1;
    }
    return counts;
  }, [active]);

  const batchSalaryLabel =
    payrollType === 'all'
      ? 'كل الموظفين النشطين'
      : payrollType === 'bi_monthly'
        ? 'نصف شهر / شهري (نصف)'
        : payrollType === 'daily'
          ? SALARY_TYPE_LABELS.daily
          : SALARY_TYPE_LABELS.monthly;

  useEffect(() => {
    if (!open) return;
    const suggested = resolveSuggestedPayout(active, vaults, banks);
    const firstOption = buildPayoutOptions(vaults, banks)[0];
    if (suggested) {
      setPayoutAccount(`${suggested.type}:${suggested.id}`);
    } else if (firstOption) {
      setPayoutAccount(firstOption.value);
    } else {
      setPayoutAccount('');
    }
  }, [open, active, vaults, banks]);

  async function submit() {
    if (!label.trim()) return toast.error('أدخل عنوان الكشف');
    if (!eligible.length) {
      return toast.error('لا يوجد موظفون نشطون بنوع راتب مطابق لهذا الكشف');
    }
    const parsed = payoutAccount ? parsePayoutAccountValue(payoutAccount) : null;
    setBusy(true);
    try {
      await onSubmit({
        label: label.trim(),
        payrollType,
        periodFrom: periodFrom || today,
        periodTo: periodTo || periodFrom || today,
        paidFromType: parsed?.type,
        paidFromId: parsed?.id,
      });
      setLabel('');
      setPeriodFrom('');
      setPeriodTo('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <div className="border-b border-border bg-navy-900 px-6 py-5 text-white">
          <DialogHeader className="space-y-1.5 text-right">
            <DialogTitle className="text-[17px] text-white">كشف رواتب جديد</DialogTitle>
            <DialogDescription className="text-[12.5px] text-white/70">
              «الكل» يحسب لكل موظف حسب نوعه والفترة — شهري ÷2 لـ15 يوم، نصف شهر كاملاً، يومي × الأيام.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto px-6 py-5">
          <Field label="عنوان الكشف" required>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="رواتب يونيو 2026 — النصف الثاني"
              className="h-11"
            />
          </Field>

          <Field
            label="نوع الكشف"
            hint={
              payrollType === 'all'
                ? 'يشمل كل النشطين — كل موظف يُحسب حسب نوع راتبه وأيام الفترة.'
                : 'يُضمّ الموظفون المطابقون لنوع الراتب فقط.'
            }
          >
            <Select value={payrollType} onValueChange={(v) => setPayrollType(v as PayrollType)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYROLL_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PAYROLL_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-canvas-sunken/70 p-3 text-center">
            {SALARY_TYPE_ORDER.map((key) => (
              <div key={key} className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">{SALARY_TYPE_LABELS[key]}</p>
                <p className="text-[15px] font-bold tabular-nums">{typeCounts[key]}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="من تاريخ">
              <Input
                type="date"
                dir="ltr"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="h-11"
              />
            </Field>
            <Field label="إلى تاريخ">
              <Input
                type="date"
                dir="ltr"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="h-11"
              />
            </Field>
          </div>

          <Field label="مصدر الصرف المخطّط" required hint="الخزنة أو البنك الذي سيُصرف منه الكشف">
            <PayoutSourceSelect
              value={payoutAccount}
              onChange={setPayoutAccount}
              vaults={vaults}
              banks={banks}
            />
          </Field>

          <div className="rounded-xl border border-border bg-card p-4" role="status" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">معاينة الكشف</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold">
                  <Users className="h-3.5 w-3.5 text-navy-600" />
                  {eligible.length} موظف
                  <span className="text-muted-foreground">·</span>
                  <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                  {PAYROLL_TYPE_LABELS[payrollType]}
                </p>
              </div>
              <Money value={previewTotal} decimals={0} className="text-[18px] font-bold text-navy-800" />
            </div>
            {eligible.length === 0 ? (
              <p className="mt-3 text-[12px] text-rose-700">
                لا يوجد موظفون بنوع «{batchSalaryLabel}» — عدّل نوع الكشف أو بيانات الموظفين.
              </p>
            ) : previewTotal <= 0 ? (
              <p className="mt-3 text-[12px] text-muted-foreground">تحقق من الفترة — الإجمالي صفر حالياً.</p>
            ) : (
              <div className="mt-3 space-y-1 text-[11.5px] text-muted-foreground">
                <p>إجمالي الأجور: {moneyText(previewGross, 0)}</p>
                {previewDeducted > 0 ? (
                  <p className="text-rose-700">خصم دين متوقّع: {moneyText(previewDeducted, 0)}</p>
                ) : null}
                <p className="font-medium text-foreground">
                  صافي الصرف: {moneyText(previewTotal, 0)}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-canvas-sunken/40 px-6 py-4">
          <Button onClick={submit} disabled={busy || !eligible.length || !payoutAccount}>
            <BadgeDollarSign className="h-4 w-4" />
            {busy ? 'جارٍ الإنشاء…' : 'إنشاء الكشف'}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
