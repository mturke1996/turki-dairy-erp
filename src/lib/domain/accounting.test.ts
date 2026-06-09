import { describe, expect, it } from 'vitest';
import { journalForSupply, buildTrialBalance, computePnL, journalForDebtEntry, journalForExternalIncome, journalForPayment } from '@/lib/domain/accounting';

describe('accounting', () => {
  it('journalForSupply balances debit and credit', () => {
    const entry = journalForSupply({
      id: 's1',
      ref: 'SUP-1',
      farmerId: 'f1',
      sessionId: 'sess',
      date: '2026-06-01',
      quantity: 100,
      unitPrice: 2,
      total: 200,
      qualityTier: 'A',
      createdAt: '2026-06-01',
    });
    const debit = entry.lines.reduce((s, l) => s + l.debit, 0);
    const credit = entry.lines.reduce((s, l) => s + l.credit, 0);
    expect(debit).toBe(credit);
    expect(debit).toBe(200);
  });

  it('buildTrialBalance reports balanced books', () => {
    const entry = journalForSupply({
      id: 's1',
      ref: 'SUP-1',
      farmerId: 'f1',
      sessionId: 'sess',
      date: '2026-06-01',
      quantity: 50,
      unitPrice: 1.5,
      total: 75,
      qualityTier: 'B',
      createdAt: '2026-06-01',
    });
    const tb = buildTrialBalance([entry]);
    expect(tb.balanced).toBe(true);
  });

  it('computePnL calculates margin', () => {
    const pnl = computePnL(1000, 600);
    expect(pnl.grossProfit).toBe(400);
    expect(pnl.marginPct).toBe(40);
  });

  it('journalForDebtEntry balances payable farmer debt', () => {
    const entry = journalForDebtEntry({
      id: 'd1',
      ref: 'DEB-1',
      sessionId: 's1',
      date: '2026-06-01',
      partyKind: 'farmer',
      partyId: 'f1',
      amount: 500,
      direction: 'payable',
      createdAt: '2026-06-01',
    });
    expect(entry).not.toBeNull();
    const debit = entry!.lines.reduce((s, l) => s + l.debit, 0);
    const credit = entry!.lines.reduce((s, l) => s + l.credit, 0);
    expect(debit).toBe(credit);
    expect(debit).toBe(500);
  });

  it('journalForExternalIncome balances', () => {
    const entry = journalForExternalIncome({
      id: 'i1',
      ref: 'INC-1',
      sessionId: 's1',
      date: '2026-06-01',
      amount: 300,
      description: 'إيجار',
      destinationType: 'vault',
      destinationId: 'v1',
      createdAt: '2026-06-01',
    });
    const tb = buildTrialBalance([entry]);
    expect(tb.balanced).toBe(true);
  });

  it('journalForPayment balances employee advance', () => {
    const entry = journalForPayment({
      id: 'p1',
      ref: 'ADV-1',
      sessionId: 's1',
      date: '2026-06-01',
      kind: 'employee_advance',
      partyId: 'e1',
      amount: 250,
      method: 'cash',
      paidFromType: 'vault',
      paidFromId: 'v1',
      createdAt: '2026-06-01',
    });
    expect(entry).not.toBeNull();
    const tb = buildTrialBalance([entry!]);
    expect(tb.balanced).toBe(true);
  });
});
