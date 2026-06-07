'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Coins,
  Gauge,
  ShoppingCart,
  Tractor,
  TrendingUp,
  Warehouse,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { FlowChart } from '@/components/dashboard/flow-chart';
import { ProfitBars } from '@/components/dashboard/profit-bars';
import { DashboardV3Panels } from '@/components/dashboard/v3-panels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Money, Liters } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { useDerived, useErpData } from '@/lib/store/use-derived';
import { usePermission } from '@/lib/store/use-permission';
import { computeDailyFlow } from '@/lib/domain/calculations';
import { COPY } from '@/lib/domain/constants';
import { formatNumber, formatShortDate } from '@/lib/utils';

const C = COPY.collection;

const ALERT_STYLE = {
  danger: { dot: 'bg-rose-500', badge: 'danger' as const },
  warning: { dot: 'bg-sun-500', badge: 'warning' as const },
  info: { dot: 'bg-navy-500', badge: 'info' as const },
};

export default function DashboardPage() {
  const data = useErpData();
  const d = useDerived();
  const canSupply = usePermission('supply.record');
  const canSell = usePermission('sales.record');

  const s = d.activeSummary;
  const flow = computeDailyFlow(d.activeSession?.id ?? 'all', d.inv);

  // أعلى الموردين في الفترة النشطة
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

  // آخر الحركات
  const recent = [
    ...data.supplies.map((x) => ({ kind: 'supply' as const, ...x })),
    ...data.sales.map((x) => ({ kind: 'sale' as const, ...x })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="نظرة تنفيذية"
        title="لوحة التحكم"
        description={`المؤشرات اللحظية لفترة ${d.activeSession?.label ?? ''} — مخزون، إيرادات، أرباح وتنبيهات.`}
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

      {/* المؤشرات الرئيسية */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="المخزون الحالي"
          value={<Liters value={d.totals.currentStock} />}
          icon={Warehouse}
          accent="meadow"
          hint={`قيمة تقديرية: ${formatNumber(d.totals.inventoryValue, 0)} د.ل`}
          href="/inventory"
        />
        <KpiCard
          label="إيرادات الفترة"
          value={<Money value={s?.salesRevenue ?? 0} decimals={0} />}
          icon={Wallet}
          accent="navy"
          hint={`${formatNumber(s?.salesQty ?? 0)} لتر عبر ${s?.salesCount ?? 0} عملية`}
        />
        <KpiCard
          label="صافي الربح"
          value={<Money value={s?.grossProfit ?? 0} decimals={0} />}
          icon={TrendingUp}
          accent="sun"
          delta={{ value: s?.marginPct ?? 0 }}
          hint={`هامش الربح الإجمالي`}
        />
        <KpiCard
          label="التنبيهات العاجلة"
          value={formatNumber(d.alerts.length)}
          icon={AlertTriangle}
          accent="rose"
          hint={d.alerts.length ? 'تتطلب مراجعة' : 'لا تنبيهات حالياً'}
        />
      </div>

      {/* مؤشرات ثانوية */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="مستحقات الفلاحين"
          value={<Money value={d.totals.payables} decimals={0} />}
          icon={Tractor}
          accent="navy"
          hint="إجمالي المبالغ المستحقة للموردين"
          href="/farmers"
        />
        <KpiCard
          label="ذمم العملاء"
          value={<Money value={d.totals.receivables} decimals={0} />}
          icon={Building2}
          accent="meadow"
          hint={`منها متأخر: ${formatNumber(d.totals.overdue, 0)} د.ل`}
          href="/customers"
        />
        <KpiCard
          label="متوسط تكلفة اللتر"
          value={<Money value={d.totals.wac} decimals={3} />}
          icon={Gauge}
          accent="sun"
          hint="المتوسط المرجّح المتحرّك"
        />
        <KpiCard
          label="صافي المركز النقدي"
          value={<Money value={d.totals.netCash} decimals={0} />}
          icon={Coins}
          accent={d.totals.netCash >= 0 ? 'meadow' : 'rose'}
          hint="المحصّل − المدفوع"
        />
      </div>

      {/* لوحات v3.0 — الكاش والمصاريف والرواتب والدورة */}
      <DashboardV3Panels />

      {/* الحركة + التنبيهات */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>حركة المخزون اليومية</CardTitle>
              <CardDescription>الوارد والصادر والرصيد خلال {d.activeSession?.label}</CardDescription>
            </div>
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-meadow-500" /> وارد
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-navy-600" /> صادر
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sun-500" /> الرصيد
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {flow.length ? (
              <FlowChart data={flow} />
            ) : (
              <EmptyState icon={Warehouse} title="لا توجد حركة بعد" description="ابدأ بتسجيل عمليات الاستلام والبيع." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>التنبيهات</CardTitle>
            <CardDescription>أمور تتطلب انتباهك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.alerts.length ? (
              d.alerts.map((a) => {
                const style = ALERT_STYLE[a.level];
                const body = (
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-canvas-sunken/60 p-3 transition-colors hover:bg-canvas-sunken">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-semibold text-foreground">{a.title}</p>
                      <p className="text-[12px] leading-relaxed text-muted-foreground">{a.detail}</p>
                    </div>
                  </div>
                );
                return a.href ? (
                  <Link key={a.id} href={a.href} className="block">
                    {body}
                  </Link>
                ) : (
                  <div key={a.id}>{body}</div>
                );
              })
            ) : (
              <EmptyState title="كل شيء على ما يرام" description="لا توجد تنبيهات في الوقت الحالي." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* الأرباح + أعلى الموردين */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
            <CardDescription>{C.topFarmers} في {d.activeSession?.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {topSuppliers.length ? (
              topSuppliers.map((t, i) => (
                <div key={t.farmer!.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-[10px] font-bold text-navy-700">
                        {i + 1}
                      </span>
                      {t.farmer!.fullName.split(' ').slice(0, 2).join(' ')}
                    </span>
                    <Liters value={t.qty} className="text-muted-foreground" />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-canvas-sunken">
                    <div
                      className="h-full rounded-full bg-meadow-500"
                      style={{ width: `${(t.qty / maxSupply) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Tractor} title="لا عمليات استلام بعد" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* آخر الحركات */}
      <Card>
        <CardHeader>
          <CardTitle>آخر الحركات</CardTitle>
          <CardDescription>أحدث عمليات الاستلام والبيع المسجّلة</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length ? (
            <div className="space-y-1">
              {recent.map((r) => {
                const isSupply = r.kind === 'supply';
                const party = isSupply
                  ? d.farmers.find((f) => f.id === (r as any).farmerId)?.fullName
                  : d.customers.find((c) => c.id === (r as any).customerId)?.entityName;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-canvas-sunken"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isSupply ? 'bg-meadow-100 text-meadow-700' : 'bg-navy-100 text-navy-700'
                        }`}
                      >
                        {isSupply ? <ArrowDownToLine className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{party ?? '—'}</p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">
                          {r.ref} · {formatShortDate(r.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <Money value={r.total} className="text-[13px] font-semibold" />
                      <p className="text-[11px] text-muted-foreground">
                        <Liters value={r.quantity} />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="لا حركات بعد" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
