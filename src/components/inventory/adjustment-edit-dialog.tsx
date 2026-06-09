'use client';

import { useEffect, useState } from 'react';
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
import type { InventoryAdjustment } from '@/lib/domain/types';

const REASONS = ['هدر / تلف', 'جرد فعلي', 'فاقد نقل', 'تصحيح إدخال', 'أخرى'];

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
  const [reason, setReason] = useState(REASONS[0]);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !adjustment) return;
    setDirection(adjustment.quantity >= 0 ? 'increase' : 'decrease');
    setQuantity(String(Math.abs(adjustment.quantity)));
    setUnitCost(String(adjustment.unitCost));
    setReason(REASONS.includes(adjustment.reason) ? adjustment.reason : adjustment.reason || REASONS[0]);
    setDate(adjustment.date.slice(0, 10));
  }, [open, adjustment]);

  if (!adjustment) return null;

  const qtyAbs = Number(quantity) || 0;
  const signed = direction === 'decrease' ? -qtyAbs : qtyAbs;
  const projected = stockBase + signed;

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
        reason: reason.trim(),
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
