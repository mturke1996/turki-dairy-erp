import { describe, expect, it } from 'vitest';
import { accountBalance, computeTreasury } from '@/lib/domain/treasury';
import { journalForPayment } from '@/lib/domain/accounting';
import type { BankAccount, CashVault, Payment } from '@/lib/domain/types';
import {
  allocateSequentialRefs,
  buildSplitCashMovements,
  resolveTreasurySources,
  verifyReferenceMovements,
} from '@/lib/domain/treasury-splits';

const vault: CashVault = {
  id: 'v1',
  code: 'V-01',
  name: 'الخزنة الرئيسية',
  openingBalance: 50_000,
  isActive: true,
  createdAt: '2026-01-01',
};

const bank: BankAccount = {
  id: 'b1',
  code: 'B-01',
  bankName: 'مصرف الجمهورية',
  accountNumber: '123',
  accountHolder: 'المصنع',
  openingBalance: 100_000,
  isActive: true,
  createdAt: '2026-01-01',
};

describe('treasury splits integrity', () => {
  it('allocates unique sequential refs for split movements', () => {
    const refs = allocateSequentialRefs('CM', 2, [{ ref: 'CM-2026-0041' }]);
    expect(refs).toEqual(['CM-2026-0042', 'CM-2026-0043']);
  });

  it('deducts each account once — no double withdrawal from total cash', () => {
    const resolved = resolveTreasurySources({
      amount: 30_000,
      splits: [
        { sourceType: 'vault', sourceId: 'v1', amount: 15_000 },
        { sourceType: 'bank', sourceId: 'b1', amount: 15_000 },
      ],
    });
    expect(resolved.mode).toBe('split');
    if (resolved.mode !== 'split') return;

    const movements = buildSplitCashMovements({
      parts: resolved.parts,
      totalAmount: 30_000,
      splitGroupId: resolved.splitGroupId,
      movementType: 'farmer_payout',
      direction: 'out',
      referenceType: 'payment',
      referenceId: 'pay-1',
      baseDescription: 'دفعة للفلاح أحمد',
      sessionId: 's1',
      date: '2026-06-10',
      vaults: [vault],
      banks: [bank],
      existingRefs: [],
      createId: () => `cm-${Math.random()}`,
    });

    expect(movements).toHaveLength(2);
    expect(new Set(movements.map((m) => m.ref)).size).toBe(2);
    expect(movements[0].splitGroupId).toBe(movements[1].splitGroupId);
    expect(movements[0].splitTotalAmount).toBe(30_000);

    const integrity = verifyReferenceMovements(movements, 'payment', 'pay-1', 30_000);
    expect(integrity.ok).toBe(true);

    const vaultBal = accountBalance('vault', 'v1', [vault], [bank], movements);
    const bankBal = accountBalance('bank', 'b1', [vault], [bank], movements);
    expect(vaultBal).toBe(35_000);
    expect(bankBal).toBe(85_000);

    const treasury = computeTreasury([vault], [bank], movements);
    expect(treasury.total).toBe(120_000);
    expect(treasury.totalVaults + treasury.totalBanks).toBe(
      vault.openingBalance + bank.openingBalance - 30_000,
    );
  });

  it('creates one journal entry for full payment amount — not per split movement', () => {
    const payment: Payment = {
      id: 'pay-1',
      ref: 'PAY-2026-0001',
      kind: 'farmer_payment',
      partyId: 'f1',
      sessionId: 's1',
      date: '2026-06-10',
      amount: 30_000,
      method: 'cash',
      paidFromType: 'vault',
      paidFromId: 'v1',
      treasurySplits: [
        { sourceType: 'vault', sourceId: 'v1', amount: 15_000 },
        { sourceType: 'bank', sourceId: 'b1', amount: 15_000 },
      ],
      createdAt: '2026-06-10',
    };

    const je = journalForPayment(payment);
    expect(je).not.toBeNull();
    const cashLine = je!.lines.find((l) => l.account === 'cash');
    expect(cashLine?.credit).toBe(30_000);
    expect(je!.lines.filter((l) => l.account === 'cash')).toHaveLength(1);
  });

  it('rejects split when parts do not sum to total', () => {
    expect(() =>
      buildSplitCashMovements({
        parts: [
          { sourceType: 'vault', sourceId: 'v1', amount: 10_000 },
          { sourceType: 'bank', sourceId: 'b1', amount: 10_000 },
        ],
        totalAmount: 30_000,
        splitGroupId: 'split-x',
        movementType: 'farmer_payout',
        direction: 'out',
        referenceType: 'payment',
        referenceId: 'pay-1',
        baseDescription: 'test',
        sessionId: 's1',
        date: '2026-06-10',
        vaults: [vault],
        banks: [bank],
        existingRefs: [],
        createId: () => 'cm-1',
      }),
    ).toThrow();
  });
});
