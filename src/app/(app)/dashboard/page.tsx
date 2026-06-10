'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Coins,
  Gauge,
  Tractor,
  TrendingUp,
  Warehouse,
  Wallet,
} from 'lucide-react';
import { WelcomeHero } from '@/components/dashboard/welcome-hero';
import { OperationsCommandCenter } from '@/components/dashboard/operations-command-center';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { DashboardKpiRail, DashboardKpiRailItem } from '@/components/dashboard/dashboard-kpi-rail';
import { DashboardCollapsibleSection } from '@/components/dashboard/dashboard-collapsible-section';
import { FlowChart } from '@/components/dashboard/flow-chart';
import { ProfitBars } from '@/components/dashboard/profit-bars';
import { NetPositionCard } from '@/components/dashboard/net-position-card';
import { AlertsBanner, AlertsPanel } from '@/components/dashboard/alerts-panel';
import { SessionSnapshotCard } from '@/components/dashboard/session-snapshot-card';
import { DashboardV3Panels } from '@/components/dashboard/v3-panels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Money, Liters } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { useDerived, useErpData } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { computeDailyFlow } from '@/lib/domain/calculations';
import { COPY, ROLE_LABELS } from '@/lib/domain/constants';
import { formatNumber } from '@/lib/utils';
import { formatLiters } from '@/lib/format-currency';

const C = COPY.collection;

