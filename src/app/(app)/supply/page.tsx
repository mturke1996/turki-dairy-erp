'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownToLine, Droplets, Lock, Banknote, Tractor, Receipt, FlaskConical, Wallet } from 'lucide-react';
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
import { EmptyState } from '@/components/shared/empty-state';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { accountBalance } from '@/lib/domain/treasury';
import { QUALITY_LABELS, QUALITY_VARIANT, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { PaymentMethod, QualityTier } from '@/lib/domain/types';
import { formatShortDate } from '@/lib/utils';

export default function SupplyPage() {
  const data = useErpData();
  const d = useDerived();
  const recordSupply = useErpStore((s) => s.recordSupply);
  const canSupply = usePermission('supply.record');

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
  const [quantity, setQuantity] = useState('');
  const [sampleQty, setSampleQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quality, setQuality] = useState<QualityTier>('A');
  const [fatPct, setFatPct] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [payNow, setPayNow] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [paySource, setPaySource] = useState('none');
  const [settleFull, setSettleFull] = useState(true);

  const selectedFarmer = activeFarmers.find((f) => f.id === farmerId);
  const qty = Number(quantity) || 0;
  const sample = Number(sampleQty) || 0;
  const price = Number(unitPrice) || 0;
  const billableQty = Math.max(0, qty - sample);
  const total = billableQty * price;
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
      if (!unitPrice) setUnitPrice(String(f.defaultBuyPrice));
    }
  }

  function reset() {
    setFarmerId('');
    setQuantity('');
    setSampleQty('');
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
    if (sample > qty) return toast.error('كمية العينة أكبر من الكمية الكلية.');
    if (price <= 0) return toast.error('أدخل سعر شراء اللتر.');

    if (payNow) {
      if (payVal <= 0) return toast.error('أدخل مبلغ الدفع الفوري.');
      if (!payAccount) return toast.error('اختر حساب الخزينة/البنك للصرف.');
      if (payVal > sourceBalance + 0.001) return toast.error('رصيد الحساب لا يكفي.');
    }

    const res = recordSupply({
      farmerId,
      quantity: qty,
      unitPrice: price,
      qualityTier: quality,
      sampleQty: sample > 0 ? sample : undefined,
      fatPct: fatPct ? Number(fatPct) : undefined,
      date: new Date(date + 'T09:00:00').toISOString(),
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
      toast.success('تم تسجيل التوريد', {
        description: payNow ? `${qty} لتر + دفع فوري ${payVal} د.ل` : `${qty.toLocaleString('en-US')} لتر — ${selectedFarmer?.fullName}`,
      });
      reset();
    } else {
      toast.error(res.error ?? 'تعذّر التسجيل');
    }
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
        title="التوريد"
        description={`تسجيل شراء الحليب الخام من الفلاحين خلال فترة ${d.activeSession?.label ?? ''}.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="توريدات الفترة" value={<Liters value={sum?.supplyQty ?? 0} />} icon={Droplets} tone="meadow" hint={`${sum?.supplyCount ?? 0} عملية`} />
        <StatTile label="تكلفة التوريد" value={<Money value={sum?.supplyCost ?? 0} decimals={0} />} icon={Banknote} tone="navy" />
        <StatTile label="مستحقات الفلاحين" value={<Money value={d.totals.payables} decimals={0} />} icon={Tractor} tone="sun" hint="إجمالي غير المسدّد" />
      </div>

      {sessionLocked ? (
        <Card className="border-sun-200 bg-sun-50/50">
          <CardContent className="flex items-center gap-3 py-4 text-[13px] text-sun-900">
            <Lock className="h-5 w-5 shrink-0 text-sun-600" />
            الفترة المعروضة مؤرشفة. انتقل إلى الفترة النشطة من المبدّل أعلى الشاشة لتسجيل عمليات جديدة.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-4.5 w-4.5 text-meadow-600" />
              تسجيل توريد جديد
            </CardTitle>
            <CardDescription>الكمية الكاملة تدخل المخزون. العينة لا تُحسب في مستحقات الفلاح.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="الفلاح المورّد" required>
              <Select value={farmerId} onValueChange={onFarmerChange} disabled={!canSupply || sessionLocked}>
                <SelectTrigger><SelectValue placeholder="اختر الفلاح" /></SelectTrigger>
                <SelectContent>
                  {activeFarmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.fullName} · {f.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="الكمية الكلية (لتر)" required>
                <Input type="number" inputMode="decimal" dir="ltr" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={!canSupply || sessionLocked} />
              </Field>
              <Field label="عينة (لتر)" hint="تدخل المخزون — بدون مستحق">
                <Input type="number" inputMode="decimal" dir="ltr" placeholder="0" value={sampleQty} onChange={(e) => setSampleQty(e.target.value)} disabled={!canSupply || sessionLocked} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر اللتر (د.ل)" required>
                <Input type="number" inputMode="decimal" dir="ltr" step="0.001" placeholder="0.000" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} disabled={!canSupply || sessionLocked} />
              </Field>
              <Field label="القابل للفوترة">
                <div className="flex h-10 items-center rounded-md border border-border bg-canvas-sunken/40 px-3 text-[13px] font-semibold">
                  <Liters value={billableQty} /> × {price.toFixed(3)}
                </div>
              </Field>
            </div>

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

            <Field label="التاريخ">
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canSupply || sessionLocked} />
            </Field>

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
                  <Field label="المبلغ (د.ل)" required>
                    <Input type="number" dir="ltr" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(total || 0)} />
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
                    <Label htmlFor="settle-full" className="text-[12px]">تم الدفع — تسوية كاملة لهذا التوريد</Label>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-meadow-50 px-4 py-3 ring-1 ring-meadow-100">
              <div>
                <span className="text-[13px] font-medium text-meadow-800">مستحقات الفلاح</span>
                {sample > 0 ? (
                  <p className="flex items-center gap-1 text-[10.5px] text-meadow-700"><FlaskConical className="h-3 w-3" /> عينة {sample} ل — خارج الحساب</p>
                ) : null}
              </div>
              <Money value={total} className="text-[17px] font-bold text-meadow-800" />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="meadow" onClick={submit} disabled={!canSupply || sessionLocked}>
                <ArrowDownToLine className="h-4 w-4" />
                تسجيل التوريد
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
                توريدات {d.activeSession?.label}
              </CardTitle>
              <CardDescription>أحدث العمليات المسجّلة في الفترة الحالية</CardDescription>
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
                    <TableHead className="text-center">الجودة</TableHead>
                    <TableHead className="text-left">الكمية</TableHead>
                    <TableHead className="text-left">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionSupplies.slice(0, 40).map((s) => {
                    const farmer = data.farmers.find((f) => f.id === s.farmerId);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">
                          {s.ref}
                          <span className="block text-[10.5px]">{formatShortDate(s.date)}</span>
                        </TableCell>
                        <TableCell className="text-[13px] font-medium">{farmer?.fullName ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={QUALITY_VARIANT[s.qualityTier]}>{s.qualityTier}</Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <Liters value={s.quantity} className="text-[12.5px]" />
                          {(s.sampleQty ?? 0) > 0 ? (
                            <span className="block text-[10px] text-muted-foreground">عينة {s.sampleQty} ل</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-left">
                          <Money value={s.total} className="text-[13px] font-semibold" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Droplets} title="لا توريدات في هذه الفترة" description="ابدأ بتسجيل أول عملية توريد." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
