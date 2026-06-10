'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Gift, HandCoins, Wallet } from 'lucide-react';
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
  batchPlannedPayout,
  parsePayoutAccountValue,
  payoutAccountValue,
  payoutSourceLabel,
  payrollBatchAdvanceDeducted,
  payrollBatchBonusTotal,
  payrollBatchCarriedForward,
  payrollBatchGrossTotal,
  payrollBatchTotal,
} from '@/lib/domain/payroll';
import type {
  AccountSourceType,
  BankAccount,
  CashMovement,
  CashVault,
  PayrollBatch,
} from '@/lib/domain/types';

export function PayrollPayDialog({
  batch,
  onClose,
  vaults,
  banks,
  cashMovements,
  onPay,
}: {
  batch: PayrollBatch | null;
  onClose: () => void;
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  onPay: (batchId: string, source: { type: AccountSourceType; id: string }) => void;
}) {
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!batch) return;
    const planned = batchPlannedPayout(batch);
    if (planned) {
      setAccount(payoutAccountValue(planned.type, planned.id));
    } else {
      setAccount('');
    }
  }, [batch]);

  const totals = useMemo(() => {
    if (!batch) {
      return { gross: 0, bonus: 0, deducted: 0, carried: 0, net: 0 };
    }
    return {
      gross: payrollBatchGrossTotal(batch.lines),
      bonus: payrollBatchBonusTotal(batch.lines),
      deducted: payrollBatchAdvanceDeducted(batch.lines),
      carried: payrollBatchCarriedForward(batch.lines),
      net: payrollBatchTotal(batch.lines),
    };
  }, [batch]);

  const selected = account ? parsePayoutAccountValue(account) : null;
  const balance = selected
    ? accountBalance(selected.type, selected.id, vaults, banks, cashMovements)
    : 0;
  const total = totals.net;
  const insufficient = total > balance + 0.001;

  const sourceLabel = useMemo(
    () =>
      selected
        ? payoutSourceLabel(selected.type, selected.id, vaults, banks)
        : '—',
    [selected, vaults, banks],
  );

  async function confirm() {
    if (!batch) return;
    if (!selected) return toast.error('اختر مصدر الصرف');
    if (insufficient) {
      return toast.error(`الرصيد المتاح ${moneyText(balance, 0)} — لا يكفي`);
    }
    setBusy(true);
    try {
      onPay(batch.id, selected);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!batch}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setAccount('');
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>صرف الرواتب</DialogTitle>
          <DialogDescription>
            {batch ? `${batch.label} — ${batch.lines.length} موظف` : ''}
          </DialogDescription>
        </DialogHeader>

        {batch ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-canvas-sunken/50 p-3 text-[11.5px]">
              <div>
                <p className="text-muted-foreground">إجمالي الأجور</p>
                <Money value={totals.gross} decimals={0} className="mt-0.5 font-semibold" />
              </div>
              {totals.bonus > 0 ? (
                <div>
                  <p className="text-meadow-800">
                    <Gift className="mr-0.5 inline h-3 w-3" />
                    مكافآت
                  </p>
                  <Money value={totals.bonus} decimals={0} className="mt-0.5 font-semibold text-meadow-800" />
                </div>
              ) : null}
              {totals.deducted > 0 ? (
                <div>
                  <p className="text-rose-800">
                    <HandCoins className="mr-0.5 inline h-3 w-3" />
                    خصم دين
                  </p>
                  <Money value={totals.deducted} decimals={0} className="mt-0.5 font-semibold text-rose-800" />
                </div>
              ) : null}
              {totals.carried > 0 ? (
                <div>
                  <p className="text-amber-800">مُرحَّل</p>
                  <Money value={totals.carried} decimals={0} className="mt-0.5 font-semibold text-amber-800" />
                </div>
              ) : null}
            </div>

            <div className="flex items-end justify-between rounded-xl border border-navy-200/60 bg-navy-50/40 px-4 py-3">
              <div>
                <p className="text-[11px] text-muted-foreground">صافي الصرف من الخزينة</p>
                <Money value={total} decimals={0} className="mt-0.5 text-[20px] font-bold text-navy-900" />
              </div>
              {batch.paidFromType && batch.paidFromId ? (
                <p className="max-w-[140px] text-end text-[10.5px] text-muted-foreground">
                  مخطّط: {payoutSourceLabel(batch.paidFromType, batch.paidFromId, vaults, banks)}
                </p>
              ) : null}
            </div>

            <Field label="مصدر الصرف" required>
              <PayoutSourceSelect
                value={account}
                onChange={setAccount}
                vaults={vaults}
                banks={banks}
              />
            </Field>

            {selected ? (
              <div
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-[12px]"
                role="status"
                aria-live="polite"
              >
                <span className="text-muted-foreground">الرصيد في {sourceLabel}</span>
                <Money
                  value={balance}
                  decimals={0}
                  className={insufficient ? 'font-bold text-rose-700' : 'font-semibold text-meadow-800'}
                />
              </div>
            ) : null}

            {insufficient && selected ? (
              <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-[12px] text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                الرصيد لا يكفي — ناقص {moneyText(total - balance, 0)} تقريباً.
              </p>
            ) : null}

            {totals.deducted > 0 ? (
              <p className="text-[11px] text-muted-foreground" role="note">
                عند التأكيد: يُخصم {moneyText(totals.deducted, 0)} من ديون الموظفين المسجّلة ويُسجَّل {moneyText(total, 0)} خروجاً من الخزينة.
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={confirm} disabled={busy || !selected || insufficient}>
            <Wallet className="h-4 w-4" />
            {busy ? 'جارٍ الصرف…' : 'تأكيد الصرف'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              setAccount('');
            }}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
