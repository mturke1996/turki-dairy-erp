'use client';

import { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Clock, Tractor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money, Liters } from '@/components/shared/money';
import { PaymentDialog } from '@/components/forms/payment-dialog';
import { allFarmerSessionStats, type FarmerSessionStats } from '@/lib/domain/calculations';
import { useErpData } from '@/lib/store/use-derived';
import type { Session } from '@/lib/domain/types';

const STATUS_BADGE = {
  paid: { label: 'تم الدفع', variant: 'success' as const, icon: CheckCircle2 },
  partial: { label: 'دفع جزئي', variant: 'warning' as const, icon: Clock },
  pending: { label: 'مستحق', variant: 'danger' as const, icon: Banknote },
  none: { label: '—', variant: 'neutral' as const, icon: Tractor },
};

type Props = {
  session: Session;
  readonly?: boolean;
};

export function FarmerCycleSettlement({ session, readonly }: Props) {
  const data = useErpData();
  const [payFarmer, setPayFarmer] = useState<FarmerSessionStats | null>(null);

  const rows = useMemo(() => {
    const archived = session.archive?.balancesSnapshot.farmers;
    if (archived?.length && session.status === 'archived') {
      return archived.map((f) => {
        const farmer = data.farmers.find((x) => x.id === f.id);
        return {
          farmerId: f.id,
          sessionId: session.id,
          fullName: f.name,
          code: farmer?.code ?? '—',
          suppliedQty: f.suppliedQty ?? 0,
          sampleQty: 0,
          billableQty: f.suppliedQty ?? 0,
          suppliedValue: (f.paidAmount ?? 0) + f.balance,
          paidAmount: f.paidAmount ?? 0,
          balance: f.balance,
          status: (f.status ?? (f.balance <= 0.01 ? 'paid' : 'pending')) as FarmerSessionStats['status'],
          supplyCount: 0,
          paymentCount: 0,
        } satisfies FarmerSessionStats;
      });
    }
    return allFarmerSessionStats(data, session.id);
  }, [data, session]);

  const totals = useMemo(
    () => ({
      value: rows.reduce((s, r) => s + r.suppliedValue, 0),
      paid: rows.reduce((s, r) => s + r.paidAmount, 0),
      balance: rows.reduce((s, r) => s + r.balance, 0),
      paidCount: rows.filter((r) => r.status === 'paid').length,
    }),
    [rows],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Tractor className="h-4.5 w-4.5 text-meadow-600" />
            حساب الفلاحين — {session.label}
          </CardTitle>
          <CardDescription>
            تسوية مستحقات كل فلاح خلال الدورة (15 يوم). {totals.paidCount}/{rows.length} تم سدادها بالكامل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center text-[12px]">
            <div className="rounded-lg bg-canvas-sunken/60 px-2 py-2">
              <p className="text-muted-foreground">إجمالي الاستلام</p>
              <Money value={totals.value} decimals={0} className="font-semibold" />
            </div>
            <div className="rounded-lg bg-meadow-50 px-2 py-2">
              <p className="text-muted-foreground">المدفوع</p>
              <Money value={totals.paid} decimals={0} className="font-semibold text-meadow-700" />
            </div>
            <div className="rounded-lg bg-rose-50/80 px-2 py-2">
              <p className="text-muted-foreground">المتبقي</p>
              <Money value={totals.balance} decimals={0} className="font-semibold text-rose-700" />
            </div>
          </div>

          {rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفلاح</TableHead>
                  <TableHead className="text-left">الكمية</TableHead>
                  <TableHead className="text-left">القيمة</TableHead>
                  <TableHead className="text-left">المدفوع</TableHead>
                  <TableHead className="text-left">المتبقي</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  {!readonly ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const st = STATUS_BADGE[r.status];
                  return (
                    <TableRow key={r.farmerId}>
                      <TableCell>
                        <p className="text-[13px] font-medium">{r.fullName}</p>
                        <p className="font-mono text-[10.5px] text-muted-foreground" dir="ltr">{r.code}</p>
                      </TableCell>
                      <TableCell className="text-left">
                        <Liters value={r.suppliedQty} className="text-[12px]" />
                        {r.sampleQty > 0 ? (
                          <span className="block text-[10px] text-muted-foreground">عينة {r.sampleQty} ل</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-left"><Money value={r.suppliedValue} className="text-[12.5px]" /></TableCell>
                      <TableCell className="text-left"><Money value={r.paidAmount} className="text-[12.5px] text-meadow-700" /></TableCell>
                      <TableCell className="text-left"><Money value={r.balance} className="text-[12.5px] font-semibold" /></TableCell>
                      <TableCell className="text-center">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      {!readonly ? (
                        <TableCell>
                          {r.balance > 0.01 ? (
                            <Button size="sm" variant="outline" onClick={() => setPayFarmer(r)}>
                              <Banknote className="h-3.5 w-3.5" />
                              دفع
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-[13px] text-muted-foreground">لا عمليات استلام مسجّلة في هذه الدورة.</p>
          )}
        </CardContent>
      </Card>

      {payFarmer ? (
        <PaymentDialog
          open={Boolean(payFarmer)}
          onOpenChange={(o) => !o && setPayFarmer(null)}
          kind="farmer"
          partyId={payFarmer.farmerId}
          partyName={payFarmer.fullName}
          outstanding={payFarmer.balance}
          defaultAmount={payFarmer.balance}
          settlementDefault={payFarmer.balance <= payFarmer.suppliedValue + 0.01}
        />
      ) : null}
    </>
  );
}
