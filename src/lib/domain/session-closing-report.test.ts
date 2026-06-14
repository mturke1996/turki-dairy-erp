import { describe, expect, it } from 'vitest';
import { buildSessionClosingReportProps } from './session-closing-report';
import type { ErpData, SessionSummary } from './calculations';
import type { Customer, Farmer, Session } from './types';

const session: Session = {
  id: 'cycle-2026-06-1',
  label: 'يونيو 2026 — الدورة الأولى',
  periodFrom: '2026-06-01',
  periodTo: '2026-06-15',
  status: 'open',
  cycleNumber: 1,
  openingStock: 100,
  openingAvgCost: 2,
  openingPayables: 0,
  openingReceivables: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
};

const summary: SessionSummary = {
  session,
  supplyQty: 500,
  supplyCost: 2500,
  supplyCount: 1,
  salesQty: 400,
  salesRevenue: 3200,
  externalIncome: 0,
  salesCount: 1,
  cogs: 2000,
  grossProfit: 1200,
  marginPct: 37.5,
  wasteLosses: 0,
  operatingExpenses: 200,
  salaries: 500,
  netProfit: 500,
  netMarginPct: 15.6,
  farmerPayments: 1500,
  customerReceipts: 2000,
  openingStock: 100,
  closingStock: 200,
};

const baseData: ErpData = {
  sessions: [session],
  activeSessionId: session.id,
  farmers: [
    {
      id: 'f1',
      code: 'F-001',
      fullName: 'فلاح أ',
      region: 'طرابلس',
      phone: '091',
      livestockType: 'cow',
      livestockCount: 10,
      qualityTier: 'A',
      defaultBuyPrice: 5,
      status: 'active',
      onboardingDate: '2026-01-01',
      createdAt: '2026-01-01',
    } satisfies Farmer,
  ],
  customers: [
    {
      id: 'c1',
      code: 'C-001',
      entityName: 'عميل أ',
      entityType: 'factory',
      phone: '092',
      priceTier: 'standard',
      paymentTerms: 30,
      defaultSellPrice: 8,
      creditLimit: 10000,
      onHold: false,
      onboardingDate: '2026-01-01',
      createdAt: '2026-01-01',
    } satisfies Customer,
  ],
  employees: [],
  supplies: [
    {
      id: 's1',
      ref: 'SUP-001',
      farmerId: 'f1',
      sessionId: session.id,
      date: '2026-06-15',
      quantity: 500,
      unitPrice: 5,
      total: 2500,
      qualityTier: 'A',
      createdAt: '2026-06-15',
    },
  ],
  sales: [
    {
      id: 'sl1',
      ref: 'SAL-001',
      customerId: 'c1',
      sessionId: session.id,
      date: '2026-06-15',
      quantity: 400,
      unitPrice: 8,
      total: 3200,
      dueDate: '2026-06-30',
      createdAt: '2026-06-15',
    },
  ],
  payments: [
    {
      id: 'p1',
      ref: 'PAY-001',
      kind: 'farmer_payment',
      partyId: 'f1',
      sessionId: session.id,
      amount: 1500,
      method: 'cash',
      date: '2026-06-16',
      createdAt: '2026-06-16',
    },
    {
      id: 'p2',
      ref: 'PAY-002',
      kind: 'customer_payment',
      partyId: 'c1',
      sessionId: session.id,
      amount: 2000,
      method: 'cash',
      date: '2026-06-17',
      createdAt: '2026-06-17',
    },
  ],
  debtEntries: [],
  adjustments: [],
  expenses: [],
  payrollBatches: [],
  vaults: [],
  banks: [],
  cashMovements: [],
  externalIncomes: [],
  settings: { minStockThreshold: 0, defaultBuyPrice: 5, defaultSellPrice: 8 },
};

describe('buildSessionClosingReportProps', () => {
  it('builds settlement reconciliation from live session data', () => {
    const props = buildSessionClosingReportProps(baseData, session, summary);
    expect(props.settlement.farmerObligation).toBe(2500);
    expect(props.settlement.farmerSettled).toBe(1500);
    expect(props.settlement.farmerRemaining).toBe(1000);
    expect(props.settlement.customerObligation).toBe(3200);
    expect(props.settlement.customerCollected).toBe(2000);
    expect(props.settlement.customerRemaining).toBe(1200);
    expect(props.farmers).toHaveLength(1);
    expect(props.customers).toHaveLength(1);
    expect(props.nextSessionLabel).toContain('الدورة الثانية');
  });

  it('reconstructs customer settlement from archived session snapshot', () => {
    const archivedSession: Session = {
      ...session,
      status: 'archived',
      closedAt: '2026-06-15T18:00:00.000Z',
      archive: {
        summary: {
          supply: { transactions: 0, qty: 0, cost: 0 },
          sales: { transactions: 0, qty: 0, revenue: 0, cogs: 0 },
          profit: { gross: 0, marginPct: 0 },
          inventory: { opening: 0, closing: 0, variance: 0 },
          cash: { farmerPayments: 0, customerReceipts: 0 },
        },
        balancesSnapshot: {
          farmers: [],
          customers: [
            {
              id: 'c1',
              name: 'عميل 1',
              balance: 1200,
              carriedForward: 500,
              soldValue: 2700,
              receivedAmount: 2000,
              status: 'partial',
            },
          ],
          employees: [],
          external: [],
        },
        carryForward: { openingStock: 0, payables: 0, receivables: 1200 },
      },
    };
    const props = buildSessionClosingReportProps(baseData, archivedSession, summary);
    expect(props.customers[0]?.obligation).toBe(3200);
    expect(props.customers[0]?.settled).toBe(2000);
    expect(props.customers[0]?.balance).toBe(1200);
    expect(props.settlement.customerObligation).toBe(3200);
    expect(props.settlement.customerCollected).toBe(2000);
  });
});
