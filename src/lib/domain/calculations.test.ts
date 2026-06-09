import { describe, expect, it } from 'vitest';
import { computeFarmerSessionStats, buildSessionCarryForwardSnapshot } from '@/lib/domain/calculations';
import type { Farmer, Payment, Session, SupplyTransaction } from '@/lib/domain/types';

const farmer: Farmer = {
  id: 'f1',
  code: 'F-001',
  fullName: 'أحمد',
  region: 'طرابلس',
  phone: '091',
  livestockCount: 10,
  qualityTier: 'A',
  defaultBuyPrice: 2,
  status: 'active',
  onboardingDate: '2026-01-01',
  createdAt: '2026-01-01',
};

const sessionS2: Session = {
  id: 'sess2',
  label: 'يونيو — 2',
  periodFrom: '2026-06-16',
  periodTo: '2026-06-30',
  status: 'open',
  openingStock: 100,
  openingAvgCost: 2,
  openingPayables: 500,
  openingReceivables: 0,
  carryForwardBalances: {
    fromSessionId: 'sess1',
    fromSessionLabel: 'يونيو — 1',
    closedAt: '2026-06-16T00:00:00.000Z',
    farmers: [{ id: 'f1', name: 'أحمد', balance: 500 }],
    customers: [],
    employees: [],
    external: [],
    totals: { openingStock: 100, payables: 500, receivables: 0 },
  },
  createdAt: '2026-06-16',
};

describe('computeFarmerSessionStats', () => {
  it('excludes sample qty from billable value', () => {
    const supplies: SupplyTransaction[] = [
      {
        id: 's1', ref: 'SUP-1', farmerId: 'f1', sessionId: 'sess1', date: '2026-06-01',
        quantity: 100, sampleQty: 5, unitPrice: 2, total: 190, qualityTier: 'A', createdAt: '2026-06-01',
      },
    ];
    const stats = computeFarmerSessionStats(farmer, 'sess1', supplies, []);
    expect(stats.billableQty).toBe(95);
    expect(stats.suppliedValue).toBe(190);
    expect(stats.status).toBe('pending');
  });

  it('marks paid when settlement complete', () => {
    const supplies: SupplyTransaction[] = [
      {
        id: 's1', ref: 'SUP-1', farmerId: 'f1', sessionId: 'sess1', date: '2026-06-01',
        quantity: 50, unitPrice: 2, total: 100, qualityTier: 'A', createdAt: '2026-06-01',
      },
    ];
    const payments: Payment[] = [
      {
        id: 'p1', ref: 'PAY-1', kind: 'farmer_payment', partyId: 'f1', sessionId: 'sess1',
        date: '2026-06-10', amount: 100, method: 'cash', settlementComplete: true, createdAt: '2026-06-10',
      },
    ];
    const stats = computeFarmerSessionStats(farmer, 'sess1', supplies, payments);
    expect(stats.status).toBe('paid');
    expect(stats.balance).toBe(0);
  });

  it('includes carried forward balance in new session', () => {
    const stats = computeFarmerSessionStats(farmer, sessionS2, [], []);
    expect(stats.carriedForward).toBe(500);
    expect(stats.balance).toBe(500);
    expect(stats.status).toBe('pending');
  });

  it('reduces carried balance when payment recorded in new session', () => {
    const payments: Payment[] = [
      {
        id: 'p2', ref: 'PAY-2', kind: 'farmer_payment', partyId: 'f1', sessionId: 'sess2',
        date: '2026-06-17', amount: 200, method: 'cash', createdAt: '2026-06-17',
      },
    ];
    const stats = computeFarmerSessionStats(farmer, sessionS2, [], payments);
    expect(stats.balance).toBe(300);
    expect(stats.status).toBe('partial');
  });
});

describe('buildSessionCarryForwardSnapshot', () => {
  it('captures farmer payable balances', () => {
    const closing: Session = {
      id: 'sess1', label: 'يونيو — 1', periodFrom: '2026-06-01', periodTo: '2026-06-15',
      status: 'open', openingStock: 0, openingAvgCost: 2, openingPayables: 0, openingReceivables: 0,
      createdAt: '2026-06-01',
    };
    const snap = buildSessionCarryForwardSnapshot(
      {
        sessions: [closing],
        activeSessionId: closing.id,
        farmers: [farmer],
        customers: [],
        employees: [],
        supplies: [{
          id: 's1', ref: 'SUP-1', farmerId: 'f1', sessionId: 'sess1', date: '2026-06-01',
          quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-01',
        }],
        sales: [],
        payments: [],
        debtEntries: [],
        adjustments: [],
        expenses: [],
        payrollBatches: [],
        vaults: [],
        banks: [],
        cashMovements: [],
        settings: { minStockThreshold: 0, defaultBuyPrice: 2, defaultSellPrice: 2.5 },
      },
      closing,
      50,
    );
    expect(snap.farmers).toHaveLength(1);
    expect(snap.farmers[0].balance).toBe(200);
    expect(snap.totals.openingStock).toBe(50);
    expect(snap.totals.payables).toBe(200);
  });
});
