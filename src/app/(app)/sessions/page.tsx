'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarRange, Lock, Archive, CheckCircle2, TrendingUp, Droplets, ShoppingCart, ArrowRight, Repeat2, GitCompareArrows, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatTile } from '@/components/shared/stat-tile';
import { Money, Liters } from '@/components/shared/money';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { SessionClosingPDF } from '@/features/pdf/SessionClosingPDF';
import { FarmerCycleSettlement } from '@/components/farmers/farmer-cycle-settlement';
import { CustomerCycleSettlement } from '@/components/customers/customer-cycle-settlement';
import { CarryForwardBanner } from '@/components/sessions/carry-forward-banner';
import { CreateSessionDialog } from '@/components/sessions/create-session-dialog';
import { buildSessionCarryForwardSnapshot } from '@/lib/domain/calculations';
import { buildSessionClosingReportProps } from '@/lib/domain/session-closing-report';
import { resolveAdjustmentReasonKind } from '@/lib/domain/constants';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { useCycle } from '@/lib/store/use-cycle';
import { usePermission } from '@/lib/store/use-permission';
import type { SessionSummary } from '@/lib/domain/calculations';
import type { Session } from '@/lib/domain/types';
import { cn, formatNumber, formatShortDate as formatDate } from '@/lib/utils';

