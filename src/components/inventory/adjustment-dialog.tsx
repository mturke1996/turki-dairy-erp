'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { AmountInput } from '@/components/shared/amount-input';
import { VolumeInput } from '@/components/shared/volume-input';
import { useErpStore } from '@/lib/store/use-erp-store';
import { formatLiters } from '@/lib/format-currency';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStock: number;
  wac: number;
};

const REASONS = ['هدر / تلف', 'جرد فعلي', 'فاقد نقل', 'تصحيح إدخال', 'أخرى'];

export function AdjustmentDialog({ open, onOpenChange, currentStock, wac }: Props) {
  const addAdjustment = useErpStore((s) => s.addAdjustment);
  const [direction, setDirection] = useState<'decrease' | 'increase'>('decrease');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState(() => String(Number(wac.toFixed(3)) || 0));
  const [reason, setReason] = useState(REASONS[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const qtyAbs = Number(quantity) || 0;
  const signed = direction === 'decrease' ? -qtyAbs : qtyAbs;
  const projected = currentStock + signed;

  function submit() {
    if (qtyAbs <= 0) return toast.error('أدخل كمية التسوية.');
    if (direction === 'decrease' && qtyAbs > currentStock + 0.001) {
      return toast.error('كمية النقص تتجاوز المخزون المتاح.');
    }
    const res = addAdjustment({
      quantity: signed,
      unitCost: Number(unitCost) || wac,
      reason: reason.trim(),
      date: new Date(date + 'T11:00:00').toISOString(),
    });
    if (res.ok) {
      toast.success('تم تسجيل التسوية', { description: `${signed > 0 ? '+' : ''}${formatLiters(signed, 0, false)}` });
      setQuantity('');
      onOpenChange(false);
    } else {
      toast.error(res.error ?? 'تعذّر التسجيل');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسوية مخزون</DialogTitle>
          <DialogDescription>تعديل الرصيد لمعالجة الهدر أو فروقات الجرد.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="نوع التسوية">
            <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decrease">نقص (هدر / فاقد)</SelectItem>
                <SelectItem value="increase">زيادة (تصحيح)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الكمية" required>
              <VolumeInput value={quantity} onChange={setQuantity} />
            </Field>
            <Field label="تكلفة الوحدة">
              <AmountInput value={unitCost} onChange={setUnitCost} placeholder="0.000" />
            </Field>
          </div>
          <Field label="السبب">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="التاريخ">
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-canvas-sunken px-3 py-2.5 text-[12.5px]">
            <span className="text-muted-foreground">الرصيد بعد التسوية</span>
            <span className={`unit-value font-bold ${projected < 0 ? 'text-rose-600' : 'text-foreground'}`}>
              {formatLiters(projected, 0, false)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit}>تأكيد التسوية</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
