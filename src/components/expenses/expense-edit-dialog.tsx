'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { AmountInput } from '@/components/shared/amount-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import { sessionDisplayLabel } from '@/lib/domain/cycle';
import type { Expense, ExpenseCategory, Session } from '@/lib/domain/types';

export function ExpenseEditDialog({
  open,
  onOpenChange,
  expense,
  categories,
  openSessions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  categories: ExpenseCategory[];
  openSessions?: Session[];
}) {
  const updateExpense = useErpStore((s) => s.updateExpense);
  const allSessions = useErpStore((s) => s.sessions);
  const [categoryId, setCategoryId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [invoice, setInvoice] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !expense) return;
    setCategoryId(expense.categoryId);
    setSessionId(expense.sessionId);
    setAmount(String(expense.amount));
    setDesc(expense.description);
    setInvoice(expense.invoiceRef ?? '');
    setDate(expense.date.slice(0, 10));
  }, [open, expense]);

  const sessionOptions = useMemo(() => {
    const open = openSessions ?? allSessions.filter((s) => s.status === 'open');
    if (!expense) return open;
    if (open.some((s) => s.id === expense.sessionId)) return open;
    const current = allSessions.find((s) => s.id === expense.sessionId);
    return current ? [current, ...open] : open;
  }, [openSessions, allSessions, expense]);

  const sessionLocked = expense ? allSessions.find((s) => s.id === expense.sessionId)?.status === 'archived' : false;

  async function submit() {
    if (!expense) return;
    const val = Number(amount) || 0;
    if (val <= 0) return toast.error('أدخل مبلغاً صحيحاً.');
    if (!desc.trim()) return toast.error('أدخل وصف المصروف.');
    setBusy(true);
    try {
      const res = await updateExpense(expense.id, {
        categoryId,
        sessionId,
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
          {sessionOptions.length ? (
            <Field label="الدورة / الفترة">
              {sessionLocked ? (
                <p className="rounded-lg border border-border bg-canvas-sunken px-3 py-2 text-[13px]">
                  {sessionOptions.find((s) => s.id === sessionId)
                    ? sessionDisplayLabel(sessionOptions.find((s) => s.id === sessionId)!, 'full')
                    : '—'}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">دورة مؤرشفة — لا يمكن نقل المصروف</span>
                </p>
              ) : (
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sessionOptions.filter((s) => s.status === 'open').map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {sessionDisplayLabel(s, 'full')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          ) : null}
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
