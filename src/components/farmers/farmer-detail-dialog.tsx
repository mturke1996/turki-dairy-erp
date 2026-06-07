'use client';

import { useMemo, useState } from 'react';
import { Banknote, MapPin, Phone, Pencil, Milk } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money, Liters } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { PaymentDialog } from '@/components/forms/payment-dialog';
import { FarmerFormDialog } from './farmer-form-dialog';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { FarmerStatementPDF } from '@/features/pdf/FarmerStatementPDF';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { usePermission } from '@/lib/store/use-permission';
import {
  LIVESTOCK_LABELS,
  QUALITY_LABELS,
  QUALITY_VARIANT,
  FARMER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/domain/constants';
import type { FarmerStats } from '@/lib/domain/calculations';
import { formatShortDate } from '@/lib/utils';

const STATUS_VARIANT = { active: 'success', suspended: 'warning', inactive: 'neutral' } as const;

export function FarmerDetailDialog({
  farmerId,
  open,
  onOpenChange,
}: {
  farmerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useErpData();
  const d = useDerived();
  const canPay = usePermission('supply.record');
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const farmer = d.farmers.find((f) => f.id === farmerId) as FarmerStats | undefined;
  const rawFarmer = data.farmers.find((f) => f.id === farmerId) ?? null;

  const supplies = useMemo(
    () => data.supplies.filter((s) => s.farmerId === farmerId).sort((a, b) => b.date.localeCompare(a.date)),
    [data.supplies, farmerId],
  );
  const payments = useMemo(
    () =>
      data.payments
        .filter((p) => p.kind === 'farmer_payment' && p.partyId === farmerId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.payments, farmerId],
  );

  if (!farmer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3 pl-8">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  {farmer.fullName}
                  <Badge variant={STATUS_VARIANT[farmer.status]}>{FARMER_STATUS_LABELS[farmer.status]}</Badge>
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                  <span className="font-mono" dir="ltr">{farmer.code}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {farmer.region}</span>
                  <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" /> {farmer.phone}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* ملخص */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCell label="إجمالي التوريد" value={<Liters value={farmer.totalSupplied} />} />
            <SummaryCell label="قيمة التوريد" value={<Money value={farmer.totalSupplyValue} decimals={0} />} />
            <SummaryCell label="المدفوع" value={<Money value={farmer.paidTotal} decimals={0} />} />
            <SummaryCell label="الرصيد المستحق" value={<Money value={farmer.creditBalance} decimals={0} />} highlight />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canPay ? (
              <Button size="sm" onClick={() => setPayOpen(true)}>
                <Banknote className="h-4 w-4" />
                تسجيل دفعة
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              تعديل
            </Button>
            <TurkiPdfToolbar
              fileName={`كشف-فلاح-${farmer.code}`}
              label="كشف حساب PDF"
              variant="secondary"
              render={async () => (
                <FarmerStatementPDF
                  farmer={farmer}
                  supplies={supplies}
                  payments={payments}
                  sessionLabel={d.activeSession?.label}
                />
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Milk className="h-3.5 w-3.5" /> {LIVESTOCK_LABELS[farmer.livestockType]} · {farmer.livestockCount} رأس</span>
            <span>الجودة: <Badge variant={QUALITY_VARIANT[farmer.qualityTier]}>{QUALITY_LABELS[farmer.qualityTier]}</Badge></span>
            <span>متوسط السعر: <Money value={farmer.avgPrice} decimals={3} muted /></span>
          </div>

          <Tabs defaultValue="supplies">
            <TabsList>
              <TabsTrigger value="supplies">التوريدات ({supplies.length})</TabsTrigger>
              <TabsTrigger value="payments">الدفعات ({payments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="supplies">
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                {supplies.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead className="text-center">الجودة</TableHead>
                        <TableHead className="text-left">الكمية</TableHead>
                        <TableHead className="text-left">السعر</TableHead>
                        <TableHead className="text-left">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplies.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-[12.5px]">{formatShortDate(s.date)}</TableCell>
                          <TableCell className="text-center"><Badge variant={QUALITY_VARIANT[s.qualityTier]}>{s.qualityTier}</Badge></TableCell>
                          <TableCell className="text-left"><Liters value={s.quantity} className="text-[12px]" /></TableCell>
                          <TableCell className="text-left"><Money value={s.unitPrice} decimals={3} className="text-[12px]" muted /></TableCell>
                          <TableCell className="text-left"><Money value={s.total} className="text-[12.5px] font-semibold" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState title="لا توريدات" />
                )}
              </div>
            </TabsContent>
            <TabsContent value="payments">
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
                  <EmptyState title="لا دفعات" />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        kind="farmer"
        partyId={farmer.id}
        partyName={farmer.fullName}
        outstanding={farmer.creditBalance}
      />
      <FarmerFormDialog open={editOpen} onOpenChange={setEditOpen} farmer={rawFarmer} />
    </>
  );
}

function SummaryCell({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-navy-200 bg-navy-50' : 'border-border bg-canvas-sunken/50'}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-[15px] font-bold text-foreground">{value}</div>
    </div>
  );
}
