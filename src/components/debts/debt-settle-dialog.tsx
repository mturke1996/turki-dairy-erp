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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسوية دين قائم</DialogTitle>
          <DialogDescription>
            {partyLabel} · {DEBT_PARTY_LABELS[entry.partyKind]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <Badge variant="neutral" className="font-mono" dir="ltr">
            {entry.ref}
          </Badge>
          <Badge variant={dir === 'payable' ? 'danger' : 'success'}>{DEBT_DIRECTION_LABELS[dir]}</Badge>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-canvas-sunken px-4 py-3 text-[13px]">
          <span className="text-muted-foreground">المتبقي على هذا الدين</span>
          <Money value={remaining} decimals={0} className="font-bold" />
        </div>

        <div className="space-y-4">
          <Field label="مبلغ التسوية" required>
            <AmountInput value={amount} onChange={setAmount} placeholder="0" />
            {remaining > 0 ? (
              <button
                type="button"
                className="mt-1.5 text-[11px] font-medium text-meadow-700 hover:underline"
                onClick={() => setAmount(String(Math.round(remaining)))}
              >
                تسوية كاملة ({moneyText(remaining, 0)})
              </button>
            ) : null}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="طريقة الدفع">
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
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
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
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
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: سداد دين افتتاحي" />
          </Field>

          {val > 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-[12.5px]">
              <span className="text-muted-foreground">المتبقي بعد التسوية</span>
              <Money value={Math.max(0, remaining - val)} decimals={0} className="font-semibold" />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={busy || remaining <= 0.01}>
            {busy ? 'جارٍ التسوية…' : 'تأكيد التسوية'}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
