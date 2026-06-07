'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpFromLine, ShoppingCart, Lock, Warehouse, Wallet, TrendingUp, Receipt, AlertTriangle } from 'lucide-react';
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
import { CUSTOMER_TYPE_LABELS } from '@/lib/domain/constants';
import { formatShortDate, formatNumber } from '@/lib/utils';

export default function SalesPage() {
  const data = useErpData();
  const d = useDerived();
  const recordSale = useErpStore((s) => s.recordSale);
  const canSell = usePermission('sales.record');

  const sessionLocked = d.activeSession?.status === 'archived';
  const stock = d.totals.currentStock;
  const wac = d.totals.wac;

  const sellableCustomers = useMemo(
    () => data.customers.filter((c) => !c.onHold).sort((a, b) => a.entityName.localeCompare(b.entityName, 'ar')),
    [data.customers],
  );

  const [customerId, setCustomerId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const selectedCustomer = sellableCustomers.find((c) => c.id === customerId);
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const total = qty * price;
  const estCogs = qty * wac;
  const estProfit = total - estCogs;
  const exceedsStock = qty > stock + 0.001;
  const dueDate = selectedCustomer
    ? new Date(new Date(date + 'T09:00:00').getTime() + selectedCustomer.paymentTerms * 86_400_000)
    : null;

  function onCustomerChange(id: string) {
    setCustomerId(id);
    const c = sellableCustomers.find((x) => x.id === id);
    if (c && !unitPrice) setUnitPrice(String(c.defaultSellPrice));
  }

  function reset() {
    setCustomerId('');
    setQuantity('');
    setUnitPrice('');
    setNotes('');
  }

  function submit() {
    if (!customerId) return toast.error('اختر العميل.');
    if (qty <= 0) return toast.error('أدخل كمية صحيحة باللتر.');
    if (price <= 0) return toast.error('أدخل سعر بيع اللتر.');
    const res = recordSale({
      customerId,
      quantity: qty,
      unitPrice: price,
      date: new Date(date + 'T09:00:00').toISOString(),
      notes: notes.trim() || undefined,
    });
    if (res.ok) {
      toast.success('تم تسجيل البيع', { description: `${qty.toLocaleString('en-US')} لتر — ${selectedCustomer?.entityName}` });
      reset();
    } else {
      toast.error(res.error ?? 'تعذّر التسجيل');
    }
  }

  const sessionSales = useMemo(
    () =>
      data.sales
        .filter((s) => s.sessionId === d.activeSession?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.sales, d.activeSession?.id],
  );

  const sum = d.activeSummary;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="العمليات"
        title="المبيعات"
        description={`بيع الحليب بالجملة للمصانع والموزّعين خلال فترة ${d.activeSession?.label ?? ''}.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="المخزون المتاح" value={<Liters value={stock} />} icon={Warehouse} tone="meadow" hint={`تكلفة ${formatNumber(wac, 3)} د.ل/لتر`} />
        <StatTile label="مبيعات الفترة" value={<Money value={sum?.salesRevenue ?? 0} decimals={0} />} icon={Wallet} tone="navy" hint={`${sum?.salesCount ?? 0} عملية`} />
        <StatTile label="ربح الفترة" value={<Money value={sum?.grossProfit ?? 0} decimals={0} />} icon={TrendingUp} tone="sun" hint={`هامش ${formatNumber(sum?.marginPct ?? 0, 1)}%`} />
        <StatTile label="ذمم العملاء" value={<Money value={d.totals.receivables} decimals={0} />} icon={Receipt} tone="rose" hint={`متأخر ${formatNumber(d.totals.overdue, 0)} د.ل`} />
      </div>

      {sessionLocked ? (
        <Card className="border-sun-200 bg-sun-50/50">
          <CardContent className="flex items-center gap-3 py-4 text-[13px] text-sun-900">
            <Lock className="h-5 w-5 shrink-0 text-sun-600" />
            الفترة المعروضة مؤرشفة. انتقل إلى الفترة النشطة لتسجيل مبيعات جديدة.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* نموذج البيع */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4.5 w-4.5 text-navy-600" />
              تسجيل عملية بيع
            </CardTitle>
            <CardDescription>اختر العميل وحدّد الكمية والسعر.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="العميل" required>
              <Select value={customerId} onValueChange={onCustomerChange} disabled={!canSell || sessionLocked}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {sellableCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.entityName} · {CUSTOMER_TYPE_LABELS[c.entityType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="الكمية (لتر)" required error={exceedsStock ? `يتجاوز المخزون (${formatNumber(stock, 0)})` : undefined}>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={!canSell || sessionLocked}
                  className={exceedsStock ? 'border-rose-300 focus:border-rose-400' : undefined}
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
                  disabled={!canSell || sessionLocked}
                />
              </Field>
            </div>

            <Field label="تاريخ البيع" hint={dueDate ? `الاستحقاق: ${formatShortDate(dueDate)} (${selectedCustomer?.paymentTerms} يوم)` : undefined}>
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canSell || sessionLocked} />
            </Field>

            <Field label="ملاحظات" hint="اختياري">
              <Input placeholder="ملاحظة قصيرة" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canSell || sessionLocked} />
            </Field>

            <div className="space-y-2 rounded-xl bg-navy-50 px-4 py-3 ring-1 ring-navy-100">
              <div className="flex items-center justify-between text-[12.5px] text-navy-700">
                <span>الإجمالي</span>
                <Money value={total} className="text-[16px] font-bold" />
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>تكلفة تقديرية (COGS)</span>
                <Money value={estCogs} decimals={2} muted />
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">ربح تقديري</span>
                <Money value={estProfit} className={estProfit >= 0 ? 'font-semibold text-meadow-700' : 'font-semibold text-rose-600'} />
              </div>
            </div>

            <Button className="w-full" onClick={submit} disabled={!canSell || sessionLocked || exceedsStock}>
              <ArrowUpFromLine className="h-4 w-4" />
              تسجيل البيع
            </Button>
            {!canSell ? (
              <p className="text-center text-[12px] text-muted-foreground">صلاحيتك الحالية لا تتيح تسجيل المبيعات.</p>
            ) : null}
          </CardContent>
        </Card>

        {/* مبيعات الفترة */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4.5 w-4.5 text-navy-600" />
                مبيعات {d.activeSession?.label}
              </CardTitle>
              <CardDescription>أحدث عمليات البيع في الفترة الحالية</CardDescription>
            </div>
            <Badge variant="neutral">{sessionSales.length} عملية</Badge>
          </CardHeader>
          <CardContent>
            {sessionSales.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المرجع</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead className="text-left">الكمية</TableHead>
                    <TableHead className="text-left">السعر</TableHead>
                    <TableHead className="text-left">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionSales.slice(0, 40).map((s) => {
                    const customer = data.customers.find((c) => c.id === s.customerId);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">
                          {s.ref}
                          <span className="block text-[10.5px]">{formatShortDate(s.date)}</span>
                        </TableCell>
                        <TableCell className="text-[13px] font-medium">{customer?.entityName ?? '—'}</TableCell>
                        <TableCell className="text-left">
                          <Liters value={s.quantity} className="text-[12.5px]" />
                        </TableCell>
                        <TableCell className="text-left">
                          <Money value={s.unitPrice} decimals={3} className="text-[12px]" muted />
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
              <EmptyState icon={ShoppingCart} title="لا مبيعات في هذه الفترة" description="ابدأ بتسجيل أول عملية بيع." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
