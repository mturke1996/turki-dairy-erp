'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  Gauge,
  History,
  ShoppingCart,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Money, Liters } from '@/components/shared/money';
import { AUDIT_ACTION_LABELS } from '@/lib/domain/constants';
import { useCycle } from '@/lib/store/use-cycle';
import { useDerived, useErpData } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { cn, formatNumber } from '@/lib/utils';

function sameDay(value: string, date: Date): boolean {
  const d = new Date(value);
  return (
    !Number.isNaN(d.getTime()) &&
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function timeOnly(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function OperationsCommandCenter() {
  const data = useErpData();
  const d = useDerived();
  const cycle = useCycle();
  const logs = useErpStore((s) => s.auditLogs);
  const canViewAudit = usePermission('audit.view');

  const today = useMemo(() => {
    const now = new Date();
    const supplies = data.supplies.filter((x) => sameDay(x.date, now));
    const sales = data.sales.filter((x) => sameDay(x.date, now));
    return {
      suppliedQty: supplies.reduce((sum, x) => sum + x.quantity, 0),
      suppliedValue: supplies.reduce((sum, x) => sum + x.total, 0),
      soldQty: sales.reduce((sum, x) => sum + x.quantity, 0),
      revenue: sales.reduce((sum, x) => sum + x.total, 0),
      actions: logs.filter((x) => sameDay(x.performedAt, now)).length,
    };
  }, [data.sales, data.supplies, logs]);

  const latest = useMemo(
    () => [...logs].sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt)).slice(0, 4),
    [logs],
  );

  const stockRatio = data.settings.minStockThreshold > 0
    ? Math.min(100, (d.totals.currentStock / data.settings.minStockThreshold) * 100)
    : 100;

  const stockLow = d.totals.currentStock <= data.settings.minStockThreshold;
  const netToday = today.revenue - today.suppliedValue;

  const metrics = [
    {
      icon: ArrowDownToLine,
      label: 'وارد اليوم',
      value: <Liters value={today.suppliedQty} />,
      hint: <Money value={today.suppliedValue} decimals={0} muted />,
      tone: 'meadow' as const,
    },
    {
      icon: ShoppingCart,
      label: 'مبيعات اليوم',
      value: <Liters value={today.soldQty} />,
      hint: <Money value={today.revenue} decimals={0} muted />,
      tone: 'navy' as const,
    },
    {
      icon: Gauge,
      label: 'تقدّم الدورة',
      value: `${formatNumber(cycle.progress.pct, 0)}%`,
      hint: `اليوم ${cycle.progress.daysElapsed} من ${cycle.progress.daysTotal}`,
      tone: 'sun' as const,
    },
    ...(canViewAudit
      ? [
          {
            icon: History,
            label: 'نشاط اليوم',
            value: formatNumber(today.actions),
            hint: 'عملية موثّقة',
            tone: 'rose' as const,
          },
        ]
      : []),
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr] lg:gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card lg:rounded-2xl">
        <div className="p-3.5 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-foreground sm:text-[18px] lg:text-[20px]">
                <Activity className="h-4 w-4 text-meadow-600" />
                نبض اليوم
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-[12px]">
                وارد وصادر اليوم
              </p>
            </div>
            <Link
              href={canViewAudit ? '/audit' : '/dashboard'}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors active:bg-canvas-sunken sm:rounded-full sm:px-2.5 sm:text-[11.5px]',
                !canViewAudit && 'pointer-events-none opacity-0',
              )}
              aria-hidden={!canViewAudit}
              tabIndex={canViewAudit ? 0 : -1}
            >
              السجل
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* جوال: شريط أفقي — سطح المكتب: شبكة */}
          <div className="-mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5 pb-0.5 snap-x snap-mandatory no-scrollbar sm:-mx-5 sm:mt-4 sm:gap-2.5 sm:px-5 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="w-[8.75rem] shrink-0 snap-start sm:w-[9.5rem] lg:w-auto lg:shrink">
                <PulseMetric {...m} />
              </div>
            ))}
          </div>

          {/* جوال: شريط حالة واحد مضغوط */}
          <div className="mt-3 space-y-2 lg:mt-4 lg:grid lg:grid-cols-2 lg:gap-3">
            <div className="rounded-xl border border-border bg-canvas-sunken/50 p-3 lg:p-4">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                  <Warehouse className="h-4 w-4 shrink-0 text-meadow-600" />
                  <span className="truncate">مخزون الحليب</span>
                </span>
                <Liters value={d.totals.currentStock} className="shrink-0 font-bold" />
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-card">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-300 ease-out', stockLow ? 'bg-sun-500' : 'bg-meadow-500')}
                  style={{ width: `${stockRatio}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                {stockLow ? 'قريب من حد التنبيه' : 'مستقر'}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-canvas-sunken/50 px-3 py-2.5 lg:block lg:p-4">
              <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-foreground lg:justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowUpFromLine className="h-4 w-4 shrink-0 text-navy-600" />
                  صافي اليوم
                </span>
                <Money value={netToday} decimals={0} className="shrink-0 font-bold lg:mt-0" />
              </div>
              <p className="hidden text-[11px] leading-relaxed text-muted-foreground lg:mt-2 lg:block">
                إيراد المبيعات ناقص تكلفة الاستلام المسجّلة اليوم.
              </p>
            </div>
          </div>
        </div>
      </div>

      {canViewAudit ? (
        <div className="hidden rounded-2xl border border-border bg-card p-4 lg:block lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold text-foreground">آخر ما حدث</h3>
            <History className="h-4.5 w-4.5 text-muted-foreground" />
          </div>

          <div className="mt-3 space-y-2">
            {latest.length ? (
              latest.map((log) => (
                <Link
                  key={log.id}
                  href="/audit"
                  className="group flex items-start gap-2.5 rounded-xl border border-border/70 bg-canvas-sunken/45 p-2.5 transition-colors hover:bg-canvas-sunken"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-meadow-500 ring-4 ring-meadow-100" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-foreground">{log.summary}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {AUDIT_ACTION_LABELS[log.action]} · <span dir="ltr">{timeOnly(log.performedAt)}</span>
                    </span>
                  </span>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
                سيظهر هنا آخر نشاط بعد أول عملية.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PulseMetric({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  tone: 'meadow' | 'navy' | 'sun' | 'rose';
}) {
  const toneClass = {
    meadow: 'bg-meadow-50 text-meadow-700 ring-meadow-100',
    navy: 'bg-navy-50 text-navy-700 ring-navy-100',
    sun: 'bg-sun-50 text-sun-800 ring-sun-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  }[tone];

  return (
    <div className="h-full rounded-xl border border-border bg-card/90 p-2.5 transition-transform duration-150 ease-out active:scale-[0.98] sm:p-3 lg:rounded-2xl lg:p-3.5">
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="truncate text-[10.5px] font-medium text-muted-foreground sm:text-[11px]">{label}</p>
          <div className="mt-0.5 truncate text-[16px] font-bold leading-tight text-foreground sm:text-[18px] lg:text-[20px]">
            {value}
          </div>
        </div>
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-8 sm:w-8 lg:h-9 lg:w-9', toneClass)}>
          <Icon className="h-3.5 w-3.5 stroke-[1.7] sm:h-4 sm:w-4" />
        </span>
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground sm:text-[10.5px]">{hint}</div>
    </div>
  );
}
