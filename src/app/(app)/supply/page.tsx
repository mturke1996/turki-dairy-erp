'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownToLine, Droplets, Lock, Banknote, Tractor, Receipt, Wallet, Sun, Moon, Pencil, CalendarDays, CalendarRange } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field } from '@/components/shared/field';
import { StatTile } from '@/components/shared/stat-tile';
import { Money, Liters } from '@/components/shared/money';
import { VolumeInput } from '@/components/shared/volume-input';
import { AmountInput } from '@/components/shared/amount-input';
import { EmptyState } from '@/components/shared/empty-state';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { accountBalance } from '@/lib/domain/treasury';
import { COPY, MILK_SHIFT_LABELS, QUALITY_LABELS, QUALITY_VARIANT, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { MilkShift, PaymentMethod, QualityTier } from '@/lib/domain/types';
import { formatShortDate } from '@/lib/utils';
import { formatLiters, formatMoney } from '@/lib/format-currency';
import { RowDeleteButton } from '@/components/shared/row-delete-button';
import { SupplyEditDialog } from '@/components/supply/supply-edit-dialog';
import type { SupplyTransaction } from '@/lib/domain/types';

const C = COPY.collection;

export default function SupplyPage() {
  const data = useErpData();
  const d = useDerived();
  const recordSupply = useErpStore((s) => s.recordSupply);
  const deleteSupply = useErpStore((s) => s.deleteSupply);
  const canSupply = usePermission('supply.record');
  const [editSupply, setEditSupply] = useState<SupplyTransaction | null>(null);

  const sessionLocked = d.activeSession?.status === 'archived';
  const activeFarmers = useMemo(
    () => data.farmers.filter((f) => f.status === 'active').sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar')),
    [data.farmers],
  );

  const accounts = useMemo(
    () => [
      ...data.vaults.filter((v) => v.isActive).map((v) => ({ value: `vault:${v.id}`, label: v.name, type: 'vault' as const, id: v.id })),
      ...data.banks.filter((b) => b.isActive).map((b) => ({ value: `bank:${b.id}`, label: b.bankName, type: 'bank' as const, id: b.id })),
    ],
    [data.vaults, data.banks],
  );

  const [farmerId, setFarmerId] = useState('');
  const [recordMode, setRecordMode] = useState<'single' | 'period'>('single');
  const [milkShift, setMilkShift] = useState<MilkShift>('morning');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quality, setQuality] = useState<QualityTier>('A');
  const [fatPct, setFatPct] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [notes, setNotes] = useState('');
  const [payNow, setPayNow] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [paySource, setPaySource] = useState('none');
  const [settleFull, setSettleFull] = useState(true);

  const selectedFarmer = activeFarmers.find((f) => f.id === farmerId);
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const total = qty * price;
  const payVal = Number(payAmount) || 0;
  const payAccount = accounts.find((a) => a.value === paySource) ?? null;
  const sourceBalance = payAccount
    ? accountBalance(payAccount.type, payAccount.id, data.vaults, data.banks, data.cashMovements)
    : 0;

  function onFarmerChange(id: string) {
    setFarmerId(id);
    const f = activeFarmers.find((x) => x.id === id);
    if (f) {
      setQuality(f.qualityTier);
      // السعر يُجلب تلقائياً من بروفايل الفلاح — ويبقى قابلاً للتعديل يدوياً.
      setUnitPrice(String(f.defaultBuyPrice));
    }
  }

  const periodDays =
    periodFrom && periodTo && periodFrom <= periodTo
      ? Math.round((new Date(periodTo).getTime() - new Date(periodFrom).getTime()) / 86_400_000) + 1
      : 0;

  function onModeChange(mode: 'single' | 'period') {
    setRecordMode(mode);
    if (mode === 'period' && !periodFrom) {
      const to = new Date();
      const from = new Date(to.getTime() - 14 * 86_400_000);
      setPeriodFrom(from.toISOString().slice(0, 10));
      setPeriodTo(to.toISOString().slice(0, 10));
    }
  }

  function reset() {
    setFarmerId('');
    setMilkShift('morning');
    setQuantity('');
    setUnitPrice('');
    setQuality('A');
    setFatPct('');
    setNotes('');
    setPayNow(false);
    setPayAmount('');
    setPaySource('none');
  }

  function submit() {
    if (!farmerId) return toast.error('اختر الفلاح المورّد.');
    if (qty <= 0) return toast.error('أدخل كمية صحيحة باللتر.');
    if (price <= 0) return toast.error('أدخل سعر شراء اللتر.');

    const isPeriod = recordMode === 'period';
    if (isPeriod) {
      if (!periodFrom || !periodTo) return toast.error('حدّد بداية ونهاية فترة التجميع.');
      if (periodFrom > periodTo) return toast.error('بداية الفترة يجب أن تسبق نهايتها.');
    }

    if (payNow) {
      if (payVal <= 0) return toast.error('أدخل مبلغ الدفع الفوري.');
      if (!payAccount) return toast.error('اختر حساب الخزينة/البنك للصرف.');
      if (payVal > sourceBalance + 0.001) return toast.error('رصيد الحساب لا يكفي.');
    }

    void (async () => {
      const hour = milkShift === 'evening' ? 17 : 6;
      const txDate = isPeriod
        ? new Date(`${periodTo}T12:00:00`).toISOString()
        : new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
      const res = await recordSupply({
      farmerId,
      quantity: qty,
      unitPrice: price,
      qualityTier: quality,
      milkShift: isPeriod ? undefined : milkShift,
      periodFrom: isPeriod ? periodFrom : undefined,
      periodTo: isPeriod ? periodTo : undefined,
      fatPct: fatPct ? Number(fatPct) : undefined,
      date: txDate,
      notes: notes.trim() || undefined,
      immediatePayment: payNow && payAccount
        ? {
            amount: payVal,
            method: payMethod,
            sourceType: payAccount.type,
            sourceId: payAccount.id,
            settlementComplete: settleFull,
          }
        : undefined,
      });
      if (res.ok) {
        const modeLabel = isPeriod ? `فترة ${periodDays} يوم` : MILK_SHIFT_LABELS[milkShift];
        toast.success(C.success, {
          description: payNow
            ? `${modeLabel} · ${formatLiters(qty, 0, false)} + دفع فوري ${formatMoney(payVal, { decimals: 0 })}`
            : `${modeLabel} · ${formatLiters(qty, 0, false)} — ${selectedFarmer?.fullName}`,
        });
        reset();
      } else {
        toast.error(res.error ?? 'تعذّر التسجيل');
      }
    })();
  }

  const sessionSupplies = useMemo(
    () =>
      data.supplies
        .filter((s) => s.sessionId === d.activeSession?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.supplies, d.activeSession?.id],
  );

  const sum = d.activeSummary;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="العمليات"
        title={C.title}
        description={`تسجيل استلام الحليب الخام من الفلاحين خلال ${d.activeSession?.label ?? ''}.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={C.plural} value={<Liters value={sum?.supplyQty ?? 0} />} icon={Droplets} tone="meadow" hint={`${sum?.supplyCount ?? 0} عملية`} />
        <StatTile label={C.cost} value={<Money value={sum?.supplyCost ?? 0} decimals={0} />} icon={Banknote} tone="navy" />
        <StatTile label="ديون الفلاحين" value={<Money value={d.totals.payables} decimals={0} />} icon={Tractor} tone="sun" hint="إجمالي غير المسدّد" />
      </div>

      {sessionLocked ? (
        <Card className="border-sun-200 bg-sun-50/50">
          <CardContent className="flex items-center gap-3 py-4 text-[13px] text-sun-900">
            <Lock className="h-5 w-5 shrink-0 text-sun-600" />
            {COPY.session.archived}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-4.5 w-4.5 text-meadow-600" />
              {C.recordNew}
            </CardTitle>
            <CardDescription>الكمية تُضاف للمخزون ويُحسب دين الفلاح تلقائياً.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={C.farmer} required>
              <Select value={farmerId} onValueChange={onFarmerChange} disabled={!canSupply || sessionLocked}>
                <SelectTrigger><SelectValue placeholder="اختر الفلاح" /></SelectTrigger>
                <SelectContent>
                  {activeFarmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.fullName} · {f.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="طريقة التسجيل" required>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { mode: 'single' as const, label: 'وجبة يومية', Icon: CalendarDays },
                  { mode: 'period' as const, label: 'فترة مجمّعة', Icon: CalendarRange },
                ]).map(({ mode, label, Icon }) => {
                  const active = recordMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={!canSupply || sessionLocked}
                      onClick={() => onModeChange(mode)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        active
                          ? 'border-navy-400 bg-navy-50 text-navy-800 ring-1 ring-navy-200'
                          : 'border-border bg-canvas-sunken/40 text-muted-foreground hover:bg-canvas-sunken'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {recordMode === 'single' ? (
              <Field label="وجبة الاستلام" required>
                <div className="grid grid-cols-2 gap-2">
                  {(['morning', 'evening'] as MilkShift[]).map((shift) => {
                    const active = milkShift === shift;
                    const Icon = shift === 'morning' ? Sun : Moon;
                    return (
                      <button
                        key={shift}
                        type="button"
                        disabled={!canSupply || sessionLocked}
                        onClick={() => setMilkShift(shift)}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                          active
                            ? 'border-meadow-400 bg-meadow-50 text-meadow-800 ring-1 ring-meadow-200'
                            : 'border-border bg-canvas-sunken/40 text-muted-foreground hover:bg-canvas-sunken'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {MILK_SHIFT_LABELS[shift]}
                      </button>
                    );
                  })}
                </div>
              </Field>
            ) : (
              <div className="space-y-2 rounded-xl border border-navy-200/70 bg-navy-50/40 p-3">
                <p className="text-[12px] font-semibold text-navy-800">فترة التجميع — إجمالي الكمية لكامل الفترة</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="من تاريخ" required>
                    <Input type="date" dir="ltr" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} disabled={!canSupply || sessionLocked} />
                  </Field>
                  <Field label="إلى تاريخ" required>
                    <Input type="date" dir="ltr" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} disabled={!canSupply || sessionLocked} />
                  </Field>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {periodDays > 0 ? `مدة الفترة: ${periodDays} يوم — تبقى محفوظة لتسجيل بقية الفلاحين لنفس الفترة.` : 'حدّد بداية ونهاية الفترة.'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="الكمية" required>
                <VolumeInput value={quantity} onChange={setQuantity} disabled={!canSupply || sessionLocked} />
              </Field>
              <Field
                label="سعر اللتر"
                required
                hint={selectedFarmer ? `تلقائي من بروفايل ${selectedFarmer.fullName.split(' ')[0]} — يمكن تغييره` : 'يُجلب تلقائياً عند اختيار الفلاح'}
              >
                <AmountInput value={unitPrice} onChange={setUnitPrice} placeholder="0.000" disabled={!canSupply || sessionLocked} />
              </Field>
            </div>

            <Field label="الإجمالي">
              <div dir="rtl" className="flex h-10 items-center gap-2 rounded-md border border-border bg-canvas-sunken/40 px-3 text-[13px] font-semibold">
                <Liters value={qty} />
                <span dir="ltr" className="tabular">× {price.toFixed(3)} =</span>
                <Money value={total} className="inline" />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="درجة الجودة">
                <Select value={quality} onValueChange={(v) => setQuality(v as QualityTier)} disabled={!canSupply || sessionLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['A', 'B', 'C'] as QualityTier[]).map((q) => (
                      <SelectItem key={q} value={q}>{QUALITY_LABELS[q]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="نسبة الدسم %" hint="اختياري">
                <Input type="number" inputMode="decimal" dir="ltr" step="0.1" placeholder="3.5" value={fatPct} onChange={(e) => setFatPct(e.target.value)} disabled={!canSupply || sessionLocked} />
              </Field>
            </div>

            {recordMode === 'single' ? (
              <Field label="التاريخ">
                <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canSupply || sessionLocked} />
              </Field>
            ) : null}

            <Field label="ملاحظات" hint="اختياري">
              <Input placeholder="ملاحظة قصيرة" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canSupply || sessionLocked} />
            </Field>

            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="pay-now" className="text-[13px] font-semibold">دفع فوري (كاش/تحويل)</Label>
                </div>
                <Switch id="pay-now" checked={payNow} onCheckedChange={setPayNow} disabled={!canSupply || sessionLocked} />
              </div>
              {payNow ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <Field label="المبلغ" required>
                    <AmountInput value={payAmount} onChange={setPayAmount} placeholder={String(total || 0)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="طريقة الدفع">
                      <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((k) => (
                            <SelectItem key={k} value={k}>{PAYMENT_METHOD_LABELS[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="الصرف من">
                      <Select value={paySource} onValueChange={setPaySource}>
                        <SelectTrigger><SelectValue placeholder="اختر حساب" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  {payAccount ? (
                    <p className="text-[11px] text-muted-foreground">رصيد «{payAccount.label}»: <Money value={sourceBalance} className="inline font-semibold" /></p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Switch id="settle-full" checked={settleFull} onCheckedChange={setSettleFull} />
                    <Label htmlFor="settle-full" className="text-[12px]">تم الدفع — تسوية كاملة لهذا الاستلام</Label>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-meadow-50 px-4 py-3 ring-1 ring-meadow-100">
              <span className="text-[13px] font-medium text-meadow-800">دين الفلاح</span>
              <Money value={total} className="text-[17px] font-bold text-meadow-800" />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="meadow" onClick={submit} disabled={!canSupply || sessionLocked}>
                <ArrowDownToLine className="h-4 w-4" />
                {C.record}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={!canSupply || sessionLocked}>مسح</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4.5 w-4.5 text-navy-600" />
                {C.plural} — {d.activeSession?.label}
              </CardTitle>
              <CardDescription>أحدث عمليات الاستلام في الدورة الحالية</CardDescription>
            </div>
            <Badge variant="neutral">{sessionSupplies.length} عملية</Badge>
          </CardHeader>
          <CardContent>
            {sessionSupplies.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المرجع</TableHead>
                    <TableHead>الفلاح</TableHead>
                    <TableHead className="text-center">الوجبة</TableHead>
                    <TableHead className="text-center">الجودة</TableHead>
                    <TableHead className="text-left">الكمية</TableHead>
                    <TableHead className="text-left">الإجمالي</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionSupplies.slice(0, 40).map((s) => {
                    const farmer = data.farmers.find((f) => f.id === s.farmerId);
                    const shift = s.milkShift ?? 'morning';
                    const isPeriod = !!(s.periodFrom && s.periodTo);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">
                          {s.ref}
                          <span className="block text-[10.5px]">
                            {isPeriod ? `${formatShortDate(s.periodFrom!)} → ${formatShortDate(s.periodTo!)}` : formatShortDate(s.date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px] font-medium">{farmer?.fullName ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          {isPeriod ? (
                            <Badge variant="success" className="text-[10px]">فترة مجمّعة</Badge>
                          ) : (
                            <Badge variant={shift === 'morning' ? 'info' : 'neutral'} className="text-[10px]">
                              {MILK_SHIFT_LABELS[shift]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={QUALITY_VARIANT[s.qualityTier]}>{s.qualityTier}</Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <Liters value={s.quantity} className="text-[12.5px]" />
                        </TableCell>
                        <TableCell className="text-left">
                          <Money value={s.total} className="text-[13px] font-semibold" />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditSupply(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <RowDeleteButton
                              label={s.ref}
                              onConfirm={async () => {
                                const res = await deleteSupply(s.id);
                                if (res.ok) toast.success('تم حذف الاستلام');
                                else toast.error(res.error ?? 'تعذّر الحذف');
                                return res;
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Droplets} title={C.empty} description={C.emptyHint} />
            )}
          </CardContent>
        </Card>
      </div>
      <SupplyEditDialog open={!!editSupply} onOpenChange={(o) => !o && setEditSupply(null)} supply={editSupply} />
    </div>
  );
}
