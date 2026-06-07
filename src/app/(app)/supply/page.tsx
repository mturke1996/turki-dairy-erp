'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownToLine, Droplets, Lock, Banknote, Tractor, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { QUALITY_LABELS, QUALITY_VARIANT } from '@/lib/domain/constants';
import type { QualityTier } from '@/lib/domain/types';
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

  const [farmerId, setFarmerId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quality, setQuality] = useState<QualityTier>('A');
  const [fatPct, setFatPct] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const selectedFarmer = activeFarmers.find((f) => f.id === farmerId);
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const total = qty * price;

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
    setUnitPrice('');
    setQuality('A');
    setFatPct('');
    setNotes('');
  }

  function submit() {
    if (!farmerId) return toast.error('اختر الفلاح المورّد.');
    if (qty <= 0) return toast.error('أدخل كمية صحيحة باللتر.');
    if (price <= 0) return toast.error('أدخل سعر شراء اللتر.');
    const res = recordSupply({
      farmerId,
      quantity: qty,
      unitPrice: price,
      qualityTier: quality,
      fatPct: fatPct ? Number(fatPct) : undefined,
      date: new Date(date + 'T09:00:00').toISOString(),
      notes: notes.trim() || undefined,
    });
    if (res.ok) {
      toast.success('تم تسجيل التوريد', { description: `${qty.toLocaleString('en-US')} لتر — ${selectedFarmer?.fullName}` });
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
        {/* نموذج التسجيل */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-4.5 w-4.5 text-meadow-600" />
              تسجيل توريد جديد
            </CardTitle>
            <CardDescription>أدخل بيانات الحليب الوارد من المورّد.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="الفلاح المورّد" required>
              <Select value={farmerId} onValueChange={onFarmerChange} disabled={!canSupply || sessionLocked}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفلاح" />
                </SelectTrigger>
                <SelectContent>
                  {activeFarmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.fullName} · {f.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="الكمية (لتر)" required>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={!canSupply || sessionLocked}
                />
              </Field>
              <Field label="سعر اللتر (د.ل)" required>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  step="0.001"
                  placeholder="0.000"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  disabled={!canSupply || sessionLocked}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="درجة الجودة">
                <Select value={quality} onValueChange={(v) => setQuality(v as QualityTier)} disabled={!canSupply || sessionLocked}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['A', 'B', 'C'] as QualityTier[]).map((q) => (
                      <SelectItem key={q} value={q}>
                        {QUALITY_LABELS[q]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="نسبة الدسم %" hint="اختياري">
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  step="0.1"
                  placeholder="3.5"
                  value={fatPct}
                  onChange={(e) => setFatPct(e.target.value)}
                  disabled={!canSupply || sessionLocked}
                />
              </Field>
            </div>

            <Field label="التاريخ">
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canSupply || sessionLocked} />
            </Field>

            <Field label="ملاحظات" hint="اختياري">
              <Input placeholder="ملاحظة قصيرة" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canSupply || sessionLocked} />
            </Field>

            <div className="flex items-center justify-between rounded-xl bg-meadow-50 px-4 py-3 ring-1 ring-meadow-100">
              <span className="text-[13px] font-medium text-meadow-800">إجمالي التوريد</span>
              <Money value={total} className="text-[17px] font-bold text-meadow-800" />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="meadow" onClick={submit} disabled={!canSupply || sessionLocked}>
                <ArrowDownToLine className="h-4 w-4" />
                تسجيل التوريد
              </Button>
              <Button variant="ghost" onClick={reset} disabled={!canSupply || sessionLocked}>
                مسح
              </Button>
            </div>
            {!canSupply ? (
              <p className="text-center text-[12px] text-muted-foreground">صلاحيتك الحالية لا تتيح تسجيل التوريد.</p>
            ) : null}
          </CardContent>
        </Card>

        {/* توريدات الفترة */}
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
