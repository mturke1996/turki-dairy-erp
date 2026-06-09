'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { Money, moneyText } from '@/components/shared/money';
import { AmountInput } from '@/components/shared/amount-input';
import { useErpStore } from '@/lib/store/use-erp-store';
import { PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import { accountBalance } from '@/lib/domain/treasury';
import type { Payment, PaymentMethod } from '@/lib/domain/types';

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
  const [source, setSource] = useState('none');
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
    if (payment.paidFromType && payment.paidFromId) {
      setSource(`${payment.paidFromType}:${payment.paidFromId}`);
    } else {
      setSource('none');
    }
  }, [open, payment]);

  const accounts = useMemo(
    () => [
      ...vaults.filter((v) => v.isActive).map((v) => ({ value: `vault:${v.id}`, label: v.name, type: 'vault' as const, id: v.id })),
      ...banks.filter((b) => b.isActive).map((b) => ({ value: `bank:${b.id}`, label: b.bankName, type: 'bank' as const, id: b.id })),
    ],
    [vaults, banks],
  );

  const selected = accounts.find((a) => a.value === source) ?? null;
  const oldCm = payment
    ? cashMovements.find((m) => m.referenceType === 'payment' && m.referenceId === payment.id)
    : null;
  const sourceBalance = selected ? accountBalance(selected.type, selected.id, vaults, banks, cashMovements) : 0;
  const effectiveBalance =
    selected && oldCm && oldCm.sourceType === selected.type && oldCm.sourceId === selected.id
      ? sourceBalance + oldCm.amount
      : sourceBalance;
  const val = Number(amount) || 0;

  async function submit() {
    if (!payment) return;
    if (val <= 0) return toast.error('أدخل مبلغاً صحيحاً.');
    if (selected && val > effectiveBalance + 0.001) {
      return toast.error(`رصيد «${selected.label}» (${moneyText(effectiveBalance, 0)}) لا يكفي.`);
    }

    setBusy(true);
    try {
      const res = await updateFarmerPayment(payment.id, {
        amount: val,
        method,
        date: new Date(date + 'T10:00:00').toISOString(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        sourceType: selected?.type,
        sourceId: selected?.id,
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
          <Field
            label="الصرف من حساب"
            hint={accounts.length === 0 ? 'لا توجد خزن/بنوك' : undefined}
          >
            <Select value={source} onValueChange={setSource} disabled={accounts.length === 0}>
              <SelectTrigger><SelectValue placeholder="بدون تأثير نقدي" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">تسجيل فقط (بدون حركة نقدية)</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {selected ? (
            <div className="flex items-center justify-between rounded-lg bg-canvas-sunken px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">الرصيد المتاح</span>
              <Money value={effectiveBalance} className="font-semibold" />
            </div>
          ) : null}
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
