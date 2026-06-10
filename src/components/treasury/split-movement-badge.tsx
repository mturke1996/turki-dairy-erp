'use client';

import { Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/shared/money';
import { formatSplitMovementHint, getSplitSiblings } from '@/lib/domain/treasury-splits';
import { accountLabel } from '@/lib/domain/treasury';
import type { BankAccount, CashMovement, CashVault } from '@/lib/domain/types';

export function SplitMovementBadge({
  movement,
  allMovements,
  vaults,
  banks,
}: {
  movement: CashMovement;
  allMovements: CashMovement[];
  vaults: CashVault[];
  banks: BankAccount[];
}) {
  if (!movement.splitGroupId || !movement.splitCount || movement.splitCount < 2) return null;

  const hint = formatSplitMovementHint(movement, allMovements, vaults, banks);
  const siblings = getSplitSiblings(movement, allMovements);
  const others = siblings.filter((m) => m.id !== movement.id);

  return (
    <div className="mt-1.5 space-y-1 rounded-lg border border-navy-100/80 bg-navy-50/40 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="info" className="gap-1 text-[10px]">
          <Link2 className="h-3 w-3" aria-hidden />
          دفعة مجزّأة {movement.splitIndex}/{movement.splitCount}
        </Badge>
        {movement.splitTotalAmount ? (
          <span className="text-[10.5px] text-muted-foreground">
            الإجمالي <Money value={movement.splitTotalAmount} decimals={0} className="inline font-semibold" />
          </span>
        ) : null}
      </div>
      {others.length ? (
        <p className="text-[11px] leading-relaxed text-navy-700">
          {others.map((m, i) => (
            <span key={m.id}>
              {i > 0 ? ' · ' : 'الجزء الآخر: '}
              {accountLabel(m.sourceType, m.sourceId, vaults, banks)}{' '}
              <Money value={m.amount} decimals={0} className="inline font-semibold" />
              <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                {' '}
                ({m.ref})
              </span>
            </span>
          ))}
        </p>
      ) : null}
      {hint ? <p className="text-[10.5px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
