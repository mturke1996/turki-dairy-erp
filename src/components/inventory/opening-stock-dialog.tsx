'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Warehouse, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { AmountInput } from '@/components/shared/amount-input';
import { Liters, Money } from '@/components/shared/money';

export function OpeningStockDialog({
  open,
  onOpenChange,
  sessionLabel,
  periodFrom,
  currentStock,
  currentWac,
  sessionOpening,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionLabel: string;
  periodFrom: string;
  currentStock: number;
  currentWac: number;
  sessionOpening: number;
  onSubmit: (input: { quantity: number; unitCost: number; note?: string }) => { ok: boolean; error?: string };
}) {
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [note, setNote] = useState('متبقي حليب حتى 30/5 — بداية الدورة 1/6');
  const [busy, setBusy] = useState(false);

  function submit() {
    const qty = Number(quantity) || 0;
    const cost = Number(unitCost) || 0;
    if (qty <= 0) return toast.error('أدخل كمية أكبر من صفر');
    if (cost <= 0) return toast.error('أدخل تكلفة اللتر');
    setBusy(true);
    const res = onSubmit({ quantity: qty, unitCost: cost, note: note.trim() || undefined });
    setBusy(false);
    if (res.ok) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v && !quantity && sessionOpening > 0) setQuantity(String(Math.round(sessionOpening)));
        if (v && !unitCost && currentWac > 0) setUnitCost(String(currentWac));
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-meadow-600" />
            ضبط مخزون افتتاحي
          </DialogTitle>
          <DialogDescription>
            الدورة: <strong>{sessionLabel}</strong> · من {periodFrom} — أدخل كمية الحليب المتبقية لبدء التسجيل.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-meadow-100 bg-meadow-50/50 p-3 text-[12px]">
          <p className="text-muted-foreground">
            المخزون الحالي في النظام: <Liters value={currentStock} className="font-semibold text-foreground" />
            {currentWac > 0 ? (
              <> · متوسط التكلفة <Money value={currentWac} decimals={3} className="font-semibold" /></>
            ) : null}
          </p>
          {sessionOpening > 0 ? (
            <p className="mt-1 text-meadow-800">
              الرصيد الافتتاحي المسجّل للدورة: <Liters value={sessionOpening} className="font-semibold" />
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <Field label="كمية الحليب (لتر)" required>
            <Input type="number" inputMode="decimal" dir="ltr" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="15000" />
          </Field>
          <Field label="متوسط تكلفة اللتر" required hint="تكلفة اللتر الافتتاحية">
            <AmountInput value={unitCost} onChange={setUnitCost} currency="د.ل/لتر" placeholder="1.250" />
          </Field>
          <Field label="ملاحظة">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="meadow" disabled={busy} onClick={submit}>
            <Save className="h-4 w-4" />
            {busy ? 'جارٍ الحفظ…' : 'حفظ المخزون الافتتاحي'}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
