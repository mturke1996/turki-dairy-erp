'use client';

import { useMemo, useState } from 'react';
import { Banknote, Phone, Pencil, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money, Liters } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { PaymentDialog } from '@/components/forms/payment-dialog';
import { CustomerFormDialog } from './customer-form-dialog';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { CustomerStatementPDF } from '@/features/pdf/CustomerStatementPDF';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { usePermission } from '@/lib/store/use-permission';
import { computeAging } from '@/lib/domain/calculations';
import { CUSTOMER_TYPE_LABELS, PRICE_TIER_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { CustomerStats } from '@/lib/domain/calculations';
import { formatShortDate, formatNumber } from '@/lib/utils';

export function CustomerDetailDialog({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useErpData();
  const d = useDerived();
  const canReceive = usePermission('sales.record');
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const customer = d.customers.find((c) => c.id === customerId) as CustomerStats | undefined;
  const rawCustomer = data.customers.find((c) => c.id === customerId) ?? null;

  const sales = useMemo(
    () => data.sales.filter((s) => s.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date)),
    [data.sales, customerId],
  );
  const payments = useMemo(
    () =>
      data.payments
        .filter((p) => p.kind === 'customer_payment' && p.partyId === customerId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.payments, customerId],
  );
  const aging = useMemo(
    () => (customer ? computeAging(sales, customer.receivedTotal) : null),
    [sales, customer],
  );

  if (!customer || !aging) return null;

  const agingCells = [
    { l: 'غير مستحق', v: aging.current, tone: 'text-meadow-700' },
    { l: '1-30', v: aging.d1_30, tone: 'text-foreground' },
    { l: '31-60', v: aging.d31_60, tone: 'text-sun-700' },
    { l: '61-90', v: aging.d61_90, tone: 'text-sun-800' },
    { l: '+90', v: aging.d90_plus, tone: 'text-rose-600' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="space-y-1 pl-8">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {customer.entityName}
                <Badge variant="neutral">{CUSTOMER_TYPE_LABELS[customer.entityType]}</Badge>
                {customer.onHold ? <Badge variant="danger">مجمّد</Badge> : null}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span className="font-mono" dir="ltr">{customer.code}</span>
                <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>
                <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> {PRICE_TIER_LABELS[customer.priceTier]}</span>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCell label="إجمالي المشتريات" value={<Liters value={customer.totalPurchased} />} />
            <SummaryCell label="إجمالي المبيعات" value={<Money value={customer.totalRevenue} decimals={0} />} />
            <SummaryCell label="المحصّل" value={<Money value={customer.receivedTotal} decimals={0} />} />
            <SummaryCell label="الرصيد المستحق" value={<Money value={customer.outstanding} decimals={0} />} highlight />
          </div>

          {/* أعمار الديون */}
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-foreground">أعمار الديون (يوم)</p>
              <p className="text-[11px] text-muted-foreground">
                حد الائتمان: {formatNumber(customer.creditLimit, 0)} د.ل · الاستخدام {formatNumber(customer.creditUtilization, 0)}%
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {agingCells.map((b) => (
                <div key={b.l} className="rounded-lg bg-canvas-sunken/60 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{b.l}</p>
                  <p className={`mt-0.5 text-[12.5px] font-bold ${b.tone}`} dir="ltr">{formatNumber(b.v, 0)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canReceive ? (
              <Button size="sm" variant="meadow" onClick={() => setPayOpen(true)}>
                <Banknote className="h-4 w-4" />
                تسجيل تحصيل
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              تعديل
            </Button>
            <TurkiPdfToolbar
              fileName={`كشف-عميل-${customer.code}`}
              label="كشف حساب PDF"
              variant="secondary"
              render={async () => (
                <CustomerStatementPDF
                  customer={customer}
                  sales={sales}
                  payments={payments}
                  aging={aging}
                  sessionLabel={d.activeSession?.label}
                />
              )}
            />
          </div>

          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">المبيعات ({sales.length})</TabsTrigger>
              <TabsTrigger value="receipts">التحصيلات ({payments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="sales">
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                {sales.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المرجع</TableHead>
                        <TableHead className="text-left">الكمية</TableHead>
                        <TableHead className="text-left">الاستحقاق</TableHead>
                        <TableHead className="text-left">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-[12.5px]">{formatShortDate(s.date)}</TableCell>
                          <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">{s.ref}</TableCell>
                          <TableCell className="text-left"><Liters value={s.quantity} className="text-[12px]" /></TableCell>
                          <TableCell className="text-left text-[11.5px] text-muted-foreground">{formatShortDate(s.dueDate)}</TableCell>
                          <TableCell className="text-left"><Money value={s.total} className="text-[12.5px] font-semibold" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState title="لا مبيعات" />
                )}
              </div>
            </TabsContent>
            <TabsContent value="receipts">
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                {payments.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المرجع</TableHead>
                        <TableHead className="text-center">الطريقة</TableHead>
                        <TableHead className="text-left">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-[12.5px]">{formatShortDate(p.date)}</TableCell>
                          <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">{p.ref}</TableCell>
                          <TableCell className="text-center text-[12px]">{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                          <TableCell className="text-left"><Money value={p.amount} className="text-[12.5px] font-semibold text-meadow-700" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState title="لا تحصيلات" />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        kind="customer"
        partyId={customer.id}
        partyName={customer.entityName}
        outstanding={customer.outstanding}
      />
      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={rawCustomer} />
    </>
  );
}

function SummaryCell({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-meadow-200 bg-meadow-50' : 'border-border bg-canvas-sunken/50'}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-[15px] font-bold text-foreground">{value}</div>
    </div>
  );
}
