'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { Money, moneyText } from '@/components/shared/money';
import { AmountInput } from '@/components/shared/amount-input';
import { Badge } from '@/components/ui/badge';
import {
  EMPTY_SPLIT_STATE,
  SplitPaymentFields,
  treasurySelectionFromState,
  validateSplitPaymentState,
  type SplitPaymentState,
} from '@/components/treasury/split-payment-fields';
import { useErpStore } from '@/lib/store/use-erp-store';
import { PAYMENT_METHOD_LABELS, DEBT_PARTY_LABELS } from '@/lib/domain/constants';
import {
  DEBT_DIRECTION_LABELS,
  debtRemainingAmount,
  debtSettlementIsCashOut,
  resolveDebtDirection,
} from '@/lib/domain/debt';
import type { DebtEntry, PaymentMethod } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

function QuickAmountChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-[44px] flex-1 rounded-xl border px-2 py-2 text-[12px] font-semibold transition-colors',
        'active:scale-[0.98]',
        active
          ? 'border-meadow-600 bg-meadow-50 text-meadow-800'
          : 'border-border bg-canvas-sunken/50 text-foreground hover:bg-canvas-sunken',
      )}
    >
      {label}
    </button>
  );
}

export function DebtSettleDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: DebtEntry | null;
}) {
  const settleDebtEntry = useErpStore((s) => s.settleDebtEntry);
  const farmers = useErpStore((s) => s.farmers);
  const customers = useErpStore((s) => s.customers);
  const employees = useErpStore((s) => s.employees);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const cashMovements = useErpStore((s) => s.cashMovements);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [treasury, setTreasury] = useState<SplitPaymentState>(EMPTY_SPLIT_STATE);
  const [busy, setBusy] = useState(false);

  const remaining = entry ? debtRemainingAmount(entry) : 0;
  const cashOut = entry ? debtSettlementIsCashOut(entry) : true;
  const val = Number(amount) || 0;

  useEffect(() => {
    if (open && entry) {
      setAmount(String(Math.round(remaining)));
      setMethod('cash');
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setTreasury(EMPTY_SPLIT_STATE);
    }
  }, [open, entry, remaining]);

  const partyLabel = useMemo(() => {
    if (!entry) return '';
    if (entry.partyKind === 'external') return entry.partyName ?? 'طرف خارجي';
    if (entry.partyKind === 'farmer') return farmers.find((f) => f.id === entry.partyId)?.fullName ?? '—';
    if (entry.partyKind === 'customer') return customers.find((c) => c.id === entry.partyId)?.entityName ?? '—';
    return employees.find((e) => e.id === entry.partyId)?.fullName ?? '—';
  }, [entry, farmers, customers, employees]);

  function pickFraction(fraction: number) {
    const v = Math.round(remaining * fraction);
    setAmount(String(Math.max(1, v)));
  }

  async function submit() {
    if (!entry) return;
    if (val <= 0) return toast.error('أدخل مبلغاً صحيحاً.');
    if (val > remaining + 0.01) return toast.error(`المتبقي ${moneyText(remaining, 0)}`);

    const splitErr = validateSplitPaymentState(val, treasury, {
      allowNone: true,
      checkOutflow: cashOut,
      vaults,
      banks,
      cashMovements,
    });
    if (splitErr) return toast.error(splitErr);

    setBusy(true);
    try {
      const treasurySel = treasurySelectionFromState(val, treasury);
      const res = await settleDebtEntry(entry.id, {
        amount: val,
        method,
        date: new Date(date + 'T10:00:00').toISOString(),
        notes: notes.trim() || undefined,
        ...treasurySel,
      });
      if (res.ok) {
        toast.success('تمت تسوية الدين', { description: `${moneyText(val, 0)} — ${entry.ref}` });
        onOpenChange(false);
      } else toast.error(res.error ?? 'تعذّرت التسوية');
    } finally {
      setBusy(false);
    }
  }

  if (!entry) return null;

  const dir = resolveDebtDirection(entry);
  const afterSettle = Math.max(0, remaining - val);
  const isFull = val >= remaining - 0.01 && remaining > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'gap-0 p-0 sm:max-w-md',
          'max-h-[94dvh] overflow-hidden',
          'bottom-0 top-auto translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-b-2xl',
        )}
      >
        <div className="overflow-y-auto px-5 pb-4 pt-6 sm:px-6 sm:pb-6">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base sm:text-lg">
              {cashOut ? 'صرف / تسوية دين' : 'تحصيل دين'}
            </DialogTitle>
            <DialogDescription>
              {partyLabel} · {DEBT_PARTY_LABELS[entry.partyKind]}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
            <Badge variant="neutral" className="font-mono" dir="ltr">
              {entry.ref}
            </Badge>
            <Badge variant={dir === 'payable' ? 'danger' : 'success'}>
              {DEBT_DIRECTION_LABELS[dir]}
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas-sunken px-4 py-3.5">
            <span className="text-[13px] text-muted-foreground">المتبقي</span>
            <Money value={remaining} decimals={0} className="text-lg font-bold" />
          </div>

          <div className="mt-5 space-y-4">
            <Field label="مبلغ التسوية" required>
              <AmountInput
                value={amount}
                onChange={setAmount}
                placeholder="0"
                className="h-12 text-lg"
              />
              {remaining > 0 ? (
                <div className="mt-3 flex gap-2">
                  <QuickAmountChip label="25%" onClick={() => pickFraction(0.25)} />
                  <QuickAmountChip label="50%" onClick={() => pickFraction(0.5)} />
                  <QuickAmountChip label="75%" onClick={() => pickFraction(0.75)} />
                  <QuickAmountChip
                    label="كامل"
                    active={isFull}
                    onClick={() => setAmount(String(Math.round(remaining)))}
                  />
                </div>
              ) : null}
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="طريقة الدفع">
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {PAYMENT_METHOD_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="التاريخ">
                <Input
                  type="date"
                  dir="ltr"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11"
                />
              </Field>
            </div>

            <SplitPaymentFields
              totalAmount={val}
              vaults={vaults}
              banks={banks}
              cashMovements={cashMovements}
              state={treasury}
              onChange={setTreasury}
              singleLabel={cashOut ? 'الصرف من حساب' : 'الإيداع في حساب'}
              outflow={cashOut}
              allowNone
            />

            <Field label="ملاحظة" hint="اختياري">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: سداد دين افتتاحي"
                className="h-11"
              />
            </Field>

            {val > 0 ? (
              <div
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-[13px]',
                  afterSettle <= 0.01
                    ? 'border-meadow-200 bg-meadow-50/60'
                    : 'border-dashed border-border',
                )}
              >
                <span className="text-muted-foreground">
                  {afterSettle <= 0.01 ? 'سيُسَدَّد بالكامل' : 'المتبقي بعد التسوية'}
                </span>
                <Money
                  value={afterSettle}
                  decimals={0}
                  className={cn('font-bold', afterSettle <= 0.01 && 'text-meadow-800')}
                />
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-border bg-card px-5 py-4 sm:px-6">
          <Button
            onClick={submit}
            disabled={busy || remaining <= 0.01}
            className="h-12 w-full text-[14px] sm:flex-1"
          >
            {busy ? 'جارٍ التسوية…' : `تأكيد ${val > 0 ? moneyText(val, 0) : ''}`}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="h-11 w-full sm:w-auto"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
