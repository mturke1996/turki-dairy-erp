'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { AmountInput } from '@/components/shared/amount-input';
import { VolumeInput } from '@/components/shared/volume-input';
import { Money } from '@/components/shared/money';
import { useErpStore } from '@/lib/store/use-erp-store';
import { formatLiters } from '@/lib/format-currency';
import {
  ADJUSTMENT_DECREASE_REASONS,
  ADJUSTMENT_INCREASE_REASONS,
  resolveAdjustmentReasonKind,
} from '@/lib/domain/constants';
import type { InventoryAdjustment } from '@/lib/domain/types';

export function AdjustmentEditDialog({
  open,
  onOpenChange,
  adjustment,
  stockBase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: InventoryAdjustment | null;
  stockBase: number;
}) {
  const updateAdjustment = useErpStore((s) => s.updateAdjustment);
  const [direction, setDirection] = useState<'decrease' | 'increase'>('decrease');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const reasons = direction === 'decrease' ? ADJUSTMENT_DECREASE_REASONS : ADJUSTMENT_INCREASE_REASONS;
  const [reasonValue, setReasonValue] = useState(reasons[0].value);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !adjustment) return;
    const dir = adjustment.quantity >= 0 ? 'increase' : 'decrease';
    setDirection(dir);
    setQuantity(String(Math.abs(adjustment.quantity)));
    setUnitCost(String(adjustment.unitCost));
    const list = dir === 'decrease' ? ADJUSTMENT_DECREASE_REASONS : ADJUSTMENT_INCREASE_REASONS;
    const match = list.find((r) => r.value === adjustment.reason || r.label === adjustment.reason);
    setReasonValue(match?.value ?? list[0].value);
    setDate(adjustment.date.slice(0, 10));
  }, [open, adjustment]);

  const selectedReason = useMemo(
    () => reasons.find((r) => r.value === reasonValue) ?? reasons[0],
    [reasons, reasonValue],
  );

  if (!adjustment) return null;

  const qtyAbs = Number(quantity) || 0;
  const signed = direction === 'decrease' ? -qtyAbs : qtyAbs;
  const projected = stockBase + signed;
  const reasonKind = selectedReason.kind ?? resolveAdjustmentReasonKind(selectedReason.value, signed);
  const isLoss = direction === 'decrease' && reasonKind === 'loss';
  const lossValue = Math.round(qtyAbs * (Number(unitCost) || adjustment.unitCost));

  function changeDirection(v: 'decrease' | 'increase') {
    setDirection(v);
    const list = v === 'decrease' ? ADJUSTMENT_DECREASE_REASONS : ADJUSTMENT_INCREASE_REASONS;
    setReasonValue(list[0].value);
  }

  async function submit() {
    if (qtyAbs <= 0) return toast.error('أدخل كمية التسوية.');
    if (direction === 'decrease' && qtyAbs > stockBase + 0.001) {
      return toast.error('كمية النقص تتجاوز المخزون المتاح.');
    }
    setBusy(true);
    try {
      const res = await updateAdjustment(adjustment!.id, {
        quantity: signed,
        unitCost: Number(unitCost) || adjustment!.unitCost,
        reason: selectedReason.value,
        reasonKind: selectedReason.kind,
        date: new Date(date + 'T11:00:00').toISOString(),
      });
      if (res.ok) {
        toast.success('تم تحديث التسوية');
        onOpenChange(false);
      } else toast.error(res.error ?? 'تعذّر التحديث');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل تسوية مخزون</DialogTitle>
          <DialogDescription dir="ltr">{adjustment.ref}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="نوع التسوية">
            <Select value={direction} onValueChange={(v) => changeDirection(v as typeof direction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decrease">نقص (هدر / فاقد / جرد)</SelectItem>
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
            <Select value={reasonValue} onValueChange={setReasonValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
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

          {isLoss ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-sun-200 bg-sun-50/70 px-3 py-2.5 text-[12px] text-sun-900">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="font-semibold">
                مصروف هدر غير نقدي:{' '}
                <Money value={lossValue} decimals={0} className="inline font-bold" /> — يُحدَّث في «المصاريف» تلقائياً.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
