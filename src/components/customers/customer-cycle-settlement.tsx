'use client';

import { useMemo, useState } from 'react';
import { Banknote, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money, Liters } from '@/components/shared/money';
import { PaymentDialog } from '@/components/forms/payment-dialog';
import { allCustomerSessionStats, type CustomerSessionStats } from '@/lib/domain/calculations';
import { useErpData } from '@/lib/store/use-derived';
import type { Session } from '@/lib/domain/types';

const STATUS_BADGE = {
  paid: { label: 'مسدّد', variant: 'success' as const },
  partial: { label: 'جزئي', variant: 'warning' as const },
  pending: { label: 'مستحق', variant: 'danger' as const },
  none: { label: '—', variant: 'neutral' as const },
};

export function CustomerCycleSettlement({ session, readonly }: { session: Session; readonly?: boolean }) {
  const data = useErpData();
  const [payCustomer, setPayCustomer] = useState<CustomerSessionStats | null>(null);

  const rows = useMemo(() => {
    const archived = session.archive?.balancesSnapshot?.customers;
    if (archived?.length && session.status === 'archived') {
      return archived.map((c) => {
        const customer = data.customers.find((x) => x.id === c.id);
        const carriedForward = c.carriedForward ?? 0;
        const soldValue = c.soldValue ?? 0;
        const receivedAmount = c.receivedAmount ?? 0;
        const obligation = carriedForward + soldValue;
        const status = (c.status ??
          (c.balance <= 0.01 ? 'paid' : obligation > 0.01 ? 'pending' : 'none')) as CustomerSessionStats['status'];
        return {
          customerId: c.id,
          sessionId: session.id,
          entityName: c.name,
          code: customer?.code ?? '—',
          carriedForward,
          soldQty: 0,
          soldValue,
          receivedAmount,
          balance: c.balance,
          status,
          saleCount: soldValue > 0.01 ? 1 : 0,
          paymentCount: receivedAmount > 0.01 ? 1 : 0,
        } satisfies CustomerSessionStats;
      });
    }
    return allCustomerSessionStats(data, session);
  }, [data, session]);

  const totals = useMemo(
    () => ({
      sold: rows.reduce((s, r) => s + r.soldValue, 0),
      received: rows.reduce((s, r) => s + r.receivedAmount, 0),
      balance: rows.reduce((s, r) => s + r.balance, 0),
      carried: rows.reduce((s, r) => s + r.carriedForward, 0),
    }),
    [rows],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Building2 className="h-4.5 w-4.5 text-navy-600" />
            حساب العملاء — {session.label}
          </CardTitle>
          <CardDescription>
            ذمم العملاء في الدورة — يشمل الأرصدة المُرحّلة من الدورة السابقة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2 text-center text-[12px] sm:grid-cols-4">
            <div className="rounded-lg bg-canvas-sunken/60 px-2 py-2">
              <p className="text-muted-foreground">مرحّل</p>
              <Money value={totals.carried} decimals={0} className="font-semibold text-sun-700" />
            </div>
            <div className="rounded-lg bg-canvas-sunken/60 px-2 py-2">
              <p className="text-muted-foreground">مبيعات الدورة</p>
              <Money value={totals.sold} decimals={0} className="font-semibold" />
            </div>
            <div className="rounded-lg bg-meadow-50 px-2 py-2">
              <p className="text-muted-foreground">المحصّل</p>
              <Money value={totals.received} decimals={0} className="font-semibold text-meadow-700" />
            </div>
            <div className="rounded-lg bg-navy-50/80 px-2 py-2">
              <p className="text-muted-foreground">المتبقي</p>
              <Money value={totals.balance} decimals={0} className="font-semibold text-navy-800" />
            </div>
          </div>

          {rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead className="text-left">مرحّل</TableHead>
                  <TableHead className="text-left">مبيعات</TableHead>
                  <TableHead className="text-left">محصّل</TableHead>
                  <TableHead className="text-left">المتبقي</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  {!readonly ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const st = STATUS_BADGE[r.status];
                  return (
                    <TableRow key={r.customerId}>
                      <TableCell>
                        <p className="text-[13px] font-medium">{r.entityName}</p>
                        <p className="font-mono text-[10.5px] text-muted-foreground" dir="ltr">{r.code}</p>
                      </TableCell>
                      <TableCell className="text-left">
                        {r.carriedForward > 0.01 ? (
                          <Money value={r.carriedForward} className="text-[12px] text-sun-700" />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <Money value={r.soldValue} className="text-[12.5px]" />
                        {r.soldQty > 0 ? (
                          <Liters value={r.soldQty} className="block text-[10px] text-muted-foreground" />
                        ) : null}
                      </TableCell>
                      <TableCell className="text-left">
                        <Money value={r.receivedAmount} className="text-[12.5px] text-meadow-700" />
                      </TableCell>
                      <TableCell className="text-left">
                        <Money value={r.balance} className="text-[12.5px] font-semibold" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      {!readonly ? (
                        <TableCell>
                          {r.balance > 0.01 ? (
                            <Button size="sm" variant="outline" onClick={() => setPayCustomer(r)}>
                              <Banknote className="h-3.5 w-3.5" />
                              تحصيل
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
            <p className="py-6 text-center text-[13px] text-muted-foreground">لا مبيعات أو ذمم في هذه الدورة.</p>
          )}
        </CardContent>
      </Card>

      {payCustomer ? (
        <PaymentDialog
          open={Boolean(payCustomer)}
          onOpenChange={(o) => !o && setPayCustomer(null)}
          kind="customer"
          partyId={payCustomer.customerId}
          partyName={payCustomer.entityName}
          outstanding={payCustomer.balance}
          defaultAmount={payCustomer.balance}
        />
      ) : null}
    </>
  );
}