export default function DashboardPage() {
  const data = useErpData();
  const d = useDerived();
  const auth = useErpStore((st) => st.auth);
  const canSupply = usePermission('supply.record');
  const canSell = usePermission('sales.record');

  const s = d.activeSummary;
  const flow = computeDailyFlow(d.activeSession?.id ?? 'all', d.inv);
  const sessionLabel = d.activeSession?.label ?? 'الفترة الحالية';
  const hasDangerAlerts = d.alerts.some((a) => a.level === 'danger');

  const supplyBySupplier = new Map<string, number>();
  for (const sup of data.supplies.filter((x) => x.sessionId === d.activeSession?.id)) {
    supplyBySupplier.set(sup.farmerId, (supplyBySupplier.get(sup.farmerId) ?? 0) + sup.quantity);
  }
  const topSuppliers = Array.from(supplyBySupplier.entries())
    .map(([id, qty]) => ({ farmer: d.farmers.find((f) => f.id === id), qty }))
    .filter((x) => x.farmer)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);
  const maxSupply = topSuppliers[0]?.qty ?? 1;

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      <WelcomeHero
        userName={auth?.name ?? 'مستخدم'}
        roleLabel={ROLE_LABELS[auth?.role ?? 'viewer']}
        sessionLabel={sessionLabel}
        alertsCount={d.alerts.length}
        actions={
          <>
            {canSupply ? (
              <Button asChild variant="meadow">
                <Link href="/supply">
                  <ArrowDownToLine className="h-4 w-4" />
                  {C.record}
                </Link>
              </Button>
            ) : null}
            {canSell ? (
              <Button asChild>
                <Link href="/sales">
                  <ArrowUpFromLine className="h-4 w-4" />
                  تسجيل بيع
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <NetPositionCard position={d.adjustedNetPosition} />

      {/* ملخص الفترة مبكراً على الجوال */}
      <div className="lg:hidden">
        <SessionSnapshotCard sessionLabel={sessionLabel} summary={s} />
      </div>

      {hasDangerAlerts ? <AlertsBanner alerts={d.alerts} /> : null}

      <OperationsCommandCenter />

      <DashboardKpiRail>
          <DashboardKpiRailItem>
            <KpiCard label="المخزون" value={<Liters value={d.totals.currentStock} />} icon={Warehouse} accent="meadow" hint={<Money value={d.totals.inventoryValue} decimals={0} className="inline text-[10px]" muted />} href="/inventory" variant="rail" />
          </DashboardKpiRailItem>
          <DashboardKpiRailItem>
            <KpiCard label="إيرادات الفترة" value={<Money value={s?.salesRevenue ?? 0} decimals={0} />} icon={Wallet} accent="navy" hint={`${formatLiters(s?.salesQty ?? 0, 0, false)} لتر`} variant="rail" />
          </DashboardKpiRailItem>
          <DashboardKpiRailItem>
            <KpiCard label="صافي الربح" value={<Money value={s?.netProfit ?? 0} decimals={0} />} icon={TrendingUp} accent={s && s.netProfit < 0 ? 'rose' : 'sun'} delta={{ value: s?.netMarginPct ?? 0 }} href="/reports" variant="rail" />
          </DashboardKpiRailItem>
          <DashboardKpiRailItem>
            <KpiCard label="النقد" value={<Money value={d.totals.netCash} decimals={0} />} icon={Coins} accent={d.totals.netCash >= 0 ? 'meadow' : 'rose'} hint="خزائن + بنوك" href="/treasury" variant="rail" />
          </DashboardKpiRailItem>
          <DashboardKpiRailItem>
            <KpiCard label="ديون الفلاحين" value={<Money value={d.totals.payables} decimals={0} />} icon={Tractor} accent="navy" hint="مستحقات" href="/debts" variant="rail" />
          </DashboardKpiRailItem>
          <DashboardKpiRailItem>
            <KpiCard label="ديون العملاء" value={<Money value={d.totals.receivables} decimals={0} />} icon={Building2} accent="meadow" hint={<Money value={d.totals.overdue} decimals={0} className="inline text-[10px]" muted />} href="/debts" variant="rail" />
          </DashboardKpiRailItem>
          <DashboardKpiRailItem>
            <KpiCard label="تكلفة اللتر" value={<Money value={d.totals.wac} decimals={3} />} icon={Gauge} accent="sun" hint="متوسط مرجّح" variant="rail" />
          </DashboardKpiRailItem>
          <DashboardKpiRailItem>
            <KpiCard label="التنبيهات" value={formatNumber(d.alerts.length)} icon={AlertTriangle} accent={hasDangerAlerts ? 'rose' : d.alerts.length ? 'sun' : 'meadow'} hint={d.alerts.length ? 'اضغط للتفاصيل' : 'سليم'} href="#alerts" variant="rail" />
          </DashboardKpiRailItem>
      </DashboardKpiRail>

      <div className="lg:hidden">
        <DashboardCollapsibleSection
          title="التنبيهات"
          description="مخزون، نقد، ديون، وفترة محاسبية"
          badge={d.alerts.length > 0 ? <Badge variant={hasDangerAlerts ? 'danger' : 'warning'}>{d.alerts.length}</Badge> : null}
          defaultOpen={hasDangerAlerts}
        >
          <AlertsPanel alerts={d.alerts} compact limit={5} />
        </DashboardCollapsibleSection>
      </div>

      {/* سطح المكتب: شبكات KPI */}
      <div className="hidden grid-cols-2 gap-4 xl:grid-cols-4 lg:grid">
        <KpiCard label="المخزون الحالي" value={<Liters value={d.totals.currentStock} />} icon={Warehouse} accent="meadow" hint={<>قيمة: <Money value={d.totals.inventoryValue} decimals={0} className="inline text-[11.5px]" muted /></>} href="/inventory" />
        <KpiCard label="إيرادات الفترة" value={<Money value={s?.salesRevenue ?? 0} decimals={0} />} icon={Wallet} accent="navy" hint={<>{formatLiters(s?.salesQty ?? 0, 0, false)} عبر {s?.salesCount ?? 0} عملية</>} />
        <KpiCard label="صافي ربح الفترة" value={<Money value={s?.netProfit ?? 0} decimals={0} />} icon={TrendingUp} accent={s && s.netProfit < 0 ? 'rose' : 'sun'} delta={{ value: s?.netMarginPct ?? 0 }} hint="بعد المصاريف والرواتب والهدر" href="/reports" />
        <KpiCard label="التنبيهات" value={formatNumber(d.alerts.length)} icon={AlertTriangle} accent={hasDangerAlerts ? 'rose' : d.alerts.length ? 'sun' : 'meadow'} hint={d.alerts.length ? 'اضغط للتفاصيل' : 'لا تنبيهات'} href="#alerts" />
      </div>

      <div className="hidden lg:block">
        <AlertsPanel alerts={d.alerts} />
      </div>

      <div className="hidden grid-cols-2 gap-4 xl:grid-cols-4 lg:grid">
        <KpiCard label="ديون الفلاحين" value={<Money value={d.totals.payables} decimals={0} />} icon={Tractor} accent="navy" hint="فلاحون + موظفون" href="/debts" />
        <KpiCard label="ديون العملاء" value={<Money value={d.totals.receivables} decimals={0} />} icon={Building2} accent="meadow" hint={<>متأخر: <Money value={d.totals.overdue} decimals={0} className="inline text-[11.5px]" muted /></>} href="/debts" />
        <KpiCard label="متوسط تكلفة اللتر" value={<Money value={d.totals.wac} decimals={3} />} icon={Gauge} accent="sun" hint="المتوسط المرجّح المتحرّك" />
        <KpiCard label="النقد المتاح" value={<Money value={d.totals.netCash} decimals={0} />} icon={Coins} accent={d.totals.netCash >= 0 ? 'meadow' : 'rose'} hint="خزائن + بنوك" href="/treasury" />
      </div>

      <div className="lg:hidden">
        <DashboardCollapsibleSection title="تشغيل اليوم" description="خزائن، مصاريف، رواتب، والدورة">
          <DashboardV3Panels />
        </DashboardCollapsibleSection>
      </div>

      <div className="hidden lg:block">
        <DashboardV3Panels />
      </div>

      <div className="lg:hidden">
      <DashboardCollapsibleSection title="تحليلات وتقارير" description="مخزون، أرباح، وموردين">
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px]">حركة المخزون</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {flow.length ? <FlowChart data={flow} /> : <EmptyState icon={Warehouse} title="لا حركة بعد" />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px]">الأرباح حسب الفترة</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ProfitBars summaries={d.sessionSummaries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px]">أعلى الموردين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {topSuppliers.length ? (
                topSuppliers.slice(0, 4).map((t, i) => (
                  <div key={t.farmer!.id} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-medium">{i + 1}. {t.farmer!.fullName.split(' ').slice(0, 2).join(' ')}</span>
                    <Liters value={t.qty} className="text-muted-foreground" />
                  </div>
                ))
              ) : (
                <EmptyState icon={Tractor} title="لا استلام بعد" />
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardCollapsibleSection>
      </div>

      <Card className="hidden lg:block">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>حركة المخزون اليومية</CardTitle>
            <CardDescription>الوارد والصادر والرصيد خلال {sessionLabel}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {flow.length ? <FlowChart data={flow} /> : <EmptyState icon={Warehouse} title="لا توجد حركة بعد" description="ابدأ بتسجيل عمليات الاستلام والبيع." />}
        </CardContent>
      </Card>

      <div className="hidden grid-cols-1 gap-4 lg:grid lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الأرباح حسب الفترة</CardTitle>
            <CardDescription>الإيراد مقابل الربح الإجمالي لكل فترة محاسبية</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfitBars summaries={d.sessionSummaries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>أعلى الموردين</CardTitle>
            <CardDescription>{C.topFarmers} في {sessionLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {topSuppliers.length ? (
              topSuppliers.map((t, i) => (
                <div key={t.farmer!.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-[10px] font-bold text-navy-700">{i + 1}</span>
                      {t.farmer!.fullName.split(' ').slice(0, 2).join(' ')}
                    </span>
                    <Liters value={t.qty} className="text-muted-foreground" />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-canvas-sunken">
                    <div className="h-full rounded-full bg-meadow-500" style={{ width: `${(t.qty / maxSupply) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Tractor} title="لا عمليات استلام بعد" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:block">
        <SessionSnapshotCard sessionLabel={sessionLabel} summary={s} />
      </div>
    </div>
  );
}
