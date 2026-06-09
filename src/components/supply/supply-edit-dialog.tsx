'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { VolumeInput } from '@/components/shared/volume-input';
import { AmountInput } from '@/components/shared/amount-input';
import { useErpStore } from '@/lib/store/use-erp-store';
import { MILK_SHIFT_LABELS, QUALITY_LABELS } from '@/lib/domain/constants';
import type { MilkShift, QualityTier, SupplyTransaction } from '@/lib/domain/types';

export function SupplyEditDialog({
  open,
  onOpenChange,
  supply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: SupplyTransaction | null;
}) {
  const updateSupply = useErpStore((s) => s.updateSupply);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [sampleQty, setSampleQty] = useState('');
  const [qualityTier, setQualityTier] = useState<QualityTier>('A');
  const [milkShift, setMilkShift] = useState<MilkShift>('morning');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !supply) return;
    setQuantity(String(supply.quantity));
    setUnitPrice(String(supply.unitPrice));
    setSampleQty(String(supply.sampleQty ?? ''));
    setQualityTier(supply.qualityTier);
    setMilkShift(supply.milkShift ?? 'morning');
    setNotes(supply.notes ?? '');
    setDate(supply.date.slice(0, 10));
  }, [open, supply]);

  async function submit() {
    if (!supply) return;
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const sample = Number(sampleQty) || 0;
    if (qty <= 0) return toast.error('أدخل كمية صحيحة.');
    if (price <= 0) return toast.error('أدخل سعر شراء صحيح.');
    if (sample > qty) return toast.error('كمية العينة تتجاوز الكمية الكلية.');

    setBusy(true);
    try {
      const hour = milkShift === 'evening' ? 17 : 6;
      const res = await updateSupply(supply.id, {
        quantity: qty,
        unitPrice: price,
        sampleQty: sample > 0 ? sample : undefined,
        qualityTier,
        milkShift,
        notes: notes.trim() || undefined,
        date: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).toISOString(),
      });
      if (res.ok) {
        toast.success('تم تحديث الاستلام');
        onOpenChange(false);
      } else toast.error(res.error ?? 'تعذّر التحديث');
    } finally {
      setBusy(false);
    }
  }

  if (!supply) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل استلام</DialogTitle>
          <DialogDescription dir="ltr">{supply.ref}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="الكمية (لتر)" required>
            <VolumeInput value={quantity} onChange={setQuantity} />
          </Field>
          <Field label="سعر اللتر" required>
            <AmountInput value={unitPrice} onChange={setUnitPrice} placeholder="0.000" />
          </Field>
          <Field label="عينة (لتر)" hint="اختياري">
            <VolumeInput value={sampleQty} onChange={setSampleQty} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الجودة">
              <Select value={qualityTier} onValueChange={(v) => setQualityTier(v as QualityTier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUALITY_LABELS) as QualityTier[]).map((k) => (
                    <SelectItem key={k} value={k}>{QUALITY_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="الوجبة">
              <Select value={milkShift} onValueChange={(v) => setMilkShift(v as MilkShift)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(MILK_SHIFT_LABELS) as MilkShift[]).map((k) => (
                    <SelectItem key={k} value={k}>{MILK_SHIFT_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="التاريخ">
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="ملاحظة" hint="اختياري">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</Button>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
