'use client';

import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarRange,
  ChevronLeft,
  Droplets,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Money, Liters } from '@/components/shared/money';
import type { SessionSummary } from '@/lib/domain/calculations';
import { formatNumber } from '@/lib/utils';

export function SessionSnapshotCard({
  sessionLabel,
  summary,
}: {
  sessionLabel: string;
  summary: SessionSummary | undefined;
}) {
  const s = summary;

  const rows = [
    {
      icon: ArrowDownToLine,
      label: 'استلام الفترة',
      primary: <Liters value={s?.supplyQty ?? 0} decimals={0} className="text-[13px] font-bold" />,
      secondary: <Money value={s?.supplyCost ?? 0} decimals={0} className="text-[11px] text-muted-foreground" />,
      tone: 'text-meadow-700 bg-meadow-50 ring-meadow-100',
    },
    {
      icon: ArrowUpFromLine,
      label: 'مبيعات الفترة',
      primary: <Liters value={s?.salesQty ?? 0} decimals={0} className="text-[13px] font-bold" />,
      secondary: <Money value={s?.salesRevenue ?? 0} decimals={0} className="text-[11px] text-muted-foreground" />,
      tone: 'text-navy-700 bg-navy-50 ring-navy-100',
    },
    {
      icon: TrendingUp,
      label: 'صافي الربح',
      primary: (
        <Money
          value={s?.netProfit ?? 0}
          decimals={0}
          className={`text-[13px] font-bold ${(s?.netProfit ?? 0) < 0 ? 'text-rose-700' : 'text-meadow-800'}`}
        />
      ),
      secondary: (
        <span className="text-[11px] text-muted-foreground">
          هامش {formatNumber(s?.netMarginPct ?? 0, 1)}%
        </span>
      ),
      tone: (s?.netProfit ?? 0) < 0 ? 'text-rose-700 bg-rose-50 ring-rose-100' : 'text-sun-800 bg-sun-50 ring-sun-100',
    },
    {
      icon: Droplets,
      label: 'رصيد المخزون',
      primary: <Liters value={s?.closingStock ?? 0} decimals={0} className="text-[13px] font-bold" />,
      secondary: (
        <span className="text-[11px] text-muted-foreground">
          افتتاحي <Liters value={s?.openingStock ?? 0} decimals={0} className="inline text-[11px]" />
        </span>
      ),
      tone: 'text-meadow-700 bg-meadow-50 ring-meadow-100',
    },
  ];

  return (
    <Card className="animate-fade-up">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <CalendarRange className="h-4.5 w-4.5 text-navy-600" />
            ملخص الفترة المالية
          </CardTitle>
          <CardDescription>{sessionLabel} — وارد، مبيعات، ربح، ومخزون</CardDescription>
        </div>
        <Link
          href="/sessions"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-canvas-sunken hover:text-foreground"
        >
          الدورات
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="rounded-xl border border-border bg-canvas-sunken/40 p-3">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${row.tone}`}>
                    <Icon className="h-4 w-4 stroke-[1.7]" />
                  </span>
                  <p className="text-[11px] font-medium text-muted-foreground">{row.label}</p>
                </div>
                <div className="mt-2 space-y-0.5">
                  {row.primary}
                  <div>{row.secondary}</div>
                </div>
              </div>
            );
          })}
        </div>

        {(s?.wasteLosses ?? 0) > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200/70 bg-rose-50/40 px-3 py-2.5 text-[12px]">
            <span className="flex items-center gap-2 font-medium text-rose-800">
              <Trash2 className="h-4 w-4" />
              هدر الحليب في الفترة
            </span>
            <Money value={s!.wasteLosses} decimals={0} className="font-bold text-rose-700" />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded-lg bg-navy-50 px-3 py-1.5 text-[11.5px] font-semibold text-navy-800 ring-1 ring-navy-100 transition-colors hover:bg-navy-100"
          >
            التقارير المالية
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-canvas-sunken hover:text-foreground"
          >
            حركة المخزون
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
