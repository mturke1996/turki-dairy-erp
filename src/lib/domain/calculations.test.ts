import { describe, expect, it } from 'vitest';
import { computeFarmerSessionStats } from '@/lib/domain/calculations';
import type { Farmer, Payment, SupplyTransaction } from '@/lib/domain/types';

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
});
