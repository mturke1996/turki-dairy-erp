'use client';

import Link from 'next/link';
import { Trash2, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  sessionId: string;
  className?: string;
}) {
  const hasSessionWaste = waste.sessionQty > 0;
  const recentForSession = waste.recent.filter((w) => w.sessionId === sessionId).slice(0, 5);

  return (
    <Card
      className={cn(
        'border-dashed',
        hasSessionWaste ? 'border-rose-200/80 bg-rose-50/20' : 'border-border bg-canvas-sunken/20',
        className,
      )}
    >
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                hasSessionWaste ? 'bg-rose-100 text-rose-700' : 'bg-canvas-sunken text-muted-foreground',
              )}
            >
              <Trash2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">هدر الحليب — {sessionLabel}</p>
              <p className="text-[10.5px] text-muted-foreground">خسارة غير نقدية · تُخصم من المخزون وصافي الربح</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-muted-foreground">هدر الفترة</p>
              <p className="text-[13px] font-bold tabular-nums">
                <Liters value={waste.sessionQty} decimals={0} className="inline text-[13px]" />
                {waste.sessionValue > 0 ? (
                  <span className="mr-1.5 text-[11px] font-semibold text-rose-700">
                    · <Money value={waste.sessionValue} decimals={0} className="inline text-[11px]" />
                  </span>
                ) : null}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-muted-foreground">تراكمي</p>
              <p className="text-[12px] font-semibold tabular-nums text-muted-foreground">
                <Liters value={waste.totalQty} decimals={0} className="inline text-[12px]" />
                {waste.totalValue > 0 ? (
                  <span className="mr-1 text-[10.5px]">
                    · <Money value={waste.totalValue} decimals={0} className="inline text-[10.5px]" />
                  </span>
                ) : null}
              </p>
            </div>
            <Link
              href="/reports"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground sm:inline-flex sm:items-center sm:gap-0.5"
            >
              التقارير
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {waste.byReason.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
            {waste.byReason.slice(0, 4).map((r) => (
              <span
                key={r.reason}
                className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 text-[10.5px] ring-1 ring-border/80"
              >
                <span className="font-medium text-foreground">{r.reason}</span>
                <Liters value={r.qty} decimals={0} className="text-[10px] text-muted-foreground" />
              </span>
            ))}
          </div>
        ) : null}

        {hasSessionWaste && recentForSession.length > 0 ? (
          <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
            {recentForSession.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono text-[10px]" dir="ltr">
                    {w.ref}
                  </span>
                  {' · '}
                  {w.reason}
                  {' · '}
                  {formatShortDate(w.date)}
                </span>
                <span className="shrink-0 tabular-nums">
                  <Liters value={w.quantity} decimals={0} className="inline text-[10.5px]" />
                  {' '}
                  <Money value={w.value} decimals={0} className="inline text-[10.5px] font-semibold text-rose-700" />
                </span>
              </li>
            ))}
          </ul>
        ) : !hasSessionWaste ? (
          <p className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            لا هدر مسجّل في هذه الفترة — يُسجّل عبر «تسوية مخزون» بسبب تلف أو فساد.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
