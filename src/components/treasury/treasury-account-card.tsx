'use client';

import { Wallet, Landmark, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/shared/money';
import type { AccountBalance } from '@/lib/domain/treasury';
import { cn } from '@/lib/utils';

export function TreasuryAccountCard({
  account,
  onSelect,
  compact,
}: {
  account: AccountBalance;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const isVault = account.type === 'vault';
  const wrapperClass = cn('w-full text-right', onSelect && 'active:scale-[0.99] md:pointer-events-none md:active:scale-100');

  const card = (
    <Card className={cn(compact ? 'shadow-whisper' : '', account.belowMin && 'border-rose-200/70')}>
        <CardHeader className={cn('pb-2', compact ? 'p-3.5 pb-2' : 'pb-3')}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1',
                  isVault ? 'bg-meadow-50 text-meadow-700 ring-meadow-100' : 'bg-navy-50 text-navy-700 ring-navy-100',
                )}
              >
                {isVault ? <Wallet className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <CardTitle className="truncate text-[14px]">{account.name}</CardTitle>
                <p className="font-mono text-[10.5px] text-muted-foreground" dir="ltr">{account.code}</p>
              </div>
            </div>
            {account.belowMin ? (
              <Badge variant="danger" className="shrink-0 text-[10px]">تحت الحد</Badge>
            ) : (
              <Badge variant={isVault ? 'success' : 'info'} className="shrink-0 text-[10px]">
                {isVault ? 'خزنة' : 'بنك'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className={cn('space-y-2.5', compact ? 'px-3.5 pb-3.5 pt-0' : 'space-y-3')}>
          <div>
            <p className="text-[11px] text-muted-foreground">الرصيد المتاح</p>
            <Money value={account.balance} decimals={0} className="text-[20px] font-bold sm:text-[22px]" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg bg-meadow-50/60 px-2.5 py-1.5">
              <span className="flex items-center gap-1 text-meadow-700">
                <ArrowDownLeft className="h-3 w-3" /> وارد
              </span>
              <Money value={account.inflow} decimals={0} className="text-[12px] font-semibold" muted />
            </div>
            <div className="rounded-lg bg-rose-50/50 px-2.5 py-1.5">
              <span className="flex items-center gap-1 text-rose-600">
                <ArrowUpRight className="h-3 w-3" /> صادر
              </span>
              <Money value={account.outflow} decimals={0} className="text-[12px] font-semibold" muted />
            </div>
          </div>
          {onSelect ? (
            <p className="text-[10.5px] font-medium text-meadow-700 md:hidden">اضغط لعرض الحركات ←</p>
          ) : null}
          <p className={cn('text-[11px] text-muted-foreground', onSelect && 'hidden md:block')}>
            افتتاحي: <Money value={account.opening} decimals={0} className="inline text-[11px]" />
          </p>
        </CardContent>
      </Card>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={wrapperClass}>
        {card}
      </button>
    );
  }

  return <div className={wrapperClass}>{card}</div>;
}
