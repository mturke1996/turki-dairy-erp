'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';
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
import { AR_MONTHS } from '@/lib/domain/cycle';

const MONTHS = AR_MONTHS.map((label, i) => ({ value: i, label }));

export function CreateSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createSessionForCycle = useErpStore((s) => s.createSessionForCycle);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth()));
  const [cycle, setCycle] = useState<'1' | '2'>('1');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!Number.isFinite(y) || y < 2020 || y > 2035) return toast.error('السنة غير صالحة.');
    setBusy(true);
    try {
      const res = await createSessionForCycle({ year: y, month: m, cycleNumber: cycle === '1' ? 1 : 2 });
      if (res.ok) {
        toast.success('تم إنشاء الدورة وتفعيلها');
        onOpenChange(false);
      } else {
        toast.error(res.error ?? 'تعذّر الإنشاء');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-meadow-600" />
            إنشاء دورة سابقة
          </DialogTitle>
          <DialogDescription>
            أضف دورة لشهر سابق (مثل مايو) لتسجيل بيانات افتتاحية أو عمليات تاريخية.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="السنة" required>
            <Input type="number" dir="ltr" value={year} onChange={(e) => setYear(e.target.value)} className="h-10" />
          </Field>
          <Field label="الشهر" required>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="الدورة" required>
            <Select value={cycle} onValueChange={(v) => setCycle(v as '1' | '2')}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">الأولى (1–15)</SelectItem>
                <SelectItem value="2">الثانية (16–نهاية الشهر)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? 'جارٍ الإنشاء…' : 'إنشاء وتفعيل'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
