'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Tags } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import { EXPENSE_GROUP_LABELS } from '@/lib/domain/constants';
import type { ExpenseGroup } from '@/lib/domain/types';
import { RowDeleteButton } from '@/components/shared/row-delete-button';

const GROUPS = Object.keys(EXPENSE_GROUP_LABELS) as ExpenseGroup[];

export function ExpenseCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const categories = useErpStore((s) => s.expenseCategories);
  const addExpenseCategory = useErpStore((s) => s.addExpenseCategory);
  const deleteExpenseCategory = useErpStore((s) => s.deleteExpenseCategory);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<ExpenseGroup>('daily_life');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return toast.error('أدخل اسم التصنيف.');
    setBusy(true);
    try {
      const res = await addExpenseCategory({ name: name.trim(), group, isRecurring: true });
      if (res.ok) {
        toast.success('تمت إضافة التصنيف');
        setName('');
      } else toast.error(res.error ?? 'تعذّر الإضافة');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            تصنيفات المصاريف
          </DialogTitle>
          <DialogDescription>الحوش، أسامة، أويس، يومية، مصنعية…</DialogDescription>
        </DialogHeader>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-canvas-sunken/50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{EXPENSE_GROUP_LABELS[c.group]}</p>
              </div>
              <RowDeleteButton
                label={c.name}
                onConfirm={async () => {
                  const res = await deleteExpenseCategory(c.id);
                  if (res.ok) toast.success('تم حذف التصنيف');
                  else toast.error(res.error ?? 'تعذّر الحذف');
                  return res;
                }}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-2">
          <Field label="اسم تصنيف جديد">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مصاريف محطة" />
          </Field>
          <Field label="المجموعة">
            <Select value={group} onValueChange={(v) => setGroup(v as ExpenseGroup)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {EXPENSE_GROUP_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" onClick={add} disabled={busy}>
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
