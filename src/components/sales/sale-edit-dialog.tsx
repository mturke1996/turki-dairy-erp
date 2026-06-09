'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { VolumeInput } from '@/components/shared/volume-input';
import { AmountInput } from '@/components/shared/amount-input';
import { useErpStore } from '@/lib/store/use-erp-store';
import type { SaleTransaction } from '@/lib/domain/types';

export function SaleEditDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleTransaction | null;
}) {
  const updateSale = useErpStore((s) => s.updateSale);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !sale) return;
    setQuantity(String(sale.quantity));
    setUnitPrice(String(sale.unitPrice));
    setNotes(sale.notes ?? '');
    setDate(sale.date.slice(0, 10));
    setDueDate(sale.dueDate?.slice(0, 10) ?? sale.date.slice(0, 10));
  }, [open, sale]);

  async function submit() {
    if (!sale) return;
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    if (qty <= 0) return toast.error('أدخل كمية صحيحة.');
    if (price <= 0) return toast.error('أدخل سعر بيع صحيح.');

    setBusy(true);
    try {
      const res = await updateSale(sale.id, {
        quantity: qty,
        unitPrice: price,
        notes: notes.trim() || undefined,
        date: new Date(`${date}T09:00:00`).toISOString(),
        dueDate: new Date(`${dueDate}T09:00:00`).toISOString(),
      });
      if (res.ok) {
        toast.success('تم تحديث البيع');
        onOpenChange(false);
      } else toast.error(res.error ?? 'تعذّر التحديث');
    } finally {
      setBusy(false);
    }
  }

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل بيع</DialogTitle>
          <DialogDescription dir="ltr">{sale.ref}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="الكمية (لتر)" required>
            <VolumeInput value={quantity} onChange={setQuantity} />
          </Field>
          <Field label="سعر اللتر" required>
            <AmountInput value={unitPrice} onChange={setUnitPrice} placeholder="0.000" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البيع">
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="تاريخ الاستحقاق">
              <Input type="date" dir="ltr" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
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
