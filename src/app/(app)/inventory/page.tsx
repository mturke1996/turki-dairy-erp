'use client';

import { useMemo, useState } from 'react';
import { Warehouse, Coins, Gauge, SlidersHorizontal, ArrowDownUp, PackagePlus, Pencil } from 'lucide-react';
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
import { AdjustmentEditDialog } from '@/components/inventory/adjustment-edit-dialog';
import { OpeningStockDialog } from '@/components/inventory/opening-stock-dialog';
import { SupplyEditDialog } from '@/components/supply/supply-edit-dialog';
import { SaleEditDialog } from '@/components/sales/sale-edit-dialog';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { DailyMovementPDF } from '@/features/pdf/DailyMovementPDF';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { toast } from 'sonner';
import { usePermission } from '@/lib/store/use-permission';
import { computeDailyFlow } from '@/lib/domain/calculations';
import { buildInventoryLedger, sessionLedgerEntries } from '@/lib/domain/inventory';
import { formatShortDate } from '@/lib/utils';
import { RowDeleteButton } from '@/components/shared/row-delete-button';
import type { InventoryAdjustment, InventoryLedgerEntry, SaleTransaction, SupplyTransaction } from '@/lib/domain/types';

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
  const setSessionOpeningStock = useErpStore((s) => s.setSessionOpeningStock);
  const deleteAdjustment = useErpStore((s) => s.deleteAdjustment);
  const deleteSupply = useErpStore((s) => s.deleteSupply);
  const deleteSale = useErpStore((s) => s.deleteSale);
  const canAdjust = usePermission('supply.record');
  const canSell = usePermission('sales.record');
  const [sessionId, setSessionId] = useState(() => d.activeSession?.id ?? 'all');
  const [adjOpen, setAdjOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [editAdjustment, setEditAdjustment] = useState<InventoryAdjustment | null>(null);
  const [editSupply, setEditSupply] = useState<SupplyTransaction | null>(null);
  const [editSale, setEditSale] = useState<SaleTransaction | null>(null);

  const session = data.sessions.find((s) => s.id === sessionId);
  const openSessionIds = useMemo(
    () => new Set(data.sessions.filter((s) => s.status === 'open').map((s) => s.id)),
    [data.sessions],
  );

  function canModifyEntry(entry: InventoryLedgerEntry) {
    return openSessionIds.has(entry.sessionId);
  }

  function stockBaseForAdjustment(adjId: string) {
    return buildInventoryLedger(
      data.supplies,
      data.sales,
      data.adjustments.filter((a) => a.id !== adjId),
      data.sessions,
    ).currentStock;
  }
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

  const sessionAdjustments = useMemo(() => {
    const list = sessionId === 'all' ? data.adjustments : data.adjustments.filter((a) => a.sessionId === sessionId);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [data.adjustments, sessionId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="العمليات"
        title="المخزون"
        description="دفتر حركة الحليب المركزي بنظام متوسط التكلفة المرجّح المتحرّك."
        actions={
          <>
            {d.activeSession?.status === 'open' ? (
              <Button type="button" variant="secondary" onClick={() => setOpeningOpen(true)}>
                <PackagePlus className="h-4 w-4" />
                ضبط مخزون افتتاحي
              </Button>
            ) : null}
            {canAdjust ? (
              <Button type="button" variant="outline" onClick={() => setAdjOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" />
                تسوية مخزون
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile label="المخزون الحالي" value={<Liters value={d.totals.currentStock} />} icon={Warehouse} tone="meadow" />
        <StatTile label="قيمة المخزون" value={<Money value={d.totals.inventoryValue} decimals={0} />} icon={Coins} tone="navy" />
        <StatTile label="متوسط التكلفة" value={<Money value={d.totals.wac} decimals={3} />} icon={Gauge} tone="sun" hint="للّتر الواحد" />
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
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 60).map((e) => {
                  const b = MOVEMENT_BADGE[e.movementType];
                  const modifiable = canModifyEntry(e);
                  const canEdit =
                    modifiable &&
                    ((e.sourceKind === 'supply' && canAdjust) ||
                      (e.sourceKind === 'sale' && canSell) ||
                      (e.sourceKind === 'adjustment' && canAdjust));
                  const showActions = modifiable && (canEdit || e.sourceKind !== 'opening');

                  function openEdit() {
                    if (e.sourceKind === 'supply') {
                      const tx = data.supplies.find((s) => s.id === e.sourceId);
                      if (tx) setEditSupply(tx);
                    } else if (e.sourceKind === 'sale') {
                      const tx = data.sales.find((s) => s.id === e.sourceId);
                      if (tx) setEditSale(tx);
                    } else if (e.sourceKind === 'adjustment') {
                      const tx = data.adjustments.find((a) => a.id === e.sourceId);
                      if (tx) setEditAdjustment(tx);
                    }
                  }

                  async function confirmDelete() {
                    if (e.sourceKind === 'supply') {
                      const res = await deleteSupply(e.sourceId);
                      if (res.ok) toast.success('تم حذف الاستلام');
                      else toast.error(res.error ?? 'تعذّر الحذف');
                      return res;
                    }
                    if (e.sourceKind === 'sale') {
                      const res = await deleteSale(e.sourceId);
                      if (res.ok) toast.success('تم حذف البيع');
                      else toast.error(res.error ?? 'تعذّر الحذف');
                      return res;
                    }
                    if (e.sourceKind === 'adjustment') {
                      const res = await deleteAdjustment(e.sourceId);
                      if (res.ok) toast.success('تم حذف التسوية');
                      else toast.error(res.error ?? 'تعذّر الحذف');
                      return res;
                    }
                    return { ok: false, error: 'لا يمكن حذف هذا النوع من الحركات.' };
                  }

                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-[12.5px]">{formatShortDate(e.date)}</TableCell>
                      <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">{e.ref}</TableCell>
                      <TableCell className="text-center"><Badge variant={b.variant}>{b.label}</Badge></TableCell>
                      <TableCell className="text-left">{e.quantityIn ? <Liters value={e.quantityIn} decimals={1} className="text-[12px] text-meadow-700" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-left">{e.quantityOut ? <Liters value={e.quantityOut} decimals={1} className="text-[12px]" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-left"><Money value={e.unitCost} decimals={3} className="text-[12px]" muted /></TableCell>
                      <TableCell className="text-left"><Liters value={e.balanceAfter} decimals={1} className="text-[12.5px] font-semibold" /></TableCell>
                      <TableCell>
                        {showActions ? (
                          <div className="flex justify-end gap-1">
                            {canEdit ? (
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={openEdit} aria-label="تعديل">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                            {e.sourceKind !== 'opening' ? (
                              <RowDeleteButton label={e.ref} onConfirm={confirmDelete} />
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>
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

      {sessionAdjustments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">تسويات المخزون</CardTitle>
            <CardDescription>تعديلات يدوية على الرصيد — يمكن تعديلها أو حذفها</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>السبب</TableHead>
                  <TableHead className="text-left">الكمية</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionAdjustments.map((a) => {
                  const modifiable = openSessionIds.has(a.sessionId);
                  return (
                  <TableRow key={a.id}>
                    <TableCell className="text-[12px]">{formatShortDate(a.date)}</TableCell>
                    <TableCell className="font-mono text-[11px]" dir="ltr">{a.ref}</TableCell>
                    <TableCell className="text-[12px]">{a.reason}</TableCell>
                    <TableCell className="text-left"><Liters value={a.quantity} decimals={1} className="text-[12px]" /></TableCell>
                    <TableCell>
                      {modifiable ? (
                        <div className="flex justify-end gap-1">
                          {canAdjust ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setEditAdjustment(a)}
                              aria-label="تعديل التسوية"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                          <RowDeleteButton
                            label={a.ref}
                            onConfirm={async () => {
                              const res = await deleteAdjustment(a.id);
                              if (res.ok) toast.success('تم حذف التسوية');
                              else toast.error(res.error ?? 'تعذّر الحذف');
                              return res;
                            }}
                          />
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <OpeningStockDialog
        open={openingOpen}
        onOpenChange={setOpeningOpen}
        sessionLabel={d.activeSession?.label ?? ''}
        periodFrom={d.activeSession?.periodFrom ?? ''}
        currentStock={d.totals.currentStock}
        currentWac={d.totals.wac}
        sessionOpening={d.activeSession?.openingStock ?? 0}
        onSubmit={async (input) => {
          const res = await setSessionOpeningStock(input);
          if (res.ok) toast.success('تم ضبط المخزون الافتتاحي');
          else toast.error(res.error ?? 'تعذّر الحفظ');
          return res;
        }}
      />

      <AdjustmentDialog open={adjOpen} onOpenChange={setAdjOpen} currentStock={d.totals.currentStock} wac={d.totals.wac} />

      <AdjustmentEditDialog
        open={!!editAdjustment}
        onOpenChange={(o) => !o && setEditAdjustment(null)}
        adjustment={editAdjustment}
        stockBase={editAdjustment ? stockBaseForAdjustment(editAdjustment.id) : d.totals.currentStock}
      />
      <SupplyEditDialog open={!!editSupply} onOpenChange={(o) => !o && setEditSupply(null)} supply={editSupply} />
      <SaleEditDialog open={!!editSale} onOpenChange={(o) => !o && setEditSale(null)} sale={editSale} />
    </div>
  );
}
