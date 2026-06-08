'use client';

import { useMemo } from 'react';
import { useErpStore } from './use-erp-store';
import { computeDerived, type DerivedData, type ErpData } from '@/lib/domain/calculations';

/** يجمّع شريحة البيانات الخام من المتجر بمراجع مستقرة. */
export function useErpData(): ErpData {
  const sessions = useErpStore((s) => s.sessions);
  const activeSessionId = useErpStore((s) => s.activeSessionId);
  const farmers = useErpStore((s) => s.farmers);
  const customers = useErpStore((s) => s.customers);
  const employees = useErpStore((s) => s.employees);
  const supplies = useErpStore((s) => s.supplies);
  const sales = useErpStore((s) => s.sales);
  const payments = useErpStore((s) => s.payments);
  const debtEntries = useErpStore((s) => s.debtEntries);
  const adjustments = useErpStore((s) => s.adjustments);
  const expenses = useErpStore((s) => s.expenses);
  const payrollBatches = useErpStore((s) => s.payrollBatches);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const cashMovements = useErpStore((s) => s.cashMovements);
  const settings = useErpStore((s) => s.settings);

  return useMemo(
    () => ({
      sessions,
      activeSessionId,
      farmers,
      customers,
      employees,
      supplies,
      sales,
      payments,
      debtEntries,
      adjustments,
      expenses,
      payrollBatches,
      vaults,
      banks,
      cashMovements,
      settings: {
        minStockThreshold: settings.minStockThreshold,
        defaultBuyPrice: settings.defaultBuyPrice,
        defaultSellPrice: settings.defaultSellPrice,
      },
    }),
    [
      sessions, activeSessionId, farmers, customers, employees, supplies, sales, payments, debtEntries, adjustments,
      expenses, payrollBatches, vaults, banks, cashMovements, settings,
    ],
  );
}

/** الحزمة الكاملة المشتقّة (مخزون، قيود، أرصدة، مؤشرات، تنبيهات) — مُذكّرة. */
export function useDerived(): DerivedData {
  const data = useErpData();
  return useMemo(() => computeDerived(data), [data]);
}

export function useHydrated(): boolean {
  return useErpStore((s) => s.hydrated);
}
