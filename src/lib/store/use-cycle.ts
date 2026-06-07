'use client';

import { useMemo } from 'react';
import { useErpStore } from './use-erp-store';
import { useDerived } from './use-derived';
import {
  cycleForDate,
  cycleOfMonth,
  cycleProgress,
  computeCycleStats,
  compareCycles,
  type CycleStats,
  type CycleWindow,
  type CycleProgress,
  type CycleComparisonRow,
} from '@/lib/domain/cycle';

export interface CycleBundle {
  now: Date;
  window: CycleWindow;
  progress: CycleProgress;
  stats: CycleStats;
  cycle1: { window: CycleWindow; stats: CycleStats };
  cycle2: { window: CycleWindow; stats: CycleStats };
  comparison: CycleComparisonRow[];
}

export function useCycle(): CycleBundle {
  const supplies = useErpStore((s) => s.supplies);
  const sales = useErpStore((s) => s.sales);
  const payments = useErpStore((s) => s.payments);
  const { inv } = useDerived();

  return useMemo(() => {
    const now = new Date();
    const window = cycleForDate(now);
    const progress = cycleProgress(window, now);
    const stats = computeCycleStats(window, supplies, sales, payments, inv.saleCogs);

    const w1 = cycleOfMonth(window.year, window.month, 1);
    const w2 = cycleOfMonth(window.year, window.month, 2);
    const s1 = computeCycleStats(w1, supplies, sales, payments, inv.saleCogs);
    const s2 = computeCycleStats(w2, supplies, sales, payments, inv.saleCogs);

    return {
      now,
      window,
      progress,
      stats,
      cycle1: { window: w1, stats: s1 },
      cycle2: { window: w2, stats: s2 },
      comparison: compareCycles(s1, s2),
    };
  }, [supplies, sales, payments, inv]);
}
