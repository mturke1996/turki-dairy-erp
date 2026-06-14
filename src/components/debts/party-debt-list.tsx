'use client';

import { useState } from 'react';
import { HandCoins, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { DebtSettleDialog } from '@/components/debts/debt-settle-dialog';
import {
  DEBT_DIRECTION_LABELS,
  debtRemainingAmount,
  isDebtFullySettled,
  resolveDebtDirection,
  type DebtListFilter,
} from '@/lib/domain/debt';
import type { DebtEntry } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

export function PartyDebtList({
  entries,
  status = 'open',
  canSettle = true,
  emptyTitle = 'لا ديون مسجّلة',
  emptyDescription,
}: {
  entries: DebtEntry[];
  status?: DebtListFilter;
  canSettle?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [settleEntry, setSettleEntry] = useState<DebtEntry | null>(null);

  const filtered =
    status === 'all'
      ? entries
      : entries.filter((e) =>
          status === 'open' ? !isDebtFullySettled(e) : isDebtFullySettled(e),
        );

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  if (!sorted.length) {
    return (
      <EmptyState
        icon={HandCoins}
        title={emptyTitle}
        description={emptyDescription ?? 'الديون المسجّلة تظهر هنا عند إضافتها من صفحة الديون.'}
      />
    );
  }

  return (
    <>
      <ul className="space-y-2.5">
        {sorted.map((entry) => {
          const settled = isDebtFullySettled(entry);
          const remaining = debtRemainingAmount(entry);
          const original = remaining + (entry.settledAmount ?? 0);
          const direction = resolveDebtDirection(entry);

          return (
            <li
              key={entry.id}
              className={cn(
                'rounded-xl border border-border bg-card p-4',
                settled && 'border-meadow-200/60 bg-meadow-50/25',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10.5px] text-muted-foreground" dir="ltr">
                      {entry.ref}
                    </span>
                    <Badge
                      variant={direction === 'payable' ? 'danger' : 'success'}
                      className="text-[10px]"
                    >
                      {DEBT_DIRECTION_LABELS[direction]}
                    </Badge>
                    {settled ? (
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        مُسَدَّد
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">
                        قائم
                      </Badge>
                    )}
                  </div>
                  {entry.description ? (
                    <p className="mt-1.5 line-clamp-2 text-[13px] text-foreground">
                      {entry.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatShortDate(entry.date)}
                    {settled && entry.settledAt ? (
                      <span className="mr-2 text-meadow-700">· تُسَدَّد {formatShortDate(entry.settledAt)}</span>
                    ) : null}
                    {(entry.settledAmount ?? 0) > 0.01 && !settled ? (
                      <span className="mr-2">
                        · مُسَدَّد {Math.round(entry.settledAmount ?? 0).toLocaleString('ar-LY')} من{' '}
                        {Math.round(original).toLocaleString('ar-LY')}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="shrink-0 text-left">
                  {settled ? (
                    <Money
                      value={entry.settledAmount ?? original}
                      decimals={0}
                      className="text-[14px] font-semibold text-meadow-800"
                    />
                  ) : (
                    <>
                      <Money value={remaining} decimals={0} className="text-[16px] font-bold" />
                      {(entry.settledAmount ?? 0) > 0.01 ? (
                        <p className="text-[10px] text-muted-foreground">
                          من {Math.round(original).toLocaleString('ar-LY')}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {canSettle && !settled && remaining > 0.01 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="meadow"
                  className="mt-3 h-10 w-full gap-1.5 text-[13px] sm:w-auto"
                  onClick={() => setSettleEntry(entry)}
                >
                  <HandCoins className="h-4 w-4" />
                  تسوية ({Math.round(remaining).toLocaleString('ar-LY')})
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <DebtSettleDialog
        open={!!settleEntry}
        onOpenChange={(o) => !o && setSettleEntry(null)}
        entry={settleEntry}
      />
    </>
  );
}
