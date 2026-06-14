'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Receipt } from 'lucide-react';
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
import { ADJUSTMENT_DECREASE_REASONS, ADJUSTMENT_INCREASE_REASONS } from '@/lib/domain/constants';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStock: number;
  wac: number;
};

export function AdjustmentDialog({ open, onOpenChange, currentStock, wac }: Props) {
  const addAdjustment = useErpStore((s) => s.addAdjustment);
  const [direction, setDirection] = useState<'decrease' | 'increase'>('decrease');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState(() => String(Number(wac.toFixed(3)) || 0));

  useEffect(() => {
    if (open) setUnitCost(String(Number(wac.toFixed(3)) || 0));
  }, [open, wac]);

  const effectiveUnitCost = direction === 'decrease' ? wac : Number(unitCost) || wac;
  const reasons = direction === 'decrease' ? ADJUSTMENT_DECREASE_REASONS : ADJUSTMENT_INCREASE_REASONS;
  const [reasonValue, setReasonValue] = useState(reasons[0].value);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const selectedReason = useMemo(
    () => reasons.find((r) => r.value === reasonValue) ?? reasons[0],
    [reasons, reasonValue],
  );

  const qtyAbs = Number(quantity) || 0;
  const signed = direction === 'decrease' ? -qtyAbs : qtyAbs;
  const projected = currentStock + signed;
  const isLoss = direction === 'decrease' && selectedReason.kind === 'loss';
  const lossValue = qtyAbs * effectiveUnitCost;

  function changeDirection(v: 'decrease' | 'increase') {
    setDirection(v);
    const list = v === 'decrease' ? ADJUSTMENT_DECREASE_REASONS : ADJUSTMENT_INCREASE_REASONS;
    setReasonValue(list[0].value);
  }

  async function submit() {
    if (qtyAbs <= 0) return toast.error('أدخل كمية التسوية.');
    if (direction === 'decrease' && qtyAbs > currentStock + 0.001) {
      return toast.error('كمية النقص تتجاوز المخزون المتاح.');
    }
    setBusy(true);
    try {
      const res = await addAdjustment({
        quantity: signed,
        unitCost: effectiveUnitCost,
        reason: selectedReason.value,
        reasonKind: selectedReason.kind,
        date: new Date(date + 'T11:00:00').toISOString(),
      });
      if (res.ok) {
        toast.success('تم تسجيل التسوية', {
          description: isLoss
            ? `سُجِّل هدر ${formatLiters(qtyAbs, 0, false)} كمصروف غير نقدي`
            : `${signed > 0 ? '+' : ''}${formatLiters(signed, 0, false)}`,
        });
        setQuantity('');
        onOpenChange(false);
      } else {
        toast.error(res.error ?? 'تعذّر التسجيل');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسوية مخزون</DialogTitle>
          <DialogDescription>معالجة الهدر والتلف أو فروقات الجرد — الهدر يُرحَّل تلقائياً للمصاريف.</DialogDescription>
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
            <Field label="تكلفة الوحدة" hint={direction === 'decrease' ? 'متوسط التكلفة المرجّح — يُطبَّق تلقائياً' : undefined}>
              {direction === 'decrease' ? (
                <div className="flex h-10 items-center rounded-md border border-input bg-canvas-sunken/50 px-3 text-[13px] font-semibold tabular-nums text-foreground">
                  <Money value={wac} decimals={3} className="inline text-[13px]" />
                  <span className="mr-1.5 text-muted-foreground">/ لتر</span>
                </div>
              ) : (
                <AmountInput value={unitCost} onChange={setUnitCost} placeholder="0.000" />
              )}
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
              <div className="space-y-0.5">
                <p className="font-semibold">
                  سيُسجَّل كمصروف هدر غير نقدي:{' '}
                  <Money value={lossValue} decimals={2} className="inline font-bold" />
                </p>
                <p className="text-[11px] leading-relaxed text-sun-800">
                  لا يُخصم من الخزنة (ثمن الحليب دُفع سابقاً) — يظهر في «المصاريف» لتتبّع الخسارة، وتُخصم الكمية من المخزون المرحّل.
                </p>
              </div>
            </div>
          ) : direction === 'decrease' ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              تصحيح كمية فقط — لن يُسجَّل كمصروف.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'تأكيد التسوية'}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
