'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, HandCoins, Landmark, Wallet } from 'lucide-react';
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
import { PayoutSourceSelect, buildPayoutOptions } from '@/components/employees/payout-source-select';
import { SALARY_TYPE_LABELS } from '@/lib/domain/constants';
import { accountBalance } from '@/lib/domain/treasury';
import {
  buildPayrollLine,
  parsePayoutAccountValue,
  payoutSourceLabel,
  resolveSuggestedPayout,
} from '@/lib/domain/payroll';
import type { BankAccount, CashMovement, CashVault, Employee } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

const DIALOG_SHELL = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'max-h-[100dvh] h-[100dvh] w-[100vw] max-w-[100vw] rounded-none border-0',
  'left-0 top-0 translate-x-0 translate-y-0',
  'sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(92dvh,640px)] sm:w-full sm:max-w-md',
  'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border',
);

export function EmployeeDirectPayDialog({
  open,
  onOpenChange,
  employee,
  vaults,
  banks,
  cashMovements,
  advanceBalance,
  onPay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  advanceBalance: number;
  onPay: (input: {
    periodFrom: string;
    periodTo: string;
    paidFromType: import('@/lib/domain/types').AccountSourceType;
    paidFromId: string;
  }) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    if (!employee) return null;
    const from = periodFrom || today;
    const to = periodTo || from;
    const line = buildPayrollLine({
      employee,
      batchType: 'all',
      periodFrom: from,
      periodTo: to,
      advanceBalance,
    });
    return { line };
  }, [employee, periodFrom, periodTo, today, advanceBalance]);

  const selected = payoutAccount ? parsePayoutAccountValue(payoutAccount) : null;
  const balance = selected
    ? accountBalance(selected.type, selected.id, vaults, banks, cashMovements)
    : 0;
  const net = preview?.line.netSalary ?? 0;
  const insufficient = net > balance + 0.001;

  useEffect(() => {
    if (!open || !employee) return;
    setPeriodFrom('');
    setPeriodTo('');
    const suggested = resolveSuggestedPayout([employee], vaults, banks);
    const fallback = buildPayoutOptions(vaults, banks)[0];
    if (employee.defaultPayoutType && employee.defaultPayoutId) {
      setPayoutAccount(`${employee.defaultPayoutType}:${employee.defaultPayoutId}`);
    } else if (suggested) {
      setPayoutAccount(`${suggested.type}:${suggested.id}`);
    } else if (fallback) {
      setPayoutAccount(fallback.value);
    } else {
      setPayoutAccount('');
    }
  }, [open, employee, vaults, banks]);

  if (!employee) return null;

  async function submit() {
    const parsed = payoutAccount ? parsePayoutAccountValue(payoutAccount) : null;
    if (!parsed) return toast.error('اختر الخزنة أو البنك');
    if (!preview?.line.netSalary || preview.line.netSalary <= 0) {
      return toast.error('لا يوجد مبلغ للصرف');
    }
    if (insufficient) {
      return toast.error(`الرصيد المتاح ${moneyText(balance, 0)} — لا يكفي`);
    }
    setBusy(true);
    try {
      await onPay({
        periodFrom: periodFrom || today,
        periodTo: periodTo || periodFrom || today,
        paidFromType: parsed.type,
        paidFromId: parsed.id,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL}>
        <div className="shrink-0 border-b border-border bg-navy-900 px-4 py-4 text-white sm:px-5">
          <DialogHeader className="space-y-1 text-right">
            <DialogTitle className="text-[16px] text-white">دفع راتب</DialogTitle>
            <DialogDescription className="text-[12px] text-white/70">
              {employee.fullName} — {SALARY_TYPE_LABELS[employee.salaryType ?? 'monthly']}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="rounded-2xl bg-navy-50/50 px-4 py-3.5 ring-1 ring-navy-200/50">
            <p className="text-[11px] font-medium text-muted-foreground">صافي الصرف</p>
            <Money
              value={net}
              decimals={0}
              className="mt-1 block text-xl font-semibold tabular-nums text-navy-900 sm:text-2xl"
            />
            {preview ? (
              <div className="mt-2.5 flex flex-col gap-1 text-[12px] text-muted-foreground">
                <span>أجر الفترة: {moneyText(preview.line.grossSalary, 0)}</span>
                <span>أيام: {preview.line.attendanceDays}</span>
                {preview.line.advanceDeducted > 0 ? (
                  <span className="text-rose-800">
                    <HandCoins className="mr-0.5 inline h-3 w-3" />
                    خصم دين: {moneyText(preview.line.advanceDeducted, 0)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <Field label="الخزنة / البنك" required>
            <PayoutSourceSelect
              value={payoutAccount}
              onChange={setPayoutAccount}
              vaults={vaults}
              banks={banks}
            />
          </Field>

          {selected ? (
            <div
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-[13px]"
              role="status"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Landmark className="h-4 w-4" />
                {payoutSourceLabel(selected.type, selected.id, vaults, banks)}
              </span>
              <Money
                value={balance}
                decimals={0}
                className={
                  insufficient
                    ? 'text-[15px] font-bold text-rose-700'
                    : 'text-[15px] font-semibold text-meadow-800'
                }
              />
            </div>
          ) : null}

          {insufficient && selected ? (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              الرصيد لا يكفي — ناقص {moneyText(net - balance, 0)}.
            </p>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border bg-canvas-sunken/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-5">
          <Button
            onClick={submit}
            disabled={busy || !selected || insufficient || !net}
            className="w-full sm:w-auto"
          >
            <Wallet className="h-4 w-4" />
            {busy ? 'جارٍ الدفع…' : 'تأكيد الدفع'}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
