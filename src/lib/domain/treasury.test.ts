import { describe, expect, it } from 'vitest';
import { accountBalance, computeAdjustedNetPosition, computeTreasury } from '@/lib/domain/treasury';
import type { CashMovement, CashVault } from '@/lib/domain/types';

describe('computeAdjustedNetPosition', () => {
  it('applies sequential settlement formula', () => {
    const r = computeAdjustedNetPosition({
      cash: 100_000,
      receivables: 30_000,
      inventoryValue: 50_000,
      payables: 20_000,
    });
    expect(r.finalBalance).toBe(160_000);
    expect(r.steps).toHaveLength(4);
    expect(r.steps[0].runningTotal).toBe(100_000);
    expect(r.steps[1].runningTotal).toBe(130_000);
    expect(r.steps[2].runningTotal).toBe(180_000);
    expect(r.steps[3].runningTotal).toBe(160_000);
  });
});

describe('debt treasury link', () => {
  const vault: CashVault = {
    id: 'v1',
    code: 'V-01',
    name: 'الخزينة الرئيسية',
    openingBalance: 10_000,
    isActive: true,
    createdAt: '2026-01-01',
  };

  const debtDisbursement: CashMovement = {
    id: 'cm-1',
    ref: 'CM-001',
    movementType: 'expense',
    sourceType: 'vault',
    sourceId: 'v1',
    amount: 2_500,
    direction: 'out',
    referenceType: 'debt',
    referenceId: 'deb-1',
    description: 'تسجيل دين مع صرف',
    sessionId: 's1',
    date: '2026-06-01',
    createdAt: '2026-06-01',
  };

  it('reduces vault balance when debt is recorded with cash disbursement', () => {
    const bal = accountBalance('vault', 'v1', [vault], [], [debtDisbursement]);
    expect(bal).toBe(7_500);
    const treasury = computeTreasury([vault], [], [debtDisbursement]);
    expect(treasury.total).toBe(7_500);
  });
});
