'use client';

import { ArrowRightLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Money, Liters } from '@/components/shared/money';
import type { SessionCarryForwardBalances } from '@/lib/domain/types';

export function CarryForwardBanner({ carry }: { carry: SessionCarryForwardBalances }) {
  const partyCount =
    carry.farmers.length + carry.customers.length + carry.employees.length + carry.external.length;

  return (
    <Card className="border-sun-200/80 bg-gradient-to-br from-sun-50/90 to-card">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-800">
            <ArrowRightLeft className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-foreground">أرصدة مُرحّلة من «{carry.fromSessionLabel}»</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {partyCount} طرف · تظهر في جداول التسوية حتى تُسدَّد أو تُحصَّل
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
          <div className="rounded-lg bg-card/80 px-3 py-2 ring-1 ring-border/60">
            <p className="text-muted-foreground">مخزون</p>
            <Liters value={carry.totals.openingStock} className="font-bold" />
          </div>
          <div className="rounded-lg bg-card/80 px-3 py-2 ring-1 ring-border/60">
            <p className="text-muted-foreground">علينا</p>
            <Money value={carry.totals.payables} decimals={0} className="font-bold text-rose-700" />
          </div>
          <div className="rounded-lg bg-card/80 px-3 py-2 ring-1 ring-border/60">
            <p className="text-muted-foreground">لنا</p>
            <Money value={carry.totals.receivables} decimals={0} className="font-bold text-meadow-700" />
          </div>
          <div className="rounded-lg bg-card/80 px-3 py-2 ring-1 ring-border/60">
            <p className="text-muted-foreground">فلاحون</p>
            <span className="text-[13px] font-bold">{carry.farmers.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
