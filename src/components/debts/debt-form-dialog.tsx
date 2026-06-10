'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Globe, Landmark, Tractor, Users, Wallet } from 'lucide-react';
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
import { Money } from '@/components/shared/money';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import { DEBT_PARTY_HINTS, DEBT_PARTY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import {
  DEBT_CASH_MODE_LABELS,
  DEBT_DIRECTION_LABELS,
  debtRecordCashDirection,
  debtRecordSettleAmount,
  defaultDebtDirection,
  type DebtCashMode,
} from '@/lib/domain/debt';
import { accountBalance } from '@/lib/domain/treasury';
import type { DebtDirection, DebtEntry, DebtPartyKind, PaymentMethod } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

const PARTY_OPTIONS: {
  kind: DebtPartyKind;
  icon: typeof Tractor;
  tone: string;
}[] = [
  { kind: 'farmer', icon: Tractor, tone: 'border-meadow-200 bg-meadow-50 text-meadow-800 ring-meadow-200' },
  { kind: 'customer', icon: Building2, tone: 'border-navy-200 bg-navy-50 text-navy-800 ring-navy-200' },
  { kind: 'employee', icon: Users, tone: 'border-sun-200 bg-sun-50 text-sun-900 ring-sun-200' },
  { kind: 'external', icon: Globe, tone: 'border-border bg-canvas-sunken text-foreground ring-border' },
];

const CASH_MODES: DebtCashMode[] = ['none', 'disburse', 'collect'];

function treasuryHint(direction: DebtDirection, cashMode: DebtCashMode): string {
  if (cashMode === 'none') {
    return 'يُسجَّل الدين في الأرصدة فقط — بدون خصم أو إيداع في الخزينة.';
  }
  if (cashMode === 'disburse' && direction === 'receivable') {
    return 'صرف نقدي (سلفة) — يُخصم من الخزينة ويبقى الدين كاملاً على الطرف.';
  }
  if (cashMode === 'disburse' && direction === 'payable') {
    return 'صرف نقدي — يُخصم من الخزينة ويُخفَّض الدين المسجَّل (كلياً أو جزئياً).';
  }
  if (cashMode === 'collect' && direction === 'receivable') {
    return 'تحصيل نقدي — يُودَع في الخزينة ويُخفَّض الدين المسجَّل.';
  }
  return 'إيداع نقدي مرتبط بتسجيل الدين.';
}

export function DebtFormDialog({
  open,
  onOpenChange,
  defaultPartyKind,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPartyKind?: DebtPartyKind;
  entry?: DebtEntry | null;
}) {
  const farmers = useErpStore((s) => s.farmers);
  const customers = useErpStore((s) => s.customers);
  const employees = useErpStore((s) => s.employees);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const cashMovements = useErpStore((s) => s.cashMovements);
  const recordDebtEntry = useErpStore((s) => s.recordDebtEntry);
  const updateDebtEntry = useErpStore((s) => s.updateDebtEntry);

  const isEdit = !!entry;
  const [partyKind, setPartyKind] = useState<DebtPartyKind>(defaultPartyKind ?? 'farmer');
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('payable');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [cashMode, setCashMode] = useState<DebtCashMode>('none');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [source, setSource] = useState('none');
  const [cashAmount, setCashAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const accounts = useMemo(
    () => [
      ...vaults.filter((v) => v.isActive).map((v) => ({ value: `vault:${v.id}`, label: v.name, type: 'vault' as const, id: v.id })),
      ...banks.filter((b) => b.isActive).map((b) => ({ value: `bank:${b.id}`, label: b.bankName, type: 'bank' as const, id: b.id })),
    ],
    [vaults, banks],
  );

  const selected = accounts.find((a) => a.value === source) ?? null;
  const sourceBalance = selected ? accountBalance(selected.type, selected.id, vaults, banks, cashMovements) : 0;

  const debtVal = Number(amount) || 0;
  const cashVal = cashMode === 'none' ? 0 : Number(cashAmount) || debtVal;
  const settlePreview =
    cashMode !== 'none'
      ? debtRecordSettleAmount(direction, cashMode as 'disburse' | 'collect', debtVal, cashVal)
      : 0;
  const remainingPreview = Math.max(0, debtVal - settlePreview);
  const cashOut = debtRecordCashDirection(cashMode) === 'out';

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setPartyKind(entry.partyKind);
      setPartyId(entry.partyId ?? '');
      setPartyName(entry.partyName ?? '');
      setDirection(entry.direction ?? defaultDebtDirection(entry.partyKind));
      setAmount(String(entry.amount));
      setDate(entry.date.slice(0, 10));
      setDescription(entry.description ?? '');
      setCashMode('none');
      setSource('none');
      setCashAmount('');
      setMethod('cash');
    } else {
      const kind = defaultPartyKind ?? 'farmer';
      setPartyKind(kind);
      setPartyId('');
      setPartyName('');
      setDirection(defaultDebtDirection(kind));
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setCashMode('none');
      setSource('none');
      setCashAmount('');
      setMethod('cash');
    }
  }, [open, entry, defaultPartyKind]);

  useEffect(() => {
    if (!isEdit) {
      setPartyId('');
      setPartyName('');
      setDirection(defaultDebtDirection(partyKind));
    }
  }, [partyKind, isEdit]);

  useEffect(() => {
    if (cashMode === 'none') {
      setSource('none');
      setCashAmount('');
    }
  }, [cashMode]);

  const partyOptions = useMemo(() => {
    if (partyKind === 'farmer') {
      return farmers
        .filter((f) => f.status === 'active')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
        .map((f) => ({ id: f.id, label: `${f.fullName} · ${f.code}` }));
    }
    if (partyKind === 'customer') {
      return customers
        .sort((a, b) => a.entityName.localeCompare(b.entityName, 'ar'))
        .map((c) => ({ id: c.id, label: `${c.entityName} · ${c.code}` }));
    }
    if (partyKind === 'employee') {
      return employees
        .filter((e) => e.status === 'active')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
        .map((e) => ({ id: e.id, label: `${e.fullName} · ${e.jobTitle}` }));
    }
    return [];
  }, [partyKind, farmers, customers, employees]);

  async function submit() {
    const val = Number(amount) || 0;
    if (val <= 0) return toast.error('أدخل مبلغ الدين.');
    if (partyKind === 'external' && !partyName.trim()) return toast.error('أدخل اسم الطرف الخارجي.');
    if (partyKind !== 'external' && !partyId) return toast.error('اختر الطرف.');

    if (cashMode !== 'none') {
      if (!accounts.length) return toast.error('أضِف خزنة أو بنك من صفحة النقد أولاً.');
      if (!selected) return toast.error('اختر الخزينة أو البنك.');
      const payVal = Number(cashAmount) || val;
      if (payVal <= 0) return toast.error('أدخل مبلغ الحركة النقدية.');
      if (payVal > val + 0.01) return toast.error('مبلغ النقد لا يمكن أن يتجاوز قيمة الدين.');
      if (cashOut && payVal > sourceBalance + 0.001) {
        return toast.error(`رصيد «${selected.label}» لا يكفي للصرف.`);
      }
    }

    setBusy(true);
    try {
      if (isEdit && entry) {
        const res = await updateDebtEntry(entry.id, {
          amount: val,
          direction,
          date: new Date(date + 'T12:00:00').toISOString(),
          description: description.trim() || undefined,
          partyName: partyKind === 'external' ? partyName.trim() : undefined,
        });
        if (res.ok) {
          toast.success('تم تحديث الدين');
          onOpenChange(false);
        } else toast.error(res.error ?? 'تعذّر التحديث');
      } else {
        const payVal = cashMode === 'none' ? undefined : Number(cashAmount) || val;
        const res = await recordDebtEntry({
          partyKind,
          partyId: partyKind === 'external' ? undefined : partyId,
          partyName: partyKind === 'external' ? partyName.trim() : undefined,
          amount: val,
          direction,
          date: new Date(date + 'T12:00:00').toISOString(),
          description: description.trim() || undefined,
          cashMode,
          method: cashMode === 'none' ? undefined : method,
          sourceType: selected?.type,
          sourceId: selected?.id,
          cashAmount: payVal,
        });
        if (res.ok) {
          toast.success(
            cashMode === 'none' ? 'تم تسجيل الدين' : cashMode === 'disburse' ? 'تم تسجيل الدين مع الصرف' : 'تم تسجيل الدين مع التحصيل',
          );
          onOpenChange(false);
        } else toast.error(res.error ?? 'تعذّر التسجيل');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,720px)] max-w-md gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{isEdit ? 'تعديل دين' : 'تسجيل دين'}</DialogTitle>
          <DialogDescription>له = علينا · عليه = لنا — مع خيار ربط الخزينة أو التسجيل المحاسبي فقط.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          {!isEdit ? (
            <Field label="نوع الطرف" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PARTY_OPTIONS.map(({ kind, icon: Icon, tone }) => {
                  const active = partyKind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setPartyKind(kind)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-[transform,background-color,border-color] active:scale-[0.98]',
                        active ? `${tone} ring-2` : 'border-border bg-card text-muted-foreground hover:bg-canvas-sunken/60',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-semibold">{DEBT_PARTY_LABELS[kind]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{DEBT_PARTY_HINTS[partyKind]}</p>
            </Field>
          ) : null}

          {partyKind === 'external' ? (
            <Field label="اسم الطرف الخارجي" required>
              <Input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="مورد، جار، جهة أخرى…"
                disabled={isEdit && entry?.partyKind !== 'external'}
              />
            </Field>
          ) : (
            <Field label={`اختر ${DEBT_PARTY_LABELS[partyKind]}`} required>
              {partyOptions.length ? (
                <Select value={partyId} onValueChange={setPartyId} disabled={isEdit}>
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
                  لا يوجد {DEBT_PARTY_LABELS[partyKind]} — أضفه من صفحته أولاً.
                </p>
              )}
            </Field>
          )}

          <Field label="الاتجاه" required>
            <div className="grid grid-cols-2 gap-2">
              {(['payable', 'receivable'] as DebtDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-[transform,background-color,border-color]',
                    direction === d
                      ? d === 'payable'
                        ? 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                        : 'border-meadow-300 bg-meadow-50 text-meadow-800 ring-2 ring-meadow-200'
                      : 'border-border text-muted-foreground hover:bg-canvas-sunken/60',
                  )}
                >
                  {DEBT_DIRECTION_LABELS[d]}
                </button>
              ))}
            </div>
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
              placeholder="مثال: رصيد افتتاحي، سلفة، دين سابق…"
            />
          </Field>

          {!isEdit ? (
            <div className="rounded-xl border border-border bg-canvas-sunken/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-meadow-700" />
                <p className="text-[13px] font-semibold text-foreground">الخزينة والنقد</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {CASH_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCashMode(mode)}
                    className={cn(
                      'rounded-xl border px-2.5 py-2.5 text-center text-[11px] font-semibold transition-[transform,background-color,border-color]',
                      cashMode === mode
                        ? mode === 'none'
                          ? 'border-border bg-card text-foreground ring-2 ring-border'
                          : mode === 'disburse'
                            ? 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                            : 'border-meadow-300 bg-meadow-50 text-meadow-800 ring-2 ring-meadow-200'
                        : 'border-border text-muted-foreground hover:bg-card',
                    )}
                  >
                    {DEBT_CASH_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>

              <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">{treasuryHint(direction, cashMode)}</p>

              {cashMode !== 'none' ? (
                <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
                  <Field
                    label={cashOut ? 'الصرف من حساب' : 'الإيداع في حساب'}
                    required
                    hint={accounts.length === 0 ? 'أضِف خزنة/بنك من صفحة النقد' : undefined}
                  >
                    <Select value={source} onValueChange={setSource} disabled={accounts.length === 0}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="اختر خزنة أو بنك" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            <span className="flex items-center gap-1.5">
                              <Landmark className="h-3.5 w-3.5 opacity-60" />
                              {a.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {selected ? (
                    <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-[12px]">
                      <span className="text-muted-foreground">رصيد «{selected.label}»</span>
                      <Money value={sourceBalance} className="font-semibold" />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="مبلغ النقد"
                      required
                      hint={
                        cashAmount
                          ? settlePreview > 0
                            ? 'يُطبَّق على تسوية الدين'
                            : 'سلفة كاملة'
                          : debtVal > 0
                            ? `افتراضي: ${debtVal} (كامل قيمة الدين)`
                            : undefined
                      }
                    >
                      <AmountInput value={cashAmount} onChange={setCashAmount} placeholder={debtVal > 0 ? String(debtVal) : '0'} />
                    </Field>
                    <Field label="طريقة الدفع">
                      <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {PAYMENT_METHOD_LABELS[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {debtVal > 0 ? (
                    <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-card/80 px-3 py-2.5 text-[12px]">
                      {settlePreview > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">يُسَدَّد فوراً من الدين</span>
                          <Money value={settlePreview} decimals={0} className="font-semibold text-meadow-800" />
                        </div>
                      ) : (
                        <p className="text-muted-foreground">يبقى الدين كاملاً على الطرف بعد الصرف النقدي.</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">المتبقي بعد التسجيل</span>
                        <Money value={remainingPreview} decimals={0} className="font-bold" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            disabled={busy || (partyKind !== 'external' && !isEdit && !partyOptions.length)}
            onClick={submit}
          >
            {busy ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديل' : 'تسجيل الدين'}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
