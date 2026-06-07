'use client';

import { useMemo, useState } from 'react';
import { Warehouse, Coins, Gauge, SlidersHorizontal, ArrowDownUp, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatTile } from '@/components/shared/stat-tile';
import { Money, Liters } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { FlowChart } from '@/components/dashboard/flow-chart';
import { AdjustmentDialog } from '@/components/inventory/adjustment-dialog';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { DailyMovementPDF } from '@/features/pdf/DailyMovementPDF';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { computeDailyFlow } from '@/lib/domain/calculations';
import { sessionLedgerEntries } from '@/lib/domain/inventory';
import { formatShortDate, formatNumber } from '@/lib/utils';

const MOVEMENT_BADGE = {
  IN: { variant: 'success' as const, label: 'وارد' },
  OUT: { variant: 'info' as const, label: 'صادر' },
  ADJUSTMENT: { variant: 'warning' as const, label: 'تسوية' },
  OPENING: { variant: 'neutral' as const, label: 'افتتاحي' },
  CARRY_FORWARD: { variant: 'neutral' as const, label: 'مرحّل' },
};

export default function InventoryPage() {
  const data = useErpData();
  const d = useDerived();
  const minThreshold = useErpStore((s) => s.settings.minStockThreshold);
  const canAdjust = usePermission('supply.record');
  const [sessionId, setSessionId] = useState(() => d.activeSession?.id ?? 'all');
  const [adjOpen, setAdjOpen] = useState(false);

  const session = data.sessions.find((s) => s.id === sessionId);
  const entries = useMemo(() => {
    if (sessionId === 'all') return [...d.inv.entries].sort((a, b) => b.date.localeCompare(a.date));
    if (!session) return [];
    return sessionLedgerEntries(session, d.inv.entries);
  }, [d.inv.entries, sessionId, session]);

  const totals = useMemo(() => {
    const list = sessionId === 'all' ? d.inv.entries : d.inv.entries.filter((e) => e.sessionId === sessionId);
    const inQty = list.reduce((s, e) => s + e.quantityIn, 0);
    const outQty = list.reduce((s, e) => s + e.quantityOut, 0);
    const opening = sessionId === 'all' ? 0 : session?.openingStock ?? 0;
    return { inQty, outQty, opening, closing: opening + inQty - outQty };
  }, [d.inv.entries, sessionId, session]);

  const flow = computeDailyFlow(sessionId, d.inv);
  const belowMin = d.totals.currentStock < minThreshold;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="العمليات"
        title="المخزون"
        description="دفتر حركة الحليب المركزي بنظام متوسط التكلفة المرجّح المتحرّك."
        actions={
          canAdjust ? (
            <Button variant="outline" onClick={() => setAdjOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              تسوية مخزون
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="المخزون الحالي"
          value={<Liters value={d.totals.currentStock} />}
          icon={Warehouse}
          tone={belowMin ? 'rose' : 'meadow'}
          hint={belowMin ? `دون الحد الأدنى (${formatNumber(minThreshold, 0)})` : 'ضمن الحد الآمن'}
        />
        <StatTile label="قيمة المخزون" value={<Money value={d.totals.inventoryValue} decimals={0} />} icon={Coins} tone="navy" />
        <StatTile label="متوسط التكلفة" value={<Money value={d.totals.wac} decimals={3} />} icon={Gauge} tone="sun" hint="للّتر الواحد" />
        <StatTile label="الحد الأدنى" value={<Liters value={minThreshold} />} icon={AlertTriangle} tone="neutral" hint="عتبة التنبيه" />
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>حركة المخزون</CardTitle>
            <CardDescription>الوارد والصادر والرصيد المتحرّك</CardDescription>
          </div>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفترات</SelectItem>
              {data.sessions
                .slice()
                .sort((a, b) => b.periodFrom.localeCompare(a.periodFrom))
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {flow.length ? (
            <FlowChart data={flow} />
          ) : (
            <EmptyState icon={Warehouse} title="لا حركة في هذه الفترة" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownUp className="h-4.5 w-4.5 text-muted-foreground" />
              دفتر الحركة
            </CardTitle>
            <CardDescription>
              {sessionId === 'all' ? 'جميع الفترات' : session?.label} · {entries.length} حركة
            </CardDescription>
          </div>
          {session ? (
            <TurkiPdfToolbar
              fileName={`حركة-المخزون-${session.label}`}
              label="تقرير الحركة PDF"
              variant="secondary"
              render={async () => (
                <DailyMovementPDF
                  entries={entries}
                  sessionLabel={session.label}
                  openingStock={totals.opening}
                  totals={{ inQty: totals.inQty, outQty: totals.outQty, closing: totals.closing }}
                />
              )}
            />
          ) : null}
        </CardHeader>
        <CardContent>
          {entries.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead className="text-center">النوع</TableHead>
                  <TableHead className="text-left">وارد</TableHead>
                  <TableHead className="text-left">صادر</TableHead>
                  <TableHead className="text-left">التكلفة</TableHead>
                  <TableHead className="text-left">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 60).map((e) => {
                  const b = MOVEMENT_BADGE[e.movementType];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-[12.5px]">{formatShortDate(e.date)}</TableCell>
                      <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">{e.ref}</TableCell>
                      <TableCell className="text-center"><Badge variant={b.variant}>{b.label}</Badge></TableCell>
                      <TableCell className="text-left">{e.quantityIn ? <Liters value={e.quantityIn} decimals={1} className="text-[12px] text-meadow-700" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-left">{e.quantityOut ? <Liters value={e.quantityOut} decimals={1} className="text-[12px]" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-left"><Money value={e.unitCost} decimals={3} className="text-[12px]" muted /></TableCell>
                      <TableCell className="text-left"><Liters value={e.balanceAfter} decimals={1} className="text-[12.5px] font-semibold" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Warehouse} title="لا حركات مخزون" description="ستظهر الحركات تلقائياً مع استلام الحليب والبيع." />
          )}
        </CardContent>
      </Card>

      <AdjustmentDialog open={adjOpen} onOpenChange={setAdjOpen} currentStock={d.totals.currentStock} wac={d.totals.wac} />
    </div>
  );
}
