'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Scale,
  ChevronLeft,
  ChevronDown,
  Wallet,
  ArrowDownLeft,
  Warehouse,
  ArrowUpRight,
  Equal,
  Plus,
  Minus,
} from 'lucide-react';
import { Money } from '@/components/shared/money';
import { Button } from '@/components/ui/button';
import type { AdjustedNetPosition } from '@/lib/domain/treasury';
import { cn } from '@/lib/utils';

const FORMULA_PARTS = [
  { key: 'cash', label: 'النقد', icon: Wallet, tone: 'bg-navy-50 text-navy-800 ring-navy-100' },
  { key: 'receivables', label: 'لنا', icon: ArrowDownLeft, tone: 'bg-meadow-50 text-meadow-800 ring-meadow-100' },
  { key: 'inventory', label: 'المخزون', icon: Warehouse, tone: 'bg-sun-50 text-sun-800 ring-sun-100' },
  { key: 'payables', label: 'علينا', icon: ArrowUpRight, tone: 'bg-rose-50 text-rose-800 ring-rose-100' },
] as const;

function partValue(position: AdjustedNetPosition, key: (typeof FORMULA_PARTS)[number]['key']) {
  switch (key) {
    case 'cash':
      return position.cash;
    case 'receivables':
      return position.receivables;
    case 'inventory':
      return position.inventoryValue;
    case 'payables':
      return position.payables;
  }
}

export function NetPositionCard({ position }: { position: AdjustedNetPosition }) {
  const positive = position.finalBalance >= 0;
  const [stepsOpen, setStepsOpen] = useState(false);

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border lg:rounded-2xl',
        positive
          ? 'border-meadow-200/70 bg-gradient-to-br from-card via-card to-meadow-50/40'
          : 'border-rose-200/60 bg-gradient-to-br from-card via-card to-rose-50/35',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full blur-3xl sm:-left-16 sm:-top-16 sm:h-48 sm:w-48',
          positive ? 'bg-meadow-200/30' : 'bg-rose-200/25',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute -bottom-16 -right-8 h-40 w-40 rounded-full blur-3xl sm:-bottom-20 sm:-right-10 sm:h-56 sm:w-56',
          positive ? 'bg-navy-100/25' : 'bg-rose-100/20',
        )}
      />

      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-5">
          <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-meadow-100 text-meadow-800 ring-1 ring-meadow-200 sm:h-10 sm:w-10">
                  <Scale className="h-4.5 w-4.5 stroke-[1.7] sm:h-5 sm:w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-meadow-700 sm:text-[11px]">
                    المركز المالي
                  </p>
                  <h2 className="truncate text-[14px] font-bold text-foreground sm:text-[16px]">
                    الرصيد النهائي بعد التسويات
                  </h2>
                </div>
              </div>
              <Link
                href="/treasury"
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-canvas-sunken hover:text-foreground sm:text-[12px]"
              >
                التفاصيل
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>

            <div>
              <Money
                value={position.finalBalance}
                decimals={0}
                className={cn(
                  'text-[26px] font-bold tracking-tight sm:text-[32px] lg:text-[38px]',
                  positive ? 'text-meadow-900' : 'text-rose-800',
                )}
              />
              <p className="mt-1 text-[11.5px] text-muted-foreground sm:text-[12.5px]">
                {positive ? 'مركز مالي إيجابي بعد احتساب الأصول والالتزامات' : 'عجز بعد تسوية الديون والمخزون'}
              </p>
            </div>
          </div>

          {/* جوال: شبكة 2×2 بدل الشريط الأفقي الطويل */}
          <div className="w-full lg:hidden">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">مكوّنات المركز</p>
            <div className="grid grid-cols-2 gap-2">
              {FORMULA_PARTS.map((part) => {
                const Icon = part.icon;
                const value = partValue(position, part.key);
                return (
                  <div key={part.key} className={cn('flex flex-col rounded-xl px-2.5 py-2 ring-1', part.tone)}>
                    <span className="flex items-center gap-1 text-[10px] font-semibold">
                      <Icon className="h-3 w-3 shrink-0" />
                      {part.label}
                    </span>
                    <Money value={value} decimals={0} className="mt-0.5 text-[13px] font-bold" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* سطح المكتب: شريط المعادلة الأفقي */}
          <div className="hidden w-full lg:block lg:max-w-xl">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">المعادلة المتسلسلة</p>
            <div className="-mx-1 flex items-stretch gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
              {FORMULA_PARTS.map((part, i) => {
                const Icon = part.icon;
                const value = partValue(position, part.key);
                const op = i === 0 ? '=' : i === 3 ? '−' : '+';
                return (
                  <div key={part.key} className="flex shrink-0 items-center gap-1.5">
                    {i > 0 ? (
                      <span className="flex h-6 w-6 items-center justify-center text-[13px] font-bold text-muted-foreground">
                        {op}
                      </span>
                    ) : null}
                    <div className={cn('flex min-w-[96px] flex-col rounded-xl px-3 py-2 ring-1', part.tone)}>
                      <span className="flex items-center gap-1 text-[10px] font-semibold">
                        <Icon className="h-3 w-3 shrink-0" />
                        {part.label}
                      </span>
                      <Money value={value} decimals={0} className="mt-0.5 text-[14px] font-bold" />
                    </div>
                  </div>
                );
              })}
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center text-[13px] font-bold text-muted-foreground">=</span>
                <div
                  className={cn(
                    'flex min-w-[96px] flex-col rounded-xl px-3 py-2 ring-1',
                    positive ? 'bg-meadow-100/90 text-meadow-900 ring-meadow-200' : 'bg-rose-50 text-rose-900 ring-rose-200',
                  )}
                >
                  <span className="text-[10px] font-semibold">النهائي</span>
                  <Money value={position.finalBalance} decimals={0} className="mt-0.5 text-[14px] font-bold" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="mt-3 h-9 w-full justify-between px-2 text-[12px] font-semibold lg:hidden"
          onClick={() => setStepsOpen((o) => !o)}
        >
          خطوات الحساب المتسلسل
          <ChevronDown className={cn('h-4 w-4 transition-transform', stepsOpen && 'rotate-180')} />
        </Button>

        <div className={cn('mt-2 grid gap-2 sm:grid-cols-2 lg:mt-5 lg:grid-cols-4', !stepsOpen && 'hidden lg:grid')}>
          {position.steps.map((step) => {
            const Icon = step.op === 'base' ? Equal : step.op === 'add' ? Plus : Minus;
            return (
              <div
                key={step.label}
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/70 px-3 py-2.5 backdrop-blur-sm"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1',
                    step.op === 'base' && 'bg-navy-50 text-navy-800 ring-navy-100',
                    step.op === 'add' && 'bg-meadow-50 text-meadow-800 ring-meadow-100',
                    step.op === 'subtract' && 'bg-rose-50 text-rose-800 ring-rose-100',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold">{step.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    بعد: <Money value={step.runningTotal} decimals={0} className="inline text-[10px] font-semibold" />
                  </p>
                </div>
                <Money
                  value={step.amount}
                  decimals={0}
                  className={cn('shrink-0 text-[12px] font-bold', step.op === 'subtract' && 'text-rose-700')}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
