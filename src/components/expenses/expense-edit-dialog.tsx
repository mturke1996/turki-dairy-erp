'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { AmountInput } from '@/components/shared/amount-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import type { Expense, ExpenseCategory } from '@/lib/domain/types';

export function ExpenseEditDialog({
  open,
  onOpenChange,
  expense,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  categories: ExpenseCategory[];
}) {
  const updateExpense = useErpStore((s) => s.updateExpense);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [invoice, setInvoice] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !expense) return;
    setCategoryId(expense.categoryId);
    setAmount(String(expense.amount));
    setDesc(expense.description);
    setInvoice(expense.invoiceRef ?? '');
    setDate(expense.date.slice(0, 10));
  }, [open, expense]);

  async function submit() {
    if (!expense) return;
    const val = Number(amount) || 0;
    if (val <= 0) return toast.error('أدخل مبلغاً صحيحاً.');
    if (!desc.trim()) return toast.error('أدخل وصف المصروف.');
    setBusy(true);
    try {
      const res = await updateExpense(expense.id, {
        categoryId,
        amount: val,
        description: desc.trim(),
        invoiceRef: invoice.trim() || undefined,
        date: new Date(date + 'T10:00:00').toISOString(),
      });
      if (res.ok) {
        toast.success('تم تحديث المصروف');
        onOpenChange(false);
      } else toast.error(res.error ?? 'تعذّر التحديث');
    } finally {
      setBusy(false);
    }
  }

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل مصروف</DialogTitle>
          <DialogDescription dir="ltr">{expense.ref}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="التصنيف">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="المبلغ" required>
            <AmountInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="الوصف" required>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <Field label="التاريخ">
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="رقم الفاتورة" hint="اختياري">
            <Input dir="ltr" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
