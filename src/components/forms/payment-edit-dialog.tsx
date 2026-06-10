'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { Money } from '@/components/shared/money';
import { AmountInput } from '@/components/shared/amount-input';
import {
  EMPTY_SPLIT_STATE,
  SplitPaymentFields,
  treasurySelectionFromState,
  validateSplitPaymentState,
  type SplitPaymentState,
} from '@/components/treasury/split-payment-fields';
import { useErpStore } from '@/lib/store/use-erp-store';
import { PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import { movementsForReference } from '@/lib/domain/treasury-splits';
import type { Payment, PaymentMethod } from '@/lib/domain/types';

function treasuryStateFromPayment(payment: Payment): SplitPaymentState {
  if (payment.treasurySplits && payment.treasurySplits.length >= 2) {
    const [p1, p2] = payment.treasurySplits;
    return {
      enabled: true,
      singleSource: 'none',
      part1Amount: String(p1.amount),
      part1Source: `${p1.sourceType}:${p1.sourceId}`,
      part2Amount: String(p2.amount),
      part2Source: `${p2.sourceType}:${p2.sourceId}`,
    };
  }
  if (payment.paidFromType && payment.paidFromId) {
    return {
      ...EMPTY_SPLIT_STATE,
      singleSource: `${payment.paidFromType}:${payment.paidFromId}`,
    };
  }
  return EMPTY_SPLIT_STATE;
}

export function FarmerPaymentEditDialog({
  open,
  onOpenChange,
  payment,
  partyName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  partyName: string;
}) {
  const updateFarmerPayment = useErpStore((s) => s.updateFarmerPayment);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const cashMovements = useErpStore((s) => s.cashMovements);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [treasury, setTreasury] = useState<SplitPaymentState>(EMPTY_SPLIT_STATE);
  const [settlementComplete, setSettlementComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !payment) return;
    setAmount(String(payment.amount));
    setMethod(payment.method);
    setDate(payment.date.slice(0, 10));
    setReference(payment.reference ?? '');
    setNotes(payment.notes ?? '');
    setSettlementComplete(Boolean(payment.settlementComplete));
    setTreasury(treasuryStateFromPayment(payment));
  }, [open, payment]);

  const oldMovements = payment
    ? movementsForReference(cashMovements, 'payment', payment.id)
    : [];
  const val = Number(amount) || 0;

  async function submit() {
    if (!payment) return;
    const splitErr = validateSplitPaymentState(val, treasury, {
      allowNone: true,
      checkOutflow: true,
      vaults,
      banks,
      cashMovements,
      creditBack: oldMovements,
    });
    if (splitErr) return toast.error(splitErr);
    if (val <= 0) return toast.error('أدخل مبلغاً صحيحاً.');

    const treasurySel = treasurySelectionFromState(val, treasury);
    const noTreasury = !treasury.enabled && treasury.singleSource === 'none';

    setBusy(true);
    try {
      const res = await updateFarmerPayment(payment.id, {
        amount: val,
        method,
        date: new Date(date + 'T10:00:00').toISOString(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        sourceType: noTreasury ? undefined : treasurySel.sourceType,
        sourceId: noTreasury ? undefined : treasurySel.sourceId,
        splits: noTreasury ? null : treasurySel.splits,
        settlementComplete,
      });
      if (res.ok) {
        toast.success('تم تحديث الدفعة', { description: payment.ref });
        onOpenChange(false);
      } else {
        toast.error(res.error ?? 'تعذّر التحديث');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل دفعة للفلاح</DialogTitle>
          <DialogDescription>
            {partyName} · <span dir="ltr">{payment.ref}</span>
          </DialogDescription>
        </DialogHeader>

        {payment.debtSettledAmount && payment.debtSettledAmount > 0.001 ? (
          <p className="rounded-lg bg-canvas-sunken px-3 py-2 text-[11.5px] text-muted-foreground">
            من هذه الدفعة{' '}
            <Money value={payment.debtSettledAmount} decimals={0} className="inline font-semibold" />{' '}
            مُطبَّقة على ديون مسجّلة — يُعاد احتسابها عند تغيير المبلغ.
          </p>
        ) : null}

        <div className="space-y-4">
          <Field label="المبلغ" required>
            <AmountInput value={amount} onChange={setAmount} placeholder="0" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="طريقة الدفع">
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((k) => (
                    <SelectItem key={k} value={k}>{PAYMENT_METHOD_LABELS[k]}</SelectItem>
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
            singleLabel="الصرف من حساب"
            outflow
            allowNone
            creditBack={oldMovements}
          />

          <Field label="رقم المرجع / الشيك" hint="اختياري">
            <Input dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="ملاحظات" hint="اختياري">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-meadow-100 bg-meadow-50/50 px-3 py-2.5">
            <div>
              <Label htmlFor="edit-settlement" className="text-[13px] font-semibold">تم الدفع — تسوية كاملة</Label>
              <p className="text-[11px] text-muted-foreground">يُعلّم حساب الفلاح في هذه الدورة كمسدّد</p>
            </div>
            <Switch id="edit-settlement" checked={settlementComplete} onCheckedChange={setSettlementComplete} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
