'use client';

import { useState } from 'react';
import { Scale, Plus, Minus, Equal, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import type { AdjustedNetPosition } from '@/lib/domain/treasury';
import { cn } from '@/lib/utils';

const OP_ICON = {
  base: Equal,
  add: Plus,
  subtract: Minus,
} as const;

const OP_STYLE = {
  base: 'bg-navy-50 text-navy-800 ring-navy-100',
  add: 'bg-meadow-50 text-meadow-800 ring-meadow-100',
  subtract: 'bg-rose-50 text-rose-800 ring-rose-100',
} as const;

export function SettlementSummaryCard({ position }: { position: AdjustedNetPosition }) {
  const finalPositive = position.finalBalance >= 0;
  const [stepsOpen, setStepsOpen] = useState(false);

  return (
    <Card className="overflow-hidden border-meadow-200/50 bg-gradient-to-br from-card via-card to-meadow-50/25">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Scale className="h-4.5 w-4.5 shrink-0 text-meadow-700" />
              الرصيد النهائي بعد التسويات
            </CardTitle>
            <CardDescription className="mt-1 hidden sm:block">
              تسوية متسلسلة: النقد + ما لنا + المخزون − ما علينا
            </CardDescription>
          </div>
        </div>

        {/* ملخص سريع على الجوال */}
        <div
          className={cn(
            'rounded-xl px-4 py-3.5 md:hidden',
            finalPositive ? 'bg-meadow-100/90 ring-1 ring-meadow-200' : 'bg-rose-50/90 ring-1 ring-rose-200',
          )}
        >
          <p className="text-[11px] font-medium text-muted-foreground">الرصيد النهائي</p>
          <Money
            value={position.finalBalance}
            decimals={0}
            className={cn('mt-0.5 text-[24px] font-bold', finalPositive ? 'text-meadow-900' : 'text-rose-800')}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            نقد متاح <Money value={position.cash} decimals={0} className="inline text-[11px] font-semibold" />
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 sm:space-y-4 sm:pt-0">
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full justify-between px-2 text-[12.5px] font-semibold md:hidden"
          onClick={() => setStepsOpen((o) => !o)}
        >
          تفاصيل خطوات التسوية
          <ChevronDown className={cn('h-4 w-4 transition-transform', stepsOpen && 'rotate-180')} />
        </Button>

        <div className={cn('space-y-2', !stepsOpen && 'hidden md:block')}>
          {position.steps.map((step, i) => {
            const Icon = OP_ICON[step.op];
            const isLast = i === position.steps.length - 1;
            return (
              <div key={step.label}>
                <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card/80 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1',
                      OP_STYLE[step.op],
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold leading-snug text-foreground sm:text-[13px]">{step.label}</p>
                    {step.detail ? (
                      <p className="mt-0.5 hidden text-[11px] leading-relaxed text-muted-foreground sm:block">{step.detail}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-left">
                    {step.op !== 'base' ? (
                      <p className="text-[10px] font-medium text-muted-foreground">{step.op === 'add' ? '+' : '−'}</p>
                    ) : null}
                    <Money
                      value={step.amount}
                      decimals={0}
                      className={cn(
                        'text-[12.5px] font-bold sm:text-[13px]',
                        step.op === 'subtract' ? 'text-rose-700' : 'text-foreground',
                      )}
                    />
                  </div>
                </div>
                {!isLast ? (
                  <div className="hidden items-center justify-end gap-2 py-1 pr-2 text-[11px] text-muted-foreground sm:flex">
                    <span>الرصيد بعد هذه الخطوة</span>
                    <Money value={step.runningTotal} decimals={0} className="font-semibold text-foreground" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          className={cn(
            'hidden flex-col gap-1 rounded-xl px-4 py-4 sm:flex sm:flex-row sm:items-center sm:justify-between',
            finalPositive ? 'bg-meadow-100/80 ring-1 ring-meadow-200' : 'bg-rose-50/90 ring-1 ring-rose-200',
          )}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              الرصيد النهائي بعد جميع التسويات
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {finalPositive ? 'مركز مالي إيجابي' : 'عجز بعد احتساب الالتزامات والأصول'}
            </p>
          </div>
          <Money
            value={position.finalBalance}
            decimals={0}
            className={cn('text-2xl font-bold sm:text-[26px]', finalPositive ? 'text-meadow-900' : 'text-rose-800')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
