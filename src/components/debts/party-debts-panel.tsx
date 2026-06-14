'use client';

import { useMemo } from 'react';
import { CheckCircle2, HandCoins } from 'lucide-react';
import { PartyDebtList } from '@/components/debts/party-debt-list';
import { filterDebtsByStatus } from '@/lib/domain/debt';
import type { DebtEntry } from '@/lib/domain/types';

export function PartyDebtsPanel({
  entries,
  canSettle = true,
}: {
  entries: DebtEntry[];
  canSettle?: boolean;
}) {
  const openCount = useMemo(() => filterDebtsByStatus(entries, 'open').length, [entries]);
  const settledCount = useMemo(() => filterDebtsByStatus(entries, 'settled').length, [entries]);

  return (
    <div className="space-y-8">
      <section aria-labelledby="party-debts-open">
        <div className="mb-3 flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-muted-foreground" />
          <h3 id="party-debts-open" className="text-[13px] font-semibold text-foreground">
            ديون قائمة
          </h3>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            {openCount}
          </span>
        </div>
        <PartyDebtList
          entries={entries}
          status="open"
          canSettle={canSettle}
          emptyTitle="لا ديون قائمة"
          emptyDescription="عند تسجيل دين جديد يظهر هنا حتى تتم تسويته."
        />
      </section>

      {settledCount > 0 ? (
        <section
          aria-labelledby="party-debts-settled"
          className="rounded-xl border border-meadow-200/50 bg-meadow-50/15 p-4 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-meadow-700" />
            <h3 id="party-debts-settled" className="text-[13px] font-semibold text-meadow-900">
              ديون مُسَدَّدة
            </h3>
            <span className="rounded-full bg-meadow-100 px-2 py-0.5 text-[11px] font-medium text-meadow-800">
              {settledCount}
            </span>
          </div>
          <PartyDebtList
            entries={entries}
            status="settled"
            canSettle={false}
            emptyTitle="لا ديون مُسَدَّدة"
          />
        </section>
      ) : null}
    </div>
  );
}
