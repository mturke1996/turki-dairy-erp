'use client';

import { useMemo, useState } from 'react';
import { Warehouse, Coins, Gauge, SlidersHorizontal, ArrowDownUp, PackagePlus, Pencil, Trash2 } from 'lucide-react';
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
import { computeDailyFlow, computeWasteSummary } from '@/lib/domain/calculations';
import { WasteLossSection } from '@/components/inventory/waste-loss-section';
import { buildInventoryLedger, sessionLedgerEntries, sessionStockFlowTotals } from '@/lib/domain/inventory';
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
  const clearSessionOpeningStock = useErpStore((s) => s.clearSessionOpeningStock);
  const deleteAdjustment = useErpStore((s) => s.deleteAdjustment);
  const deleteSupply = useErpStore((s) => s.deleteSupply);
  const deleteSale = useErpStore((s) => s.deleteSale);
  const canAdjust = usePermission('supply.record');
  const canSell = usePermission('sales.record');
  const canDeleteAdmin = usePermission('transactions.delete');
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

  function canDeleteEntry(entry: InventoryLedgerEntry) {
    if (canDeleteAdmin) return true;
    if (entry.sourceKind === 'supply' && canAdjust) return true;
    if (entry.sourceKind === 'adjustment' && canAdjust) return true;
    if (entry.sourceKind === 'sale' && canSell) return true;
    return false;
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
    if (sessionId === 'all') {
      const inQty = d.inv.entries.reduce((s, e) => s + e.quantityIn, 0);
      const outQty = d.inv.entries.reduce((s, e) => s + e.quantityOut, 0);
      return { inQty, outQty, opening: 0, closing: d.inv.currentStock };
    }
    if (!session) return { inQty: 0, outQty: 0, opening: 0, closing: 0 };
    return sessionStockFlowTotals(
      session,
      data.supplies,
      data.sales,
      data.adjustments,
      d.inv,
    );
  }, [sessionId, session, data.supplies, data.sales, data.adjustments, d.inv]);

  const flow = computeDailyFlow(sessionId, d.inv);

  const sessionAdjustments = useMemo(() => {
    const list = sessionId === 'all' ? data.adjustments : data.adjustments.filter((a) => a.sessionId === sessionId);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [data.adjustments, sessionId]);

  const wasteView = useMemo(() => {
    const targetSession = sessionId === 'all' ? null : sessionId;
    return computeWasteSummary(data.adjustments, targetSession, d.inv);
  }, [data.adjustments, sessionId, d.inv]);

  const wasteSessionId = sessionId === 'all' ? null : sessionId;
  const wasteSessionLabel =
    sessionId === 'all' ? 'كل الفترات' : (session?.label ?? 'الفترة');

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile label="المخزون الحالي" value={<Liters value={d.totals.currentStock} />} icon={Warehouse} tone="meadow" />
        <StatTile label="قيمة المخزون" value={<Money value={d.totals.inventoryValue} decimals={0} />} icon={Coins} tone="navy" />
        <StatTile label="متوسط التكلفة" value={<Money value={d.totals.wac} decimals={3} />} icon={Gauge} tone="sun" hint="للّتر الواحد" />
      </div>

      <WasteLossSection
        waste={wasteView}
        sessionLabel={wasteSessionLabel}
        sessionId={wasteSessionId}
      />

      {d.activeSession?.status === 'open' && d.activeSession.openingStock > 0 && canAdjust ? (
        <Card className="border-sun-200 bg-sun-50/40">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[13px]">
              <p className="font-medium text-sun-950">رصيد افتتاحي مسجّل للدورة الحالية</p>
              <p className="mt-1 text-muted-foreground">
                <Liters value={d.activeSession.openingStock} className="font-semibold text-foreground" />
                {' · '}
                <Money value={d.activeSession.openingAvgCost} decimals={3} className="font-semibold" />
                {' / لتر'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-rose-600 hover:text-rose-700"
              onClick={async () => {
                if (
                  !confirm(
                    `حذف الرصيد الافتتاحي (${Math.round(d.activeSession!.openingStock).toLocaleString('ar-LY')} لتر)؟ سيعود المخزون كما كان قبل هذا الإدخال.`,
                  )
                ) {
                  return;
                }
                const res = await clearSessionOpeningStock();
                if (res.ok) toast.success('تم حذف الرصيد الافتتاحي');
                else toast.error(res.error ?? 'تعذّر الحذف');
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف الرصيد الافتتاحي
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>حركة المخزون</CardTitle>
            <CardDescription>الوارد والصادر والرصيد المتحرّك</CardDescription>
          </div>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger className="w-full sm:w-52">
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
                    {s.status === 'archived' ? ' (مؤرشفة)' : ''}
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
            <>
              <div className="space-y-2.5 md:hidden">
                {entries.slice(0, 60).map((e) => {
                  const b = MOVEMENT_BADGE[e.movementType];
                  const modifiable = canModifyEntry(e);
                  const canEdit =
                    modifiable &&
                    ((e.sourceKind === 'supply' && canAdjust) ||
                      (e.sourceKind === 'sale' && canSell) ||
                      (e.sourceKind === 'adjustment' && canAdjust));
                  const showActions = modifiable && (canEdit || (e.sourceKind !== 'opening' && canDeleteEntry(e)));

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
                    <article key={e.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold">{e.label}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant={b.variant} className="text-[10px]">{b.label}</Badge>
                            <span className="text-[11px] text-muted-foreground">{formatShortDate(e.date)}</span>
                          </div>
                          <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground" dir="ltr">{e.ref}</p>
                        </div>
                        <div className="text-left">
                          <Liters value={e.balanceAfter} decimals={1} className="text-[14px] font-bold" />
                          <p className="mt-0.5 text-[10.5px] text-muted-foreground">بعد</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
                        <div>
                          <p className="text-muted-foreground">وارد</p>
                          {e.quantityIn ? (
                            <Liters value={e.quantityIn} decimals={1} className="font-semibold text-meadow-700" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">صادر</p>
                          {e.quantityOut ? (
                            <Liters value={e.quantityOut} decimals={1} className="font-semibold" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">تكلفة/ل</p>
                          <Money value={e.unitCost} decimals={3} className="font-semibold" />
                        </div>
                      </div>
                      {showActions ? (
                        <div className="mt-3 flex justify-end gap-1 border-t border-border pt-3">
                          {canEdit ? (
                            <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={openEdit} aria-label="تعديل">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                          {e.sourceKind !== 'opening' && canDeleteEntry(e) ? (
                            <RowDeleteButton label={e.ref} allowed onConfirm={confirmDelete} />
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              <div className="hidden md:block">
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
                      const showActions = modifiable && (canEdit || (e.sourceKind !== 'opening' && canDeleteEntry(e)));

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
                                {e.sourceKind !== 'opening' && canDeleteEntry(e) ? (
                                  <RowDeleteButton label={e.ref} allowed onConfirm={confirmDelete} />
                                ) : null}
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
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
            <div className="space-y-2.5 md:hidden">
              {sessionAdjustments.map((a) => {
                const modifiable = openSessionIds.has(a.sessionId);
                return (
                  <article key={a.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold">{a.reason}</p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground" dir="ltr">{a.ref}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatShortDate(a.date)}</p>
                      </div>
                      <Liters value={a.quantity} decimals={1} className="shrink-0 text-[14px] font-bold" />
                    </div>
                    {modifiable && (canAdjust || canDeleteAdmin) ? (
                      <div className="mt-3 flex justify-end gap-1 border-t border-border pt-3">
                        {canAdjust ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            onClick={() => setEditAdjustment(a)}
                            aria-label="تعديل التسوية"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {canAdjust || canDeleteAdmin ? (
                          <RowDeleteButton
                            label={a.ref}
                            allowed
                            showLabel
                            onConfirm={async () => {
                              const res = await deleteAdjustment(a.id);
                              if (res.ok) toast.success('تم حذف التسوية');
                              else toast.error(res.error ?? 'تعذّر الحذف');
                              return res;
                            }}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <div className="hidden md:block">
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
                          {(canAdjust || canDeleteAdmin) ? (
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
                          {(canAdjust || canDeleteAdmin) ? (
                            <RowDeleteButton
                              label={a.ref}
                              allowed
                              showLabel
                              onConfirm={async () => {
                                const res = await deleteAdjustment(a.id);
                                if (res.ok) toast.success('تم حذف التسوية');
                                else toast.error(res.error ?? 'تعذّر الحذف');
                                return res;
                              }}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
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
        wac={
          editAdjustment && editAdjustment.quantity < 0
            ? (d.inv.entries.find(
                (e) => e.sourceKind === 'adjustment' && e.sourceId === editAdjustment.id,
              )?.unitCost ?? d.totals.wac)
            : d.totals.wac
        }
      />
      <SupplyEditDialog open={!!editSupply} onOpenChange={(o) => !o && setEditSupply(null)} supply={editSupply} />
      <SaleEditDialog open={!!editSale} onOpenChange={(o) => !o && setEditSale(null)} sale={editSale} />
    </div>
  );
}
