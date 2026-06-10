'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, HandCoins, Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { PayoutSourceSelect } from '@/components/employees/payout-source-select';
import { accountBalance } from '@/lib/domain/treasury';
import {
  parsePayoutAccountValue,
  payoutAccountValue,
  payoutSourceLabel,
} from '@/lib/domain/payroll';
import type {
  AccountSourceType,
  BankAccount,
  CashMovement,
  CashVault,
  Employee,
  PayrollBatch,
  PayrollLine,
} from '@/lib/domain/types';
import { cn } from '@/lib/utils';

export type PayrollEmployeePayTarget = {
  batch: PayrollBatch;
  employee: Employee;
  line: PayrollLine;
};

const DIALOG_SHELL = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none border-0',
  'left-0 top-0 translate-x-0 translate-y-0',
  'sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(92dvh,640px)] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border',
);

export function PayrollEmployeePayDialog({
  target,
  onClose,
  vaults,
  banks,
  cashMovements,
  onPay,
}: {
  target: PayrollEmployeePayTarget | null;
  onClose: () => void;
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  onPay: (
    batchId: string,
    employeeId: string,
    source: { type: AccountSourceType; id: string },
  ) => Promise<void>;
}) {
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    const emp = target.employee;
    if (emp.defaultPayoutType && emp.defaultPayoutId) {
      setAccount(payoutAccountValue(emp.defaultPayoutType, emp.defaultPayoutId));
    } else if (target.batch.paidFromType && target.batch.paidFromId) {
      setAccount(payoutAccountValue(target.batch.paidFromType, target.batch.paidFromId));
    } else {
      setAccount('');
    }
  }, [target]);

  const selected = account ? parsePayoutAccountValue(account) : null;
  const balance = selected
    ? accountBalance(selected.type, selected.id, vaults, banks, cashMovements)
    : 0;
  const net = target?.line.netSalary ?? 0;
  const insufficient = net > balance + 0.001;

  const sourceLabel = useMemo(
    () => (selected ? payoutSourceLabel(selected.type, selected.id, vaults, banks) : '—'),
    [selected, vaults, banks],
  );

  async function confirm() {
    if (!target || !selected) return toast.error('اختر مصدر الصرف');
    if (insufficient) {
      return toast.error(`الرصيد المتاح ${moneyText(balance, 0)} — لا يكفي`);
    }
    setBusy(true);
    try {
      await onPay(target.batch.id, target.employee.id, selected);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setAccount('');
        }
      }}
    >
      <DialogContent className={DIALOG_SHELL}>
        <div className="shrink-0 border-b border-border bg-navy-900 px-4 py-4 text-white sm:px-5">
          <DialogHeader className="space-y-1 text-right">
            <DialogTitle className="text-[16px] text-white">صرف راتب فردي</DialogTitle>
            <DialogDescription className="text-[12px] text-white/70">
              {target ? `${target.employee.fullName} — ${target.batch.label}` : ''}
            </DialogDescription>
          </DialogHeader>
        </div>

        {target ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="rounded-2xl bg-navy-50/50 px-4 py-3.5 ring-1 ring-navy-200/50">
              <p className="text-[11px] font-medium text-muted-foreground">يُخصم من الخزينة</p>
              <Money value={net} decimals={0} className="mt-1 block text-xl font-semibold tabular-nums text-navy-900 sm:text-2xl" />
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <span>
                  إجمالي{' '}
                  <Money
                    value={target.line.grossSalary + target.line.bonusAmount}
                    decimals={0}
                    className="inline font-semibold text-foreground"
                  />
                </span>
                {target.line.advanceDeducted > 0 ? (
                  <span className="text-rose-800">
                    <HandCoins className="mr-0.5 inline h-3 w-3" />
                    خصم <Money value={target.line.advanceDeducted} decimals={0} className="inline font-semibold" />
                  </span>
                ) : target.line.debtBefore > 0 ? (
                  <span>
                    دين <Money value={target.line.debtBefore} decimals={0} className="inline font-semibold" />
                  </span>
                ) : null}
              </div>
            </div>

            <Field label="مصدر الصرف" required>
              <PayoutSourceSelect value={account} onChange={setAccount} vaults={vaults} banks={banks} />
            </Field>

            {selected ? (
              <div
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-[13px]"
                role="status"
                aria-live="polite"
              >
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Landmark className="h-4 w-4" />
                  {sourceLabel}
                </span>
                <Money
                  value={balance}
                  decimals={0}
                  className={insufficient ? 'text-[15px] font-bold text-rose-700' : 'text-[15px] font-semibold text-meadow-800'}
                />
              </div>
            ) : null}

            {insufficient && selected ? (
              <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                الرصيد لا يكفي — ناقص {moneyText(net - balance, 0)}.
              </p>
            ) : null}

            {target.line.advanceDeducted > 0 ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground" role="note">
                يُسوّى الدين المسجّل تلقائياً بمقدار {moneyText(target.line.advanceDeducted, 0)} عند التأكيد.
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-canvas-sunken/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3">
          <Button
            onClick={confirm}
            disabled={busy || !selected || insufficient}
            size="sm"
            className="w-full sm:w-auto"
          >
            <Wallet className="size-3.5" />
            {busy ? 'جارٍ الصرف…' : 'تأكيد الصرف'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