export default function SessionsPage() {
  const data = useErpData();
  const d = useDerived();
  const closeActiveSession = useErpStore((s) => s.closeActiveSession);
  const deleteSession = useErpStore((s) => s.deleteSession);
  const setActiveSession = useErpStore((s) => s.setActiveSession);
  const canClose = usePermission('sessions.close');
  const cycle = useCycle();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  const active = d.activeSession;
  const summary = d.activeSummary;

  const calendarMismatch = useMemo(() => {
    if (!active || active.status !== 'open') return false;
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return (
      active.periodFrom !== fmt(cycle.window.from) ||
      active.periodTo !== fmt(cycle.window.to)
    );
  }, [active, cycle.window]);

  const wasteThisCycle = useMemo(() => {
    if (!active) return { qty: 0, value: 0 };
    let qty = 0;
    let value = 0;
    for (const a of data.adjustments) {
      if (a.sessionId !== active.id || a.quantity >= 0) continue;
      const kind = a.reasonKind ?? resolveAdjustmentReasonKind(a.reason, a.quantity);
      if (kind !== 'loss') continue;
      const abs = Math.abs(a.quantity);
      qty += abs;
      value += abs * a.unitCost;
    }
    return { qty: Math.round(qty), value: Math.round(value) };
  }, [active, data.adjustments]);

  const currentStock = d.totals.currentStock;

  const closePreview = useMemo(() => {
    if (!active) return null;
    return buildSessionCarryForwardSnapshot(
      {
        sessions: data.sessions,
        activeSessionId: data.activeSessionId,
        farmers: data.farmers,
        customers: data.customers,
        employees: data.employees,
        supplies: data.supplies,
        sales: data.sales,
        payments: data.payments,
        debtEntries: data.debtEntries,
        adjustments: data.adjustments,
        expenses: data.expenses,
        payrollBatches: data.payrollBatches,
        vaults: data.vaults,
        banks: data.banks,
        cashMovements: data.cashMovements,
        externalIncomes: data.externalIncomes,
        settings: data.settings,
      },
      active,
      currentStock,
    );
  }, [active, data, currentStock]);

  const sortedSessions = [...data.sessions].sort((a, b) => b.periodFrom.localeCompare(a.periodFrom));

  function buildClosingProps(session: Session, sum: SessionSummary) {
    return buildSessionClosingReportProps(
      {
        sessions: data.sessions,
        activeSessionId: data.activeSessionId,
        farmers: data.farmers,
        customers: data.customers,
        employees: data.employees,
        supplies: data.supplies,
        sales: data.sales,
        payments: data.payments,
        debtEntries: data.debtEntries,
        adjustments: data.adjustments,
        expenses: data.expenses,
        payrollBatches: data.payrollBatches,
        vaults: data.vaults,
        banks: data.banks,
        cashMovements: data.cashMovements,
        externalIncomes: data.externalIncomes,
        settings: data.settings,
      },
      session,
      sum,
    );
  }

  async function doClose() {
    setClosing(true);
    try {
      const res = await closeActiveSession();
      if (res.ok) {
        toast.success('تم إغلاق الفترة', {
          description: 'أُرشِفَت الدورة السابقة وفُتحت دورة جديدة مع ترحيل المخزون والأرصدة.',
        });
        setConfirmOpen(false);
      } else {
        toast.error(res.error ?? 'تعذّر إغلاق الفترة');
      }
    } finally {
      setClosing(false);
    }
  }

  async function doDeleteSession() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteSession(deleteTarget.id);
      if (res.ok) {
        toast.success('تم حذف الدورة', { description: deleteTarget.label });
        setDeleteTarget(null);
      } else {
        toast.error(res.error ?? 'تعذّر حذف الدورة');
      }
    } finally {
      setDeleting(false);
    }
  }

  function sessionMovementCount(sessionId: string) {
    return (
      data.supplies.filter((s) => s.sessionId === sessionId).length +
      data.sales.filter((s) => s.sessionId === sessionId).length +
      data.payments.filter((p) => p.sessionId === sessionId).length +
      data.expenses.filter((e) => e.sessionId === sessionId).length +
      data.adjustments.filter((a) => a.sessionId === sessionId).length +
      data.debtEntries.filter((d) => d.sessionId === sessionId).length
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="الدورات نصف الشهرية"
        description="الشهر دورتان (1→15 و16→نهاية الشهر) — إغلاق ذرّي، أرشفة، وترحيل المخزون والأرصدة تلقائياً."
        actions={
          canClose ? (
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
              <CalendarRange className="h-4 w-4" />
              إنشاء دورة سابقة
            </Button>
          ) : undefined
        }
      />

      {calendarMismatch && active && (
        <div
          role="status"
          className="rounded-xl border border-sun-200 bg-sun-50/80 px-4 py-3 text-[13px] text-sun-900"
        >
          الدورة النشطة «{active.label}» ({formatDate(active.periodFrom)} — {formatDate(active.periodTo)})
          تختلف عن تقويم اليوم «{cycle.window.label}» — إحصاءات البطاقة اليسرى حسب التقويم وليست الدورة المفتوحة.
        </div>
      )}

      {/* الدورة نصف الشهرية الحالية */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Repeat2 className="h-4.5 w-4.5 text-meadow-600" />
              {cycle.window.label}
            </CardTitle>
            <CardDescription>
              {formatDate(cycle.window.from.toISOString())} — {formatDate(cycle.window.to.toISOString())}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">تقدّم الدورة</span>
              <span className="font-semibold">اليوم {cycle.progress.daysElapsed} من {cycle.progress.daysTotal}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-canvas-sunken">
              <div className="h-full rounded-full bg-meadow-500" style={{ width: `${cycle.progress.pct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[12.5px]">
              <div className="rounded-lg bg-canvas-sunken/60 px-2.5 py-2">
                <p className="text-muted-foreground">مورّد</p>
                <Liters value={cycle.stats.supplied} className="font-semibold" />
              </div>
              <div className="rounded-lg bg-canvas-sunken/60 px-2.5 py-2">
                <p className="text-muted-foreground">مباع</p>
                <Liters value={cycle.stats.sold} className="font-semibold" />
              </div>
              <div className="rounded-lg bg-canvas-sunken/60 px-2.5 py-2">
                <p className="text-muted-foreground">مجمل الربح</p>
                <Money value={cycle.stats.grossProfit} decimals={0} className="font-semibold text-meadow-700" />
              </div>
              <div className="rounded-lg bg-canvas-sunken/60 px-2.5 py-2">
                <p className="text-muted-foreground">ديون الفلاحين</p>
                <Money value={cycle.stats.payoutsDue} decimals={0} className="font-semibold" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* مقارنة الدورتين */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <GitCompareArrows className="h-4.5 w-4.5 text-muted-foreground" />
              مقارنة دورتي الشهر
            </CardTitle>
            <CardDescription>الدورة الأولى مقابل الثانية والفروقات</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المؤشر</TableHead>
                  <TableHead className="text-left">الأولى</TableHead>
                  <TableHead className="text-left">الثانية</TableHead>
                  <TableHead className="text-left">الفرق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycle.comparison.map((row) => (
                  <TableRow key={row.metric}>
                    <TableCell className="text-[12.5px] font-medium">{row.metric}</TableCell>
                    <TableCell className="text-left">{row.kind === 'money' ? <Money value={row.cycle1} decimals={0} /> : <Liters value={row.cycle1} />}</TableCell>
                    <TableCell className="text-left">{row.kind === 'money' ? <Money value={row.cycle2} decimals={0} /> : <Liters value={row.cycle2} />}</TableCell>
                    <TableCell className="text-left">
                      <span className={cn('text-[12px] font-semibold', row.variance > 0 ? 'text-meadow-700' : row.variance < 0 ? 'text-rose-600' : 'text-muted-foreground')} dir="ltr">
                        {row.variance > 0 ? '+' : ''}{formatNumber(row.variance, 0)}
                        {row.variancePct !== 0 ? ` (${row.variancePct > 0 ? '+' : ''}${row.variancePct}%)` : ''}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* الفترة النشطة */}
      {active ? (
        <Card className="overflow-hidden border-meadow-200">
          <CardHeader className="flex-col gap-3 border-b border-border bg-meadow-50/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-meadow-600" />
                <CardTitle>{active.label}</CardTitle>
                <Badge variant={active.status === 'open' ? 'success' : 'neutral'}>
                  {active.status === 'open' ? 'نشطة' : 'مؤرشفة'}
                </Badge>
              </div>
              <CardDescription>
                {formatDate(active.periodFrom)} — {formatDate(active.periodTo)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TurkiPdfToolbar
                fileName={`اغلاق-فترة-${active.label}`}
                label="معاينة تقرير الإغلاق"
                variant="secondary"
                render={async () => <SessionClosingPDF {...buildClosingProps(active, summary)} />}
              />
              {canClose && active.status === 'open' ? (
                <Button onClick={() => setConfirmOpen(true)}>
                  <Lock className="h-4 w-4" />
                  إغلاق الفترة
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-5 lg:grid-cols-4">
            <StatTile label="استلام الحليب" value={<Liters value={summary.supplyQty} />} icon={Droplets} tone="meadow" hint={`${summary.supplyCount} عملية`} />
            <StatTile label="مبيعات" value={<Money value={summary.salesRevenue} decimals={0} />} icon={ShoppingCart} tone="navy" hint={`${summary.salesCount} عملية`} />
            <StatTile label="الربح" value={<Money value={summary.grossProfit} decimals={0} />} icon={TrendingUp} tone="sun" hint={`هامش ${formatNumber(summary.marginPct, 1)}%`} />
            <StatTile label="المخزون المتبقي" value={<Liters value={currentStock} />} icon={Archive} tone="neutral" hint={`افتتاحي ${formatNumber(summary.openingStock, 0)} · يُرحَّل للدورة التالية`} />
          </CardContent>
        </Card>
      ) : null}

      {active?.carryForwardBalances ? <CarryForwardBanner carry={active.carryForwardBalances} /> : null}

      {active ? <FarmerCycleSettlement session={active} readonly={active.status === 'archived'} /> : null}
      {active ? <CustomerCycleSettlement session={active} readonly={active.status === 'archived'} /> : null}

      {/* كل الفترات */}
      <Card>
        <CardHeader>
          <CardTitle>سجلّ الفترات</CardTitle>
          <CardDescription>الفترات النشطة والمؤرشفة عبر الزمن</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedSessions.map((session) => {
            const sum = d.sessionSummaries.find((s) => s.session.id === session.id);
            const isActive = session.id === active?.id;
            const archived = session.status === 'archived';
            return (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-canvas-sunken/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${archived ? 'bg-canvas-sunken text-muted-foreground' : 'bg-meadow-100 text-meadow-700'}`}>
                    {archived ? <Archive className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-foreground">{session.label}</p>
                      {isActive ? <Badge variant="success">الحالية</Badge> : null}
                      {archived ? <Badge variant="neutral">مؤرشفة</Badge> : null}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground">
                      {formatDate(session.periodFrom)} — {formatDate(session.periodTo)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {sum ? (
                    <div className="flex items-center gap-4 text-[12px]">
                      <div className="text-center">
                        <p className="text-muted-foreground">مبيعات</p>
                        <Money value={sum.salesRevenue} decimals={0} className="font-semibold" />
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">ربح</p>
                        <Money value={sum.grossProfit} decimals={0} className="font-semibold text-meadow-700" />
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    {!isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void (async () => {
                            const res = await setActiveSession(session.id);
                            if (!res.ok) toast.error(res.error ?? 'تعذّر التفعيل');
                          })();
                        }}
                      >
                        عرض
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {archived && sum ? (
                      <TurkiPdfToolbar
                        fileName={`اغلاق-فترة-${session.label}`}
                        label="تقرير الإغلاق"
                        variant="outline"
                        showDownload={false}
                        render={async () => <SessionClosingPDF {...buildClosingProps(session, sum)} />}
                      />
                    ) : null}
                    {canClose && data.sessions.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => setDeleteTarget(session)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* تأكيد الإغلاق */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد إغلاق الفترة</DialogTitle>
            <DialogDescription>
              سيتم أرشفة فترة «{active?.label}» نهائياً، وحفظ ملخّصها وأرصدتها، ثم فتح فترة جديدة وترحيل المخزون والأرصدة إليها. لا يمكن التراجع عن هذه العملية.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl bg-canvas-sunken p-4 text-[12.5px]">
            {wasteThisCycle.qty > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">هدر مخصوم من المخزون</span>
                <span className="font-semibold text-rose-600">
                  <Liters value={wasteThisCycle.qty} /> · <Money value={wasteThisCycle.value} decimals={0} />
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">مخزون مُرحّل (المتبقي في المخزون)</span>
              <Liters value={currentStock} className="font-semibold text-meadow-700" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ديون علينا (فلاحون + خارجيون)</span>
              <Money value={closePreview?.totals.payables ?? d.totals.payables} decimals={0} className="font-semibold text-rose-700" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ديون لنا (عملاء + موظفون)</span>
              <Money value={closePreview?.totals.receivables ?? d.totals.receivables} decimals={0} className="font-semibold text-meadow-700" />
            </div>
            {closePreview ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                سيُرحَّل: {closePreview.farmers.length} فلاح، {closePreview.customers.length} عميل،{' '}
                {closePreview.employees.length} موظف، {closePreview.external.length} طرف خارجي
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={doClose} disabled={closing}>
              <Lock className="h-4 w-4" />
              {closing ? 'جارٍ الإغلاق…' : 'تأكيد الإغلاق'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>حذف الدورة</DialogTitle>
            <DialogDescription>
              سيتم حذف «{deleteTarget?.label}» وجميع حركاتها (استلام، مبيعات، مدفوعات، مصاريف، ديون…) نهائياً. لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-[12.5px] text-rose-900">
              <p>
                عدد الحركات المرتبطة: <strong>{sessionMovementCount(deleteTarget.id)}</strong>
              </p>
              {deleteTarget.id === active?.id ? (
                <p className="mt-2 text-muted-foreground">هذه الدورة نشطة حالياً — سيتم التبديل إلى دورة أخرى تلقائياً.</p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="destructive" disabled={deleting} onClick={doDeleteSession}>
              <Trash2 className="h-4 w-4" />
              {deleting ? 'جارٍ الحذف…' : 'تأكيد الحذف'}
            </Button>
            <Button type="button" variant="ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CreateSessionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

