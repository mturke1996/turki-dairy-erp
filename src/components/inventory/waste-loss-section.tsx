'use client';

import Link from 'next/link';
import { Trash2, ChevronLeft, Droplets, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Money, Liters } from '@/components/shared/money';
import type { WasteSummary } from '@/lib/domain/calculations';
import { formatShortDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function WasteLossSection({
  waste,
  sessionLabel,
  sessionId,
  className,
}: {
  waste: WasteSummary;
  sessionLabel: string;
  /** null = عرض «كل الفترات» */
  sessionId: string | null;
  className?: string;
}) {
  const hasSessionWaste = waste.sessionQty > 0;
  const showCumulative = sessionId !== null;
  const avgUnitCost = hasSessionWaste ? waste.sessionValue / waste.sessionQty : 0;
  const recentForSession = (
    sessionId === null
      ? waste.recent
      : waste.recent.filter((w) => w.sessionId === sessionId)
  ).slice(0, 5);
  const maxReasonQty = Math.max(...waste.byReason.map((r) => r.qty), 1);

  return (
    <Card
      className={cn(
        'overflow-hidden shadow-whisper',
        hasSessionWaste ? 'border-rose-200/90' : 'border-border',
        className,
      )}
    >
      {hasSessionWaste ? (
        <div className="h-0.5 bg-rose-500/80" aria-hidden="true" />
      ) : null}

      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                  hasSessionWaste
                    ? 'bg-rose-50 text-rose-700 ring-rose-100'
                    : 'bg-canvas-sunken text-muted-foreground ring-border',
                )}
              >
                <Trash2 className="h-4 w-4 stroke-[1.7]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[14px] font-semibold tracking-tight text-foreground text-balance">
                    هدر الحليب
                  </h2>
                  <Badge variant="outline" className="h-5 px-2 text-[10px] font-medium">
                    {sessionLabel}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  خسارة غير نقدية — تُخصم من قيمة المخزون وصافي الربح دون مساس بالخزينة
                </p>
              </div>
            </div>

            <Link
              href="/reports"
              className="inline-flex shrink-0 items-center gap-0.5 self-start text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              التقارير المالية
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div
            className={cn(
              'grid gap-3',
              showCumulative ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
            )}
            role="group"
            aria-label="ملخص هدر الحليب"
          >
            <div
              className={cn(
                'rounded-xl p-3.5 ring-1',
                hasSessionWaste
                  ? 'bg-rose-50/70 ring-rose-100/90'
                  : 'bg-canvas-sunken/40 ring-border/80',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {showCumulative ? 'كمية الهدر — الفترة' : 'إجمالي الكمية المهدرة'}
                </p>
                <Droplets
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    hasSessionWaste ? 'text-rose-600/70' : 'text-muted-foreground/60',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-foreground">
                <Liters
                  value={waste.sessionQty}
                  decimals={0}
                  className={cn('text-[22px]', hasSessionWaste && 'text-rose-900')}
                />
              </div>
            </div>

            <div className="rounded-xl bg-card p-3.5 ring-1 ring-border/80">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground">قيمة الخسارة</p>
                <TrendingDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    hasSessionWaste ? 'text-rose-600/70' : 'text-muted-foreground/60',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div
                className={cn(
                  'mt-1.5 text-[22px] font-bold tabular-nums tracking-tight',
                  hasSessionWaste ? 'text-rose-800' : 'text-foreground',
                )}
              >
                <Money value={waste.sessionValue} decimals={2} className="text-[22px]" />
              </div>
              {hasSessionWaste && avgUnitCost > 0 ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  متوسط{' '}
                  <Money value={avgUnitCost} decimals={3} className="inline text-[10px]" />
                  {' / '}
                  لتر
                </p>
              ) : null}
            </div>

            {showCumulative ? (
              <div className="rounded-xl bg-canvas-sunken/50 p-3.5 ring-1 ring-border/70">
                <p className="text-[11px] font-medium text-muted-foreground">تراكمي — كل الفترات</p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
                  <Liters
                    value={waste.totalQty}
                    decimals={0}
                    className="text-[18px] font-bold text-foreground"
                  />
                  {waste.totalValue > 0 ? (
                    <Money
                      value={waste.totalValue}
                      decimals={2}
                      className="text-[13px] font-semibold text-muted-foreground"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {waste.byReason.length > 0 ? (
          <div className="border-t border-border/60 px-4 py-3.5 sm:px-5">
            <p className="mb-2.5 text-[11px] font-semibold text-foreground">توزيع حسب السبب</p>
            <ul className="space-y-2.5" aria-label="توزيع أسباب الهدر">
              {waste.byReason.slice(0, 5).map((r) => (
                <li key={r.reason}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                    <span className="min-w-0 truncate font-medium text-foreground">{r.reason}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      <Liters value={r.qty} decimals={0} className="inline text-[11px]" />
                      {r.value > 0 ? (
                        <>
                          {' · '}
                          <Money value={r.value} decimals={2} className="inline text-[11px]" />
                        </>
                      ) : null}
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-canvas-sunken"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-rose-400/75 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
                      style={{ width: `${Math.min(100, (r.qty / maxReasonQty) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasSessionWaste && recentForSession.length > 0 ? (
          <div className="border-t border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-[11px]">
                <caption className="sr-only">آخر عمليات هدر الحليب</caption>
                <thead>
                  <tr className="border-b border-border/50 bg-canvas-sunken/30 text-muted-foreground">
                    <th scope="col" className="px-4 py-2 text-right font-medium sm:px-5">
                      المرجع
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      السبب
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      التاريخ
                    </th>
                    <th scope="col" className="px-4 py-2 text-left font-medium sm:px-5">
                      الكمية · القيمة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentForSession.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-border/40 last:border-0 hover:bg-canvas-sunken/20"
                    >
                      <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground sm:px-5" dir="ltr">
                        {w.ref}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-foreground">{w.reason}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatShortDate(w.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-left tabular-nums sm:px-5">
                        <Liters value={w.quantity} decimals={0} className="inline text-[11px]" />
                        {' · '}
                        <Money
                          value={w.value}
                          decimals={2}
                          className="inline text-[11px] font-semibold text-rose-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !hasSessionWaste ? (
          <p className="border-t border-border/60 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground sm:px-5">
            لا هدر مسجّل في هذا النطاق — سجّله عبر «تسوية مخزون» مع سبب تلف أو فساد.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
