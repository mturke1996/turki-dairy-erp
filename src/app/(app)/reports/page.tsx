'use client';

import { useMemo, useState } from 'react';
import {
  Scale,
  TrendingUp,
  Wallet,
  Coins,
  Droplets,
  ShoppingCart,
  CalendarRange,
  Warehouse,
  BarChart3,
  Users,
  Tractor,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatTile } from '@/components/shared/stat-tile';
import { Money, Liters } from '@/components/shared/money';
import { ProfitInventoryCard } from '@/components/shared/profit-inventory-card';
import { EmptyState } from '@/components/shared/empty-state';
import { NetPositionCard } from '@/components/dashboard/net-position-card';
import {
  ReportAgingBar,
  ReportMobileCard,
  ReportPnlRow,
  ReportPnlTotal,
  ReportStatusBadge,
} from '@/components/reports/report-ui';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { FinancialReportPDF } from '@/features/pdf/FinancialReportPDF';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { usePermission } from '@/lib/store/use-permission';
import { buildTrialBalance, computePnL } from '@/lib/domain/accounting';
import { computeAging, type SessionSummary } from '@/lib/domain/calculations';
import { ACCOUNT_LABELS } from '@/lib/domain/constants';
import { cn, formatNumber, formatShortDate } from '@/lib/utils';
import type { TransactionKind } from '@/lib/domain/types';

const KIND_LABEL: Record<TransactionKind, string> = {
  supply: 'استلام حليب',
  sale: 'بيع',
  farmer_payment: 'دفعة فلاح',
  customer_payment: 'تحصيل عميل',
  employee_advance: 'سلفة موظف',
  adjustment: 'تسوية',
  expense: 'مصروف',
  payroll: 'رواتب',
  debt: 'دين / تسوية',
  external_income: 'مدخول خارجي',
};

const AGING_BUCKETS = [
  { key: 'current' as const, label: 'غير مستحق', tone: 'meadow' as const },
  { key: 'd1_30' as const, label: '1–30 يوم', tone: 'navy' as const },
  { key: 'd31_60' as const, label: '31–60 يوم', tone: 'sun' as const },
  { key: 'd61_90' as const, label: '61–90 يوم', tone: 'sun' as const },
  { key: 'd90_plus' as const, label: 'أكثر من 90 يوم', tone: 'rose' as const },
];

function pnlFromSummaries(summaries: SessionSummary[]) {
  return computePnL(
    summaries.reduce((s, x) => s + x.salesRevenue, 0),
    summaries.reduce((s, x) => s + x.cogs, 0),
    {
      wasteLosses: summaries.reduce((s, x) => s + x.wasteLosses, 0),
      operatingExpenses: summaries.reduce((s, x) => s + x.operatingExpenses, 0),
      salaries: summaries.reduce((s, x) => s + x.salaries, 0),
    },
    summaries.reduce((s, x) => s + x.externalIncome, 0),
  );
}

