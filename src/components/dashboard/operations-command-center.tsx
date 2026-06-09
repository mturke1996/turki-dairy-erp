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

  const stockState = d.totals.currentStock <= data.settings.minStockThreshold
    ? 'قريب من حد التنبيه'
    : 'مستقر فوق حد التنبيه';

  return (
    <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-whisper sm:rounded-3xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-[16px] font-bold tracking-tight text-foreground sm:text-[20px]">
                <Activity className="h-4.5 w-4.5 text-meadow-600" />
                نبض اليوم
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground sm:text-[12.5px]">
                وارد وصادر اليوم مع حالة الدورة والمخزون
              </p>
            </div>
            <Link
              href="/audit"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-canvas-sunken hover:text-foreground sm:px-3 sm:text-[12px]"
            >
              سجل النشاط
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
            <PulseMetric
              icon={ArrowDownToLine}
              label="وارد اليوم"
              value={<Liters value={today.suppliedQty} />}
              hint={<Money value={today.suppliedValue} decimals={0} muted />}
              tone="meadow"
            />
            <PulseMetric
              icon={ShoppingCart}
              label="مبيعات اليوم"
              value={<Liters value={today.soldQty} />}
              hint={<Money value={today.revenue} decimals={0} muted />}
              tone="navy"
            />
            <PulseMetric
              icon={Gauge}
              label="تقدّم الدورة"
              value={`${formatNumber(cycle.progress.pct, 0)}%`}
              hint={`اليوم ${cycle.progress.daysElapsed} من ${cycle.progress.daysTotal}`}
              tone="sun"
            />
            <PulseMetric
              icon={History}
              label="نشاط اليوم"
              value={formatNumber(today.actions)}
              hint="عملية موثّقة"
              tone="rose"
            />
          </div>

          <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-canvas-sunken/55 p-3.5 sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <Warehouse className="h-4 w-4 text-meadow-600" />
                  مخزون الحليب الحالي
                </span>
                <Liters value={d.totals.currentStock} className="font-bold" />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
                <div
                  className={cn('h-full rounded-full', d.totals.currentStock <= data.settings.minStockThreshold ? 'bg-sun-500' : 'bg-meadow-500')}
                  style={{ width: `${stockRatio}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground sm:text-[11.5px]">{stockState}</p>
            </div>
            <div className="rounded-xl border border-border bg-canvas-sunken/55 p-3.5 sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <ArrowUpFromLine className="h-4 w-4 text-navy-600" />
                  صافي اليوم التجاري
                </span>
                <Money value={today.revenue - today.suppliedValue} decimals={0} className="font-bold" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-[11.5px]">
                إيراد مبيعات اليوم ناقص تكلفة الاستلام المسجّلة اليوم.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-whisper sm:rounded-3xl sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold text-foreground sm:text-[16px]">آخر ما حدث</h3>
          <History className="h-4.5 w-4.5 text-muted-foreground" />
        </div>

        <div className="mt-3 space-y-2 sm:mt-4">
          {latest.length ? (
            latest.map((log) => (
              <Link
                key={log.id}
                href="/audit"
                className="group flex items-start gap-2.5 rounded-xl border border-border/70 bg-canvas-sunken/45 p-2.5 transition-colors hover:bg-canvas-sunken sm:gap-3 sm:rounded-2xl sm:p-3"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-meadow-500 ring-4 ring-meadow-100 dark:ring-meadow-500/20" />
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
            <div className="rounded-2xl border border-dashed border-border p-5 text-center text-[12px] text-muted-foreground">
              سيظهر هنا آخر نشاط بعد أول عملية.
            </div>
          )}
        </div>
      </div>
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
    <div className="rounded-xl border border-border bg-card/80 p-3 sm:rounded-2xl sm:p-3.5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-[11.5px]">{label}</p>
          <div className="mt-1 truncate text-[17px] font-bold leading-tight tracking-tight text-foreground sm:text-[20px]">{value}</div>
        </div>
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-9 sm:w-9 sm:rounded-xl', toneClass)}>
          <Icon className="h-4 w-4 stroke-[1.7]" />
        </span>
      </div>
      <div className="mt-1.5 truncate text-[10.5px] text-muted-foreground sm:mt-2 sm:text-[11px]">{hint}</div>
    </div>
  );
}
