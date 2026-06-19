'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpFromLine, ShoppingCart, Lock, Warehouse, Wallet, TrendingUp, Receipt, Pencil } from 'lucide-react';
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
import { SinglePartyPicker, type SinglePartyOption } from '@/components/shared/single-party-picker';
import { StatTile } from '@/components/shared/stat-tile';
import { Money, Liters } from '@/components/shared/money';
import { VolumeInput } from '@/components/shared/volume-input';
import { AmountInput } from '@/components/shared/amount-input';
import { EmptyState } from '@/components/shared/empty-state';
import {
  EMPTY_SPLIT_STATE,
  SplitPaymentFields,
  treasurySelectionFromState,
  validateSplitPaymentState,
  type SplitPaymentState,
} from '@/components/treasury/split-payment-fields';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { CUSTOMER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import { formatShortDate, formatNumber } from '@/lib/utils';
import { formatLiters, formatMoney, formatPricePerLiter } from '@/lib/format-currency';
import { RowDeleteButton } from '@/components/shared/row-delete-button';
import { SaleEditDialog } from '@/components/sales/sale-edit-dialog';
import type { PaymentMethod, SaleTransaction } from '@/lib/domain/types';

export default function SalesPage() {
  const data = useErpData();
  const d = useDerived();
  const recordSale = useErpStore((s) => s.recordSale);
  const deleteSale = useErpStore((s) => s.deleteSale);
  const canSell = usePermission('sales.record');
  const [editSale, setEditSale] = useState<SaleTransaction | null>(null);

  const sessionLocked = d.activeSession?.status === 'archived';
  const stock = d.totals.currentStock;
  const wac = d.totals.wac;

  const sellableCustomers = useMemo(
    () => data.customers.filter((c) => !c.onHold).sort((a, b) => a.entityName.localeCompare(b.entityName, 'ar')),
    [data.customers],
  );

  const customerOptions = useMemo<SinglePartyOption[]>(
    () =>
      sellableCustomers.map((c) => ({
        id: c.id,
        label: c.entityName,
        sublabel: `${c.code} · ${CUSTOMER_TYPE_LABELS[c.entityType]}`,
        meta: `سعر افتراضي ${c.defaultSellPrice.toFixed(3)} / لتر · ${c.paymentTerms} يوم`,
      })),
    [sellableCustomers],
  );

  const [customerId, setCustomerId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [collectNow, setCollectNow] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('cash');
  const [collectTreasury, setCollectTreasury] = useState<SplitPaymentState>(EMPTY_SPLIT_STATE);

  const selectedCustomer = sellableCustomers.find((c) => c.id === customerId);
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const total = qty * price;
  const collectVal = Number(collectAmount) || 0;
  const estCogs = qty * wac;
  const estProfit = total - estCogs;
  const exceedsStock = qty > stock + 0.001;
  const dueDate = selectedCustomer
    ? new Date(new Date(date + 'T09:00:00').getTime() + selectedCustomer.paymentTerms * 86_400_000)
    : null;

  function onCustomerChange(id: string) {
    setCustomerId(id);
    const c = sellableCustomers.find((x) => x.id === id);
    // السعر يُجلب تلقائياً من بروفايل العميل — ويبقى قابلاً للتعديل يدوياً.
    if (c) setUnitPrice(String(c.defaultSellPrice));
  }

  function onCollectNowChange(checked: boolean) {
    setCollectNow(checked);
    if (checked && total > 0) setCollectAmount(String(Math.round(total)));
    if (!checked) {
      setCollectAmount('');
      setCollectTreasury(EMPTY_SPLIT_STATE);
    }
  }

  function reset() {
    setCustomerId('');
    setQuantity('');
    setUnitPrice('');
    setNotes('');
    setCollectNow(false);
    setCollectAmount('');
    setCollectTreasury(EMPTY_SPLIT_STATE);
  }

  function submit() {
    if (!customerId) return toast.error('اختر العميل.');
    if (qty <= 0) return toast.error('أدخل كمية صحيحة باللتر.');
    if (price <= 0) return toast.error('أدخل سعر بيع اللتر.');

    if (collectNow) {
      if (collectVal <= 0) return toast.error('أدخل مبلغ التحصيل الفوري.');
      const splitErr = validateSplitPaymentState(collectVal, collectTreasury, {
        vaults: data.vaults,
        banks: data.banks,
        cashMovements: data.cashMovements,
      });
      if (splitErr) return toast.error(splitErr);
    }

    void (async () => {
      const res = await recordSale({
        customerId,
        quantity: qty,
        unitPrice: price,
        date: new Date(date + 'T09:00:00').toISOString(),
        notes: notes.trim() || undefined,
        immediateReceipt: collectNow
          ? {
              amount: collectVal,
              method: collectMethod,
              ...treasurySelectionFromState(collectVal, collectTreasury),
            }
          : undefined,
      });
      if (res.ok) {
        toast.success('تم تسجيل البيع', {
          description: collectNow
            ? `${formatLiters(qty, 0, false)} + تحصيل فوري ${formatMoney(collectVal, { decimals: 0 })}`
            : `${formatLiters(qty, 0, false)} — ${selectedCustomer?.entityName}`,
        });
        reset();
      } else {
        toast.error(res.error ?? 'تعذّر التسجيل');
      }
    })();
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
        <StatTile label="المخزون المتاح" value={<Liters value={stock} />} icon={Warehouse} tone="meadow" hint={`تكلفة ${formatPricePerLiter(wac, 3)}`} />
        <StatTile label="مبيعات الفترة" value={<Money value={sum?.salesRevenue ?? 0} decimals={0} />} icon={Wallet} tone="navy" hint={`${sum?.salesCount ?? 0} عملية`} />
        <StatTile label="ربح الفترة" value={<Money value={sum?.grossProfit ?? 0} decimals={0} />} icon={TrendingUp} tone="sun" hint={`هامش ${formatNumber(sum?.marginPct ?? 0, 1)}%`} />
        <StatTile label="ديون العملاء" value={<Money value={d.totals.receivables} decimals={0} />} icon={Receipt} tone="rose" hint={`متأخر ${formatMoney(d.totals.overdue, { decimals: 0, isolate: false })}`} />
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
              <SinglePartyPicker
                value={customerId}
                onChange={onCustomerChange}
                options={customerOptions}
                partyLabel="عميل"
                placeholder="اختر العميل"
                searchPlaceholder="بحث بالاسم أو الكود…"
                emptyMessage="لا عملاء متاحين مطابقين."
                disabled={!canSell || sessionLocked}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="الكمية" required error={exceedsStock ? `يتجاوز المخزون (${formatNumber(stock, 0)} لتر)` : undefined}>
                <VolumeInput
                  value={quantity}
                  onChange={setQuantity}
                  disabled={!canSell || sessionLocked}
                  className={exceedsStock ? 'border-rose-300 focus-within:ring-rose-200' : undefined}
                />
              </Field>
              <Field
                label="سعر اللتر"
                required
                hint={selectedCustomer ? 'تلقائي من بروفايل العميل — يمكن تغييره' : 'يُجلب تلقائياً عند اختيار العميل'}
              >
                <AmountInput
                  value={unitPrice}
                  onChange={setUnitPrice}
                  placeholder="0.000"
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

            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="collect-now" className="text-[13px] font-semibold">دفعة واحدة من العميل</Label>
                    <p className="text-[11px] text-muted-foreground">تحصيل فوري في حساب واحد عند التسجيل</p>
                  </div>
                </div>
                <Switch id="collect-now" checked={collectNow} onCheckedChange={onCollectNowChange} disabled={!canSell || sessionLocked} />
              </div>
              {collectNow ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <Field label="المبلغ" required hint={total > 0 ? `إجمالي البيع: ${formatMoney(total, { decimals: 0, isolate: false })}` : undefined}>
                    <div className="flex gap-2">
                      <AmountInput value={collectAmount} onChange={setCollectAmount} placeholder={String(total || 0)} className="flex-1" />
                      {total > 0 ? (
                        <Button type="button" variant="outline" size="sm" className="shrink-0 px-3" onClick={() => setCollectAmount(String(Math.round(total)))}>
                          ملء الإجمالي
                        </Button>
                      ) : null}
                    </div>
                  </Field>
                  <Field label="طريقة التحصيل">
                    <Select value={collectMethod} onValueChange={(v) => setCollectMethod(v as PaymentMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((k) => (
                          <SelectItem key={k} value={k}>{PAYMENT_METHOD_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <SplitPaymentFields
                    totalAmount={collectVal}
                    vaults={data.vaults}
                    banks={data.banks}
                    cashMovements={data.cashMovements}
                    state={collectTreasury}
                    onChange={setCollectTreasury}
                    singleLabel="الإيداع في حساب"
                    outflow={false}
                    allowSplit={false}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2 rounded-xl bg-navy-50 px-4 py-3 ring-1 ring-navy-100">
              <div className="flex items-center justify-between text-[12.5px] text-navy-700">
                <span>الإجمالي</span>
                <Money value={total} className="text-[16px] font-bold" />
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>تكلفة تقديرية (COGS)</span>
                <Money value={estCogs} decimals={2} muted />
              </div>
              {collectNow ? (
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted-foreground">متبقي على العميل (تقديري)</span>
                  <Money value={Math.max(0, total - collectVal)} className="font-semibold text-rose-700" />
                </div>
              ) : null}
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
              <>
                <div className="space-y-2.5 md:hidden">
                  {sessionSales.slice(0, 40).map((s) => {
                    const customer = data.customers.find((c) => c.id === s.customerId);
                    return (
                      <article key={s.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold">{customer?.entityName ?? '—'}</p>
                            <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                              <Liters value={s.quantity} />
                              <span>×</span>
                              <Money value={s.unitPrice} decimals={3} muted />
                            </div>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">{formatShortDate(s.date)}</span>
                          </div>
                          <Money value={s.total} className="shrink-0 text-[15px] font-bold text-navy-700" />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-[10.5px] text-muted-foreground" dir="ltr">{s.ref}</span>
                          <div className="flex gap-1">
                            <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditSale(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <RowDeleteButton
                              label={s.ref}
                              onConfirm={async () => {
                                const res = await deleteSale(s.id);
                                if (res.ok) toast.success('تم حذف البيع');
                                else toast.error(res.error ?? 'تعذّر الحذف');
                                return res;
                              }}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المرجع</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead className="text-left">الكمية</TableHead>
                        <TableHead className="text-left">السعر</TableHead>
                        <TableHead className="text-left">الإجمالي</TableHead>
                        <TableHead />
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
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditSale(s)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <RowDeleteButton
                                  label={s.ref}
                                  onConfirm={async () => {
                                    const res = await deleteSale(s.id);
                                    if (res.ok) toast.success('تم حذف البيع');
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
                </div>
              </>
            ) : (
              <EmptyState icon={ShoppingCart} title="لا مبيعات في هذه الفترة" description="ابدأ بتسجيل أول عملية بيع." />
            )}
          </CardContent>
        </Card>
      </div>
      <SaleEditDialog open={!!editSale} onOpenChange={(o) => !o && setEditSale(null)} sale={editSale} />
    </div>
  );
}