export default function ReportsPage() {
  const data = useErpData();
  const d = useDerived();
  const canFinancial = usePermission('reports.financial');
  const [periodId, setPeriodId] = useState(() => d.activeSession?.id ?? 'all');

  const periodLabel = useMemo(() => {
    if (periodId === 'all') return 'تراكمي — كل الدورات';
    return data.sessions.find((s) => s.id === periodId)?.label ?? 'دورة محددة';
  }, [periodId, data.sessions]);

  const scopedSummaries = useMemo(() => {
    if (periodId === 'all') return d.sessionSummaries;
    const one = d.sessionSummaries.find((s) => s.session.id === periodId);
    return one ? [one] : [];
  }, [periodId, d.sessionSummaries]);

  const pnl = useMemo(() => pnlFromSummaries(scopedSummaries), [scopedSummaries]);
  const operational = scopedSummaries.length === 1 ? scopedSummaries[0] : null;

  const avgSellPrice = useMemo(() => {
    const qty = d.sessionSummaries.reduce((acc, x) => acc + x.salesQty, 0);
    const revenue = d.sessionSummaries.reduce((acc, x) => acc + x.salesRevenue, 0);
    return qty > 0 ? revenue / qty : data.settings.defaultSellPrice;
  }, [d.sessionSummaries, data.settings.defaultSellPrice]);

  const trialBalance = useMemo(() => {
    const journals =
      periodId === 'all' ? d.journals : d.journals.filter((j) => j.sessionId === periodId);
    return buildTrialBalance(journals);
  }, [periodId, d.journals]);

  const aging = useMemo(() => {
    const total = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    for (const c of d.customers) {
      const cs = data.sales.filter((s) => s.customerId === c.id);
      const a = computeAging(cs, c.receivedTotal);
      total.current += a.current;
      total.d1_30 += a.d1_30;
      total.d31_60 += a.d31_60;
      total.d61_90 += a.d61_90;
      total.d90_plus += a.d90_plus;
    }
    return total;
  }, [d.customers, data.sales]);

  const agingTotal =
    aging.current + aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d90_plus;

  const topDebtors = useMemo(
    () =>
      [...d.customers]
        .filter((c) => c.outstanding > 0.01)
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 8),
    [d.customers],
  );

  const recentJournals = useMemo(() => {
    const list =
      periodId === 'all' ? d.journals : d.journals.filter((j) => j.sessionId === periodId);
    return [...list].reverse().slice(0, 40);
  }, [periodId, d.journals]);

  const cumulativeOps = useMemo(() => {
    if (operational) return null;
    return scopedSummaries.reduce(
      (acc, s) => ({
        supplyQty: acc.supplyQty + s.supplyQty,
        supplyCost: acc.supplyCost + s.supplyCost,
        salesQty: acc.salesQty + s.salesQty,
        salesRevenue: acc.salesRevenue + s.salesRevenue,
        farmerPayments: acc.farmerPayments + s.farmerPayments,
        customerReceipts: acc.customerReceipts + s.customerReceipts,
        wasteLosses: acc.wasteLosses + s.wasteLosses,
      }),
      {
        supplyQty: 0,
        supplyCost: 0,
        salesQty: 0,
        salesRevenue: 0,
        farmerPayments: 0,
        customerReceipts: 0,
        wasteLosses: 0,
      },
    );
  }, [operational, scopedSummaries]);

  if (!canFinancial) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <PageHeader eyebrow="النظام" title="التقارير" description="التحليلات المالية والمحاسبية." />
        <EmptyState icon={Scale} title="صلاحية غير كافية" description="هذه التقارير متاحة للمدير والمحاسب والمشاهد فقط." />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="التقارير"
        description="ملخص تشغيلي ومالي للدورة أو تراكمي — ميزان مراجعة، قائمة دخل، أعمار ديون، ودفتر يومية."
        actions={
          <TurkiPdfToolbar
            fileName="القوائم-المالية"
            label="القوائم المالية PDF"
            render={async () => (
              <FinancialReportPDF
                trialBalance={trialBalance}
                pnl={pnl}
                aging={aging}
                asOfLabel={periodLabel}
              />
            )}
          />
        }
      />

      <Card className="border-navy-100/70 bg-gradient-to-br from-card via-card to-navy-50/25">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 text-right">
            <p className="text-[12px] font-semibold text-navy-800">نطاق التقرير</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
              القوائم المالية والقيود تتبع الدورة المختارة. أعمار الديون والمركز المالي لحظة حالية.
            </p>
          </div>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-full sm:w-[260px]" aria-label="اختيار دورة التقرير">
              <SelectValue placeholder="اختر الدورة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">تراكمي — كل الدورات</SelectItem>
              {[...data.sessions]
                .sort((a, b) => b.periodFrom.localeCompare(a.periodFrom))
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                    {s.id === d.activeSession?.id ? ' (نشطة)' : s.status !== 'open' ? ' — مغلقة' : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="إجمالي الإيرادات"
          value={<Money value={pnl.revenue} decimals={0} />}
          icon={Wallet}
          tone="navy"
          hint={
            pnl.externalIncome > 0
              ? `مبيعات ${formatNumber(pnl.salesRevenue, 0)} + خارجي ${formatNumber(pnl.externalIncome, 0)}`
              : periodLabel
          }
        />
        <StatTile
          label="مجمل الربح"
          value={<Money value={pnl.grossProfit} decimals={0} />}
          icon={Coins}
          tone="sun"
          hint={`هامش ${formatNumber(pnl.marginPct, 1)}%`}
        />
        <StatTile
          label="صافي الربح"
          value={<Money value={pnl.netProfit} decimals={0} />}
          icon={TrendingUp}
          tone={pnl.netProfit >= 0 ? 'meadow' : 'rose'}
          hint={pnl.wasteLosses > 0 ? `بعد هدر ${formatNumber(pnl.wasteLosses, 0)}` : `هامش ${formatNumber(pnl.netMarginPct, 1)}%`}
        />
        <StatTile
          label="توازن القيود"
          value={trialBalance.balanced ? 'متوازن' : 'غير متوازن'}
          icon={Scale}
          tone={trialBalance.balanced ? 'meadow' : 'rose'}
          hint={`مدين = دائن = ${formatNumber(trialBalance.totalDebit, 0)}`}
        />
      </div>

      <Tabs defaultValue="operations">
        <div dir="rtl" className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          <TabsList dir="rtl" className="inline-flex h-auto w-max min-w-full gap-1 p-1 sm:w-full">
            <TabsTrigger value="operations" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">
              ملخص التشغيل
            </TabsTrigger>
            <TabsTrigger value="pnl" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">
              قائمة الدخل
            </TabsTrigger>
            <TabsTrigger value="trial" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">
              ميزان المراجعة
            </TabsTrigger>
            <TabsTrigger value="position" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">
              المركز المالي
            </TabsTrigger>
            <TabsTrigger value="aging" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">
              أعمار الديون
            </TabsTrigger>
            <TabsTrigger value="journal" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">
              دفتر اليومية
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="operations">
          <OperationsSummary
            periodLabel={periodLabel}
            operational={operational}
            cumulative={cumulativeOps}
            currentStock={d.totals.currentStock}
            inventoryValue={d.totals.inventoryValue}
            wac={d.totals.wac}
          />
        </TabsContent>

        <TabsContent value="pnl">
          <Card>
            <CardHeader className="text-right">
              <CardTitle className="text-balance">قائمة الدخل</CardTitle>
              <CardDescription className="text-pretty">
                {periodLabel} — من الإيرادات إلى صافي الربح بعد الهدر والمصاريف والرواتب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <ReportPnlRow label="إيرادات المبيعات" value={pnl.salesRevenue} />
              {pnl.externalIncome > 0 ? (
                <ReportPnlRow label="مدخولات خارجية" value={pnl.externalIncome} />
              ) : null}
              {pnl.externalIncome > 0 ? (
                <div dir="rtl" className="flex items-center justify-between gap-3 border-b border-border py-2 text-[13px]">
                  <span className="flex-1 text-right font-medium text-foreground">إجمالي الإيرادات</span>
                  <Money value={pnl.revenue} className="shrink-0 font-bold tabular-nums" />
                </div>
              ) : null}
              <ReportPnlRow label="تكلفة البضاعة المباعة" value={-pnl.cogs} negative />
              <div className="my-2">
                <ReportPnlTotal
                  label="مجمل الربح"
                  amount={pnl.grossProfit}
                  sub={`هامش ${formatNumber(pnl.marginPct, 1)}%`}
                />
              </div>
              <ReportPnlRow label="خسائر الهدر والتلف (غير نقدية)" value={-pnl.wasteLosses} negative />
              <ReportPnlRow label="المصاريف التشغيلية" value={-pnl.operatingExpenses} negative />
              <ReportPnlRow label="الرواتب والأجور" value={-pnl.salaries} negative />
              <div className="mt-2">
                <ReportPnlTotal
                  label={pnl.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                  amount={pnl.netProfit}
                  sub={`هامش ${formatNumber(pnl.netMarginPct, 1)}%`}
                  positive={pnl.netProfit >= 0}
                />
              </div>
              {pnl.wasteLosses > 0 ? (
                <p className="mt-3 rounded-lg bg-sun-50 px-3 py-2 text-right text-[11.5px] leading-relaxed text-sun-800 ring-1 ring-sun-100 text-pretty">
                  الهدر والتلف خسارة غير نقدية: لا يُخصم من الخزينة، بل يُخفّض قيمة المخزون وصافي الربح دون ازدواج في
                  المصاريف النقدية.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <ProfitInventoryCard
            className="mt-4"
            profitLabel="صافي الربح"
            profit={pnl.netProfit}
            stockQty={d.totals.currentStock}
            stockCostValue={d.totals.inventoryValue}
            sellPrice={avgSellPrice}
            description="المخزون لحظة حالية (كل الدورات) — مفصول عن ربح الفترة المختارة"
          />
        </TabsContent>

        <TabsContent value="trial">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 text-right">
              <div>
                <CardTitle className="text-balance">ميزان المراجعة</CardTitle>
                <CardDescription>{periodLabel} — أرصدة الحسابات من القيود المزدوجة</CardDescription>
              </div>
              <Badge variant={trialBalance.balanced ? 'success' : 'danger'}>
                {trialBalance.balanced ? 'متوازن' : 'غير متوازن'}
              </Badge>
            </CardHeader>
            <CardContent>
              {trialBalance.rows.length === 0 ? (
                <EmptyState icon={BarChart3} title="لا قيود في هذه الدورة" description="سجّل عمليات أو اختر دورة أخرى." />
              ) : (
                <>
                  <div className="space-y-2 md:hidden">
                    {trialBalance.rows.map((r) => (
                      <ReportMobileCard
                        key={r.account}
                        title={ACCOUNT_LABELS[r.account]}
                        rows={[
                          {
                            label: 'مدين',
                            value: <Money value={r.debit} decimals={0} className="text-[12.5px]" muted />,
                          },
                          {
                            label: 'دائن',
                            value: <Money value={r.credit} decimals={0} className="text-[12.5px]" muted />,
                          },
                          {
                            label: 'الرصيد',
                            value: (
                              <span className="inline-flex items-center gap-1.5">
                                <ReportStatusBadge variant="neutral">
                                  {r.balance >= 0 ? 'مدين' : 'دائن'}
                                </ReportStatusBadge>
                                <Money value={Math.abs(r.balance)} decimals={0} className="text-[13px] font-semibold" />
                              </span>
                            ),
                            highlight: true,
                          },
                        ]}
                      />
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الحساب</TableHead>
                          <TableHead className="text-end">مدين</TableHead>
                          <TableHead className="text-end">دائن</TableHead>
                          <TableHead className="text-end">الرصيد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.rows.map((r) => (
                          <TableRow key={r.account}>
                            <TableCell className="text-right text-[13px] font-medium">
                              {ACCOUNT_LABELS[r.account]}
                            </TableCell>
                            <TableCell className="text-end">
                              <Money value={r.debit} decimals={0} className="text-[12.5px] tabular-nums" muted />
                            </TableCell>
                            <TableCell className="text-end">
                              <Money value={r.credit} decimals={0} className="text-[12.5px] tabular-nums" muted />
                            </TableCell>
                            <TableCell className="text-end">
                              <div className="inline-flex items-center gap-2">
                                <Badge variant="neutral" className="text-[10px]">
                                  {r.balance >= 0 ? 'مدين' : 'دائن'}
                                </Badge>
                                <Money
                                  value={Math.abs(r.balance)}
                                  decimals={0}
                                  className="text-[13px] font-semibold tabular-nums"
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div
                    dir="rtl"
                    className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-canvas-sunken px-4 py-3 text-[13px] font-semibold"
                  >
                    <span className="flex-1 text-right">الإجماليات</span>
                    <div className="flex shrink-0 items-center gap-2 tabular-nums">
                      <Money value={trialBalance.totalDebit} decimals={0} />
                      <span className="text-muted-foreground">=</span>
                      <Money value={trialBalance.totalCredit} decimals={0} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="position" className="space-y-4">
          <NetPositionCard position={d.adjustedNetPosition} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="النقدية" value={<Money value={d.totals.netCash} decimals={0} />} icon={Wallet} tone="navy" />
            <StatTile label="لنا (عملاء)" value={<Money value={d.totals.receivables} decimals={0} />} icon={Users} tone="meadow" />
            <StatTile label="علينا (فلاحون)" value={<Money value={d.totals.payables} decimals={0} />} icon={Tractor} tone="rose" />
            <StatTile
              label="قيمة المخزون"
              value={<Money value={d.totals.inventoryValue} decimals={0} />}
              icon={Warehouse}
              tone="sun"
              hint={<Liters value={d.totals.currentStock} className="text-[11px]" />}
            />
          </div>
          <p className="text-right text-[11.5px] text-muted-foreground text-pretty">
            المركز المالي يعكس الوضع الحالي للشركة (كل الدورات). الديون المتأخرة:{' '}
            <Money value={d.totals.overdue} decimals={0} className="inline text-[11.5px] font-semibold" />.
          </p>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardHeader className="text-right">
              <CardTitle className="text-balance">أعمار ديون العملاء</CardTitle>
              <CardDescription className="text-pretty">
                توزيع الذمم المدينة حسب التأخّر — إجمالي{' '}
                <Money value={agingTotal} decimals={0} className="inline text-[13px] font-semibold" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {AGING_BUCKETS.map((b) => (
                  <ReportAgingBar
                    key={b.key}
                    label={b.label}
                    value={aging[b.key]}
                    total={agingTotal}
                    tone={b.tone}
                  />
                ))}
              </div>

              {topDebtors.length > 0 ? (
                <div>
                  <p className="mb-3 text-right text-[12px] font-semibold text-foreground">أعلى العملاء مديونية</p>

                  <div className="space-y-2 md:hidden">
                    {topDebtors.map((c) => (
                      <ReportMobileCard
                        key={c.id}
                        title={c.entityName}
                        badge={
                          <ReportStatusBadge
                            variant={c.onHold ? 'warning' : c.overdueAmount > 0 ? 'danger' : 'neutral'}
                          >
                            {c.onHold ? 'موقوف' : c.overdueAmount > 0 ? 'متأخر' : 'نشط'}
                          </ReportStatusBadge>
                        }
                        rows={[
                          {
                            label: 'المستحق',
                            value: <Money value={c.outstanding} decimals={0} className="text-[12.5px] font-semibold" />,
                            highlight: true,
                          },
                          {
                            label: 'متأخر',
                            value: (
                              <Money
                                value={c.overdueAmount}
                                decimals={0}
                                className={cn('text-[12.5px]', c.overdueAmount > 0 && 'font-semibold text-rose-600')}
                                muted={c.overdueAmount <= 0}
                              />
                            ),
                          },
                        ]}
                      />
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">العميل</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                          <TableHead className="text-end">المستحق</TableHead>
                          <TableHead className="text-end">متأخر</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topDebtors.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-right text-[13px] font-medium">{c.entityName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={c.onHold ? 'warning' : c.overdueAmount > 0 ? 'danger' : 'neutral'}>
                                {c.onHold ? 'موقوف' : c.overdueAmount > 0 ? 'متأخر' : 'نشط'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-end">
                              <Money value={c.outstanding} decimals={0} className="text-[12.5px] font-semibold tabular-nums" />
                            </TableCell>
                            <TableCell className="text-end">
                              <Money
                                value={c.overdueAmount}
                                decimals={0}
                                className={cn('text-[12.5px] tabular-nums', c.overdueAmount > 0 && 'font-semibold text-rose-600')}
                                muted={c.overdueAmount <= 0}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <EmptyState icon={Users} title="لا ديون على العملاء" description="جميع الذمم المدينة مسدّدة أو غير موجودة." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal">
          <Card>
            <CardHeader className="text-right">
              <CardTitle className="text-balance">دفتر اليومية</CardTitle>
              <CardDescription>{periodLabel} — أحدث القيود المحاسبية</CardDescription>
            </CardHeader>
            <CardContent>
              {recentJournals.length === 0 ? (
                <EmptyState icon={CalendarRange} title="لا قيود" description="لم تُسجَّل عمليات محاسبية في هذا النطاق بعد." />
              ) : (
                <>
                  <div className="space-y-2 md:hidden">
                    {recentJournals.map((j) => {
                      const amount = j.lines.reduce((s, l) => s + l.debit, 0);
                      return (
                        <ReportMobileCard
                          key={j.id}
                          title={j.description || KIND_LABEL[j.kind]}
                          badge={<ReportStatusBadge variant="neutral">{KIND_LABEL[j.kind]}</ReportStatusBadge>}
                          rows={[
                            { label: 'التاريخ', value: formatShortDate(j.date) },
                            {
                              label: 'المرجع',
                              value: (
                                <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                                  {j.ref}
                                </span>
                              ),
                            },
                            {
                              label: 'المبلغ',
                              value: <Money value={amount} decimals={0} className="text-[13px] font-semibold" />,
                              highlight: true,
                            },
                          ]}
                        />
                      );
                    })}
                  </div>

                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-end">المرجع</TableHead>
                          <TableHead className="text-center">النوع</TableHead>
                          <TableHead className="text-right">البيان</TableHead>
                          <TableHead className="text-end">المبلغ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentJournals.map((j) => {
                          const amount = j.lines.reduce((s, l) => s + l.debit, 0);
                          return (
                            <TableRow key={j.id}>
                              <TableCell className="text-right text-[12.5px] tabular-nums">
                                {formatShortDate(j.date)}
                              </TableCell>
                              <TableCell className="text-end font-mono text-[11.5px] text-muted-foreground" dir="ltr">
                                {j.ref}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="neutral">{KIND_LABEL[j.kind]}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[220px] truncate text-right text-[12.5px] text-muted-foreground">
                                {j.description}
                              </TableCell>
                              <TableCell className="text-end">
                                <Money value={amount} decimals={0} className="text-[12.5px] font-semibold tabular-nums" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OperationsSummary({
  periodLabel,
  operational,
  cumulative,
  currentStock,
  inventoryValue,
  wac,
}: {
  periodLabel: string;
  operational: SessionSummary | null;
  cumulative: {
    supplyQty: number;
    supplyCost: number;
    salesQty: number;
    salesRevenue: number;
    farmerPayments: number;
    customerReceipts: number;
    wasteLosses: number;
  } | null;
  currentStock: number;
  inventoryValue: number;
  wac: number;
}) {
  const ops = operational ?? cumulative;
  if (!ops) {
    return (
      <EmptyState icon={CalendarRange} title="لا بيانات تشغيلية" description="اختر دورة أو سجّل عمليات في النظام." />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-right">
          <CardTitle className="text-balance">ملخص التشغيل</CardTitle>
          <CardDescription className="text-pretty">
            {periodLabel} — استلام، بيع، تدفّق نقدي مرتبط بالدورة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="استلام الحليب"
              value={<Liters value={ops.supplyQty} />}
              icon={Droplets}
              tone="navy"
              hint={<Money value={ops.supplyCost} decimals={0} muted className="text-[11px]" />}
            />
            <StatTile
              label="مبيعات"
              value={<Liters value={ops.salesQty} />}
              icon={ShoppingCart}
              tone="meadow"
              hint={<Money value={ops.salesRevenue} decimals={0} muted className="text-[11px]" />}
            />
            <StatTile
              label="دفعات للفلاحين"
              value={<Money value={ops.farmerPayments} decimals={0} />}
              icon={Tractor}
              tone="sun"
            />
            <StatTile
              label="تحصيل من العملاء"
              value={<Money value={ops.customerReceipts} decimals={0} />}
              icon={Users}
              tone="meadow"
            />
          </div>
        </CardContent>
      </Card>

      {operational ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="رصيد افتتاحي" value={<Liters value={operational.openingStock} />} tone="neutral" />
          <StatTile label="رصيد ختامي (محسوب)" value={<Liters value={operational.closingStock} />} tone="navy" />
          <StatTile
            label="هدر الدورة"
            value={<Money value={operational.wasteLosses} decimals={0} />}
            tone={operational.wasteLosses > 0 ? 'rose' : 'neutral'}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader className="text-right">
          <CardTitle className="text-balance">المخزون الحالي</CardTitle>
          <CardDescription>لحظة التقرير — ليس مقيّداً بالدورة المختارة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="الكمية" value={<Liters value={currentStock} />} icon={Warehouse} tone="navy" />
            <StatTile label="القيمة" value={<Money value={inventoryValue} decimals={0} />} icon={Coins} tone="sun" />
            <StatTile label="متوسط التكلفة" value={`${formatNumber(wac, 3)} / لتر`} tone="neutral" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
