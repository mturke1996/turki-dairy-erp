'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Tractor, Users } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import { DEBT_PARTY_HINTS, DEBT_PARTY_LABELS } from '@/lib/domain/constants';
import type { DebtPartyKind } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

const PARTY_OPTIONS: {
  kind: DebtPartyKind;
  icon: typeof Tractor;
  tone: string;
}[] = [
  { kind: 'farmer', icon: Tractor, tone: 'border-meadow-200 bg-meadow-50 text-meadow-800 ring-meadow-200' },
  { kind: 'customer', icon: Building2, tone: 'border-navy-200 bg-navy-50 text-navy-800 ring-navy-200' },
  { kind: 'employee', icon: Users, tone: 'border-sun-200 bg-sun-50 text-sun-900 ring-sun-200' },
];

export function DebtFormDialog({
  open,
  onOpenChange,
  defaultPartyKind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPartyKind?: DebtPartyKind;
}) {
  const farmers = useErpStore((s) => s.farmers);
  const customers = useErpStore((s) => s.customers);
  const employees = useErpStore((s) => s.employees);
  const recordDebtEntry = useErpStore((s) => s.recordDebtEntry);

  const [partyKind, setPartyKind] = useState<DebtPartyKind>(defaultPartyKind ?? 'farmer');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPartyKind(defaultPartyKind ?? 'farmer');
      setPartyId('');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
    }
  }, [open, defaultPartyKind]);

  useEffect(() => {
    setPartyId('');
  }, [partyKind]);

  const partyOptions = useMemo(() => {
    if (partyKind === 'farmer') {
      return farmers
        .filter((f) => f.status === 'active')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
        .map((f) => ({ id: f.id, label: `${f.fullName} · ${f.code}` }));
    }
    if (partyKind === 'customer') {
      return customers
        .filter((c) => !c.onHold)
        .sort((a, b) => a.entityName.localeCompare(b.entityName, 'ar'))
        .map((c) => ({ id: c.id, label: `${c.entityName} · ${c.code}` }));
    }
    return employees
      .filter((e) => e.status === 'active')
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
      .map((e) => ({ id: e.id, label: `${e.fullName} · ${e.jobTitle}` }));
  }, [partyKind, farmers, customers, employees]);

  async function submit() {
    if (!partyId) return toast.error('اختر الطرف.');
    const val = Number(amount) || 0;
    if (val <= 0) return toast.error('أدخل مبلغ الدين.');
    setBusy(true);
    try {
      const res = await recordDebtEntry({
        partyKind,
        partyId,
        amount: val,
        date: new Date(date + 'T12:00:00').toISOString(),
        description: description.trim() || undefined,
      });
      if (res.ok) {
        toast.success('تم تسجيل الدين');
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
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>تسجيل دين</DialogTitle>
          <DialogDescription>يُضاف للرصيد فوراً — بدون تأثير على المخزون.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <Field label="نوع الطرف" required>
            <div className="grid grid-cols-3 gap-2">
              {PARTY_OPTIONS.map(({ kind, icon: Icon, tone }) => {
                const active = partyKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setPartyKind(kind)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all active:scale-[0.98]',
                      active ? `${tone} ring-2` : 'border-border bg-card text-muted-foreground hover:bg-canvas-sunken/60',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[12px] font-semibold">{DEBT_PARTY_LABELS[kind]}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{DEBT_PARTY_HINTS[partyKind]}</p>
          </Field>

          <Field label={`اختر ${DEBT_PARTY_LABELS[partyKind]}`} required>
            {partyOptions.length ? (
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={`اختر ${DEBT_PARTY_LABELS[partyKind]}`} />
                </SelectTrigger>
                <SelectContent>
                  {partyOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-lg bg-canvas-sunken px-3 py-2.5 text-[12px] text-muted-foreground">
                لا يوجد {DEBT_PARTY_LABELS[partyKind]} متاح — أضفه من صفحته أولاً.
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="قيمة الدين" required>
              <AmountInput value={amount} onChange={setAmount} placeholder="0" />
            </Field>
            <Field label="تاريخ الدين" required>
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
            </Field>
          </div>

          <Field label="ملاحظة" hint="اختياري">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: رصيد افتتاحي، دين سابق…"
            />
          </Field>
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button type="button" className="flex-1 sm:flex-none" disabled={busy || !partyOptions.length} onClick={submit}>
            {busy ? 'جارٍ الحفظ…' : 'تسجيل الدين'}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
