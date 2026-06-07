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
import { Money } from '@/components/shared/money';
import { useErpStore } from '@/lib/store/use-erp-store';
import { PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import { accountBalance } from '@/lib/domain/treasury';
import type { AccountSourceType, PaymentMethod } from '@/lib/domain/types';

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
  const [source, setSource] = useState('none');
  const [settlementComplete, setSettlementComplete] = useState(false);

  const isFarmer = kind === 'farmer';
  const val = Number(amount) || 0;

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount ? String(defaultAmount) : '');
      setSettlementComplete(settlementDefault ?? false);
      setSource('none');
      setReference('');
      setNotes('');
    }
  }, [open, defaultAmount, settlementDefault]);

  const accounts = useMemo(
    () => [
      ...vaults.filter((v) => v.isActive).map((v) => ({ value: `vault:${v.id}`, label: v.name, type: 'vault' as const, id: v.id })),
      ...banks.filter((b) => b.isActive).map((b) => ({ value: `bank:${b.id}`, label: b.bankName, type: 'bank' as const, id: b.id })),
    ],
    [vaults, banks],
  );

  const selected = accounts.find((a) => a.value === source) ?? null;
  const sourceBalance = selected ? accountBalance(selected.type, selected.id, vaults, banks, cashMovements) : 0;

  function submit() {
    if (val <= 0) return toast.error('أدخل مبلغاً صحيحاً.');
    if (isFarmer && selected && val > sourceBalance + 0.001) {
      return toast.error(`رصيد «${selected.label}» (${Math.floor(sourceBalance).toLocaleString('en-US')} د.ل) لا يكفي.`);
    }
    const base = {
      amount: val,
      method,
      date: new Date(date + 'T10:00:00').toISOString(),
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      sourceType: selected?.type as AccountSourceType | undefined,
      sourceId: selected?.id,
      settlementComplete: isFarmer ? settlementComplete : undefined,
    };
    const res = isFarmer
      ? recordFarmerPayment({ farmerId: partyId, ...base })
      : recordCustomerPayment({ customerId: partyId, ...base });
    if (res.ok) {
      toast.success(isFarmer ? 'تم تسجيل دفعة للفلاح' : 'تم تسجيل تحصيل من العميل', {
        description: `${val.toLocaleString('en-US')} د.ل — ${partyName}`,
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
          <span className="text-muted-foreground">{isFarmer ? 'الرصيد المستحق' : 'الذمم القائمة'}</span>
          <Money value={outstanding} className="font-bold" />
        </div>

        <div className="space-y-4">
          <Field label="المبلغ (د.ل)" required>
            <Input type="number" dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
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
            label={isFarmer ? 'الصرف من حساب' : 'الإيداع في حساب'}
            hint={accounts.length === 0 ? 'لا توجد خزن/بنوك — أضِفها من صفحة النقد والبنوك' : undefined}
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
              <span className="text-muted-foreground">رصيد «{selected.label}»</span>
              <Money value={sourceBalance} className="font-semibold" />
            </div>
          ) : null}
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
