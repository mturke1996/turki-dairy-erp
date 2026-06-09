import { describe, expect, it } from 'vitest';
import { debtBalanceContribution, debtRemainingAmount, isDebtFullySettled } from '@/lib/domain/debt';
import type { DebtEntry } from '@/lib/domain/types';

const base: DebtEntry = {
  id: 'd1',
  ref: 'DEB-2026-0001',
  sessionId: 's1',
  date: '2026-06-01',
  partyKind: 'farmer',
  partyId: 'f1',
  amount: 1000,
  direction: 'payable',
  createdAt: '2026-06-01',
};

describe('debt settlement', () => {
  it('counts full manual debt in balance', () => {
    expect(debtBalanceContribution(base)).toBe(1000);
  });

  it('ignores settled debt in balance', () => {
    expect(debtBalanceContribution({ ...base, amount: 0, settledAmount: 1000, settledAt: '2026-06-02' })).toBe(0);
  });

  it('tracks partial remaining', () => {
    const partial = { ...base, amount: 400, settledAmount: 600 };
    expect(debtRemainingAmount(partial)).toBe(400);
    expect(debtBalanceContribution(partial)).toBe(400);
    expect(isDebtFullySettled(partial)).toBe(false);
  });

  it('marks fully settled when amount is zero', () => {
    expect(isDebtFullySettled({ ...base, amount: 0, settledAt: '2026-06-02' })).toBe(true);
  });
});
