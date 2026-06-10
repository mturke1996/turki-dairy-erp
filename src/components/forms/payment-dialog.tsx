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
import { Money, moneyText } from '@/components/shared/money';
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
import type { PaymentMethod } from '@/lib/domain/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: 'farmer' | 'customer';
  partyId: string;
  partyName: string;
  outstanding: number;
  defaultAmount?: number;
  settlementDefault?: boolean;
};

export function PaymentDialog({
  open,
  onOpenChange,
  kind,
  partyId,
  partyName,
  outstanding,
  defaultAmount,
  settlementDefault,
}: Props) {
  const recordFarmerPayment = useErpStore((s) => s.recordFarmerPayment);
  const recordCustomerPayment = useErpStore((s) => s.recordCustomerPayment);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const cashMovements = useErpStore((s) => s.cashMovements);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [treasury, setTreasury] = useState<SplitPaymentState>(EMPTY_SPLIT_STATE);
  const [settlementComplete, setSettlementComplete] = useState(false);

  const isFarmer = kind === 'farmer';
  const val = Number(amount) || 0;

  useEffect(() => {
    if (open) {
      const initial = defaultAmount ?? (outstanding > 0 ? Math.round(outstanding) : '');
      setAmount(initial ? String(initial) : '');
      setSettlementComplete(settlementDefault ?? false);
      setTreasury(EMPTY_SPLIT_STATE);
      setReference('');
      setNotes('');
    }
  }, [open, defaultAmount, settlementDefault, outstanding]);

  async function submit() {
    const splitErr = validateSplitPaymentState(val, treasury, {
      allowNone: true,
      checkOutflow: isFarmer,
      vaults,
      banks,
      cashMovements,
    });
    if (splitErr) return toast.error(splitErr);
    if (val <= 0) return toast.error('أدخل مبلغاً صحيحاً.');

    const treasurySel = treasurySelectionFromState(val, treasury);
    const base = {
      amount: val,
      method,
      date: new Date(date + 'T10:00:00').toISOString(),
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      ...treasurySel,
      settlementComplete: isFarmer ? settlementComplete : undefined,
    };
    const res = isFarmer
      ? await recordFarmerPayment({ farmerId: partyId, ...base })
      : await recordCustomerPayment({ customerId: partyId, ...base });
    if (res.ok) {
      toast.success(isFarmer ? 'تم تسجيل دفعة للفلاح' : 'تم تسجيل تحصيل من العميل', {
        description: `${moneyText(val, 0)} — ${partyName}`,
      });
      setAmount('');
      setReference('');
      setNotes('');
      onOpenChange(false);
    } else {
      toast.error(res.error ?? 'تعذّر التسجيل');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isFarmer ? 'تسجيل دفعة للفلاح' : 'تسجيل تحصيل من العميل'}</DialogTitle>
          <DialogDescription>{partyName}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl bg-canvas-sunken px-4 py-3 text-[13px]">
          <span className="text-muted-foreground">{isFarmer ? 'الدين (له)' : 'الديون القائمة'}</span>
          <Money value={Math.max(0, outstanding)} className="font-bold" />
        </div>
        {isFarmer && outstanding > 0 ? (
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            يُخصَّم المبلغ أولاً من الديون المسجّلة، ثم من مستحقات الاستلام.
          </p>
        ) : !isFarmer && outstanding > 0 ? (
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            يُخصَّم المبلغ أولاً من الديون المسجّلة، ثم من مستحقات المبيعات.
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
            singleLabel={isFarmer ? 'الصرف من حساب' : 'الإيداع في حساب'}
            outflow={isFarmer}
            allowNone
          />

          <Field label="رقم المرجع / الشيك" hint="اختياري">
            <Input dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          {isFarmer ? (
            <Field label="ملاحظات التسوية" hint="اختياري">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: سداد دورة 1–15 يونيو" />
            </Field>
          ) : null}
          {isFarmer ? (
            <div className="flex items-center justify-between rounded-lg border border-meadow-100 bg-meadow-50/50 px-3 py-2.5">
              <div>
                <Label htmlFor="settlement" className="text-[13px] font-semibold">تم الدفع — تسوية كاملة</Label>
                <p className="text-[11px] text-muted-foreground">يُعلّم حساب الفلاح في هذه الدورة كمسدّد</p>
              </div>
              <Switch id="settlement" checked={settlementComplete} onCheckedChange={setSettlementComplete} />
            </div>
          ) : null}
          {val > 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-[12.5px]">
              <span className="text-muted-foreground">الرصيد بعد العملية</span>
              <Money value={Math.max(0, outstanding - val)} className="font-semibold" />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={submit} variant={isFarmer ? 'default' : 'meadow'}>تأكيد</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
