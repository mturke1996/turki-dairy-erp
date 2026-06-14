import { describe, expect, it } from 'vitest';
import {
  computeEmployeeAdvanceBalance,
  computeEmployeeDebtBreakdown,
  computeFarmerSessionStats,
  buildSessionCarryForwardSnapshot,
  computeDerived,
  computeWasteSummary,
} from '@/lib/domain/calculations';
import { buildInventoryLedger } from '@/lib/domain/inventory';
import { resolveAdjustmentReasonKind } from '@/lib/domain/constants';
import type {
  DebtEntry,
  Expense,
  Farmer,
  InventoryAdjustment,
  Payment,
  PayrollBatch,
  SaleTransaction,
  Session,
  SupplyTransaction,
} from '@/lib/domain/types';

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

describe('computeEmployeeDebtBreakdown', () => {
  const empId = 'e1';

  const advancePayment = (amount: number): Payment => ({
    id: 'pay-adv',
    ref: 'ADV-1',
    kind: 'employee_advance',
    partyId: empId,
    sessionId: 's1',
    date: '2026-06-01',
    amount,
    method: 'cash',
    createdAt: '2026-06-01',
  });

  const payrollLine = (advanceDeducted: number) => ({
    employeeId: empId,
    baseSalary: 1000,
    allowancesTotal: 0,
    grossSalary: 1000,
    bonusAmount: 0,
    attendanceDays: 30,
    absenceDays: 0,
    debtBefore: advanceDeducted,
    advanceDeducted,
    debtCarriedForward: 0,
    debtMode: 'deduct' as const,
    deductionsTotal: advanceDeducted,
    netSalary: 1000 - advanceDeducted,
  });

  it('ignores advance deductions on draft batches', () => {
    const batches: PayrollBatch[] = [
      {
        id: 'pb-draft',
        ref: 'PR-1',
        label: 'مسودة',
        payrollType: 'monthly',
        periodFrom: '2026-06-01',
        periodTo: '2026-06-30',
        status: 'draft',
        sessionId: 's1',
        lines: [payrollLine(400)],
        totalAmount: 600,
        createdAt: '2026-06-01',
      },
    ];
    const balance = computeEmployeeAdvanceBalance(empId, [advancePayment(500)], batches, []);
    expect(balance).toBe(500);
  });

  it('counts advance deductions only after payroll is paid', () => {
    const batches: PayrollBatch[] = [
      {
        id: 'pb-paid',
        ref: 'PR-2',
        label: 'مصروف',
        payrollType: 'monthly',
        periodFrom: '2026-06-01',
        periodTo: '2026-06-30',
        status: 'paid',
        sessionId: 's1',
        lines: [payrollLine(300)],
        totalAmount: 700,
        paidAt: '2026-06-30',
        createdAt: '2026-06-01',
      },
    ];
    const breakdown = computeEmployeeDebtBreakdown(empId, [advancePayment(500)], batches, []);
    expect(breakdown.advancesTotal).toBe(500);
    expect(breakdown.advancesRecovered).toBe(300);
    expect(breakdown.advancesRemaining).toBe(200);
    expect(breakdown.totalOwed).toBe(200);
  });

  it('combines remaining advances with registered employee debt', () => {
    const debt: DebtEntry = {
      id: 'de1',
      ref: 'DEBT-1',
      partyKind: 'employee',
      partyId: empId,
      sessionId: 's1',
      date: '2026-06-05',
      amount: 150,
      direction: 'receivable',
      createdAt: '2026-06-05',
    };
    const breakdown = computeEmployeeDebtBreakdown(empId, [advancePayment(200)], [], [debt]);
    expect(breakdown.advancesRemaining).toBe(200);
    expect(breakdown.registeredDebt).toBe(150);
    expect(breakdown.totalOwed).toBe(350);
  });
});

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

  it('marks paid when balance is fully settled', () => {
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

  it('stays partial when settlement complete flag set but balance remains', () => {
    const supplies: SupplyTransaction[] = [
      {
        id: 's1', ref: 'SUP-1', farmerId: 'f1', sessionId: 'sess1', date: '2026-06-01',
        quantity: 50, unitPrice: 2, total: 100, qualityTier: 'A', createdAt: '2026-06-01',
      },
    ];
    const payments: Payment[] = [
      {
        id: 'p1', ref: 'PAY-1', kind: 'farmer_payment', partyId: 'f1', sessionId: 'sess1',
        date: '2026-06-10', amount: 50, method: 'cash', settlementComplete: true, createdAt: '2026-06-10',
      },
    ];
    const stats = computeFarmerSessionStats(farmer, 'sess1', supplies, payments);
    expect(stats.status).toBe('partial');
    expect(stats.balance).toBe(50);
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

describe('computeDerived adjustedNetPosition', () => {
  it('chains treasury cash with debts and inventory sequentially', () => {
    const derived = computeDerived({
      sessions: [{
        id: 's1', label: 'يونيو', periodFrom: '2026-06-01', periodTo: '2026-06-30',
        status: 'open', openingStock: 0, openingAvgCost: 2, openingPayables: 0, openingReceivables: 0,
        createdAt: '2026-06-01',
      }],
      activeSessionId: 's1',
      farmers: [farmer],
      customers: [],
      employees: [],
      supplies: [{
        id: 'sup1', ref: 'SUP-1', farmerId: 'f1', sessionId: 's1', date: '2026-06-01',
        quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-01',
      }],
      sales: [],
      payments: [],
      debtEntries: [],
      adjustments: [],
      expenses: [],
      payrollBatches: [],
      vaults: [{
        id: 'v1', code: 'V-01', name: 'الرئيسية', openingBalance: 50_000, isActive: true,
        location: 'المقر', responsible: 'أمين', minThreshold: 0, createdAt: '2026-01-01',
      }],
      banks: [],
      cashMovements: [],
      externalIncomes: [],
      settings: { minStockThreshold: 0, defaultBuyPrice: 2, defaultSellPrice: 2.5 },
    });

    expect(derived.totals.netCash).toBe(50_000);
    expect(derived.totals.payables).toBe(200);
    expect(derived.totals.inventoryValue).toBeGreaterThan(0);
    expect(derived.adjustedNetPosition.cash).toBe(derived.totals.netCash);
    expect(derived.totals.finalNetPosition).toBe(derived.adjustedNetPosition.finalBalance);
    expect(derived.adjustedNetPosition.finalBalance).toBe(
      derived.totals.netCash + derived.totals.receivables + derived.totals.inventoryValue - derived.totals.payables,
    );
  });
});

describe('resolveAdjustmentReasonKind', () => {
  it('classifies real losses vs corrections', () => {
    expect(resolveAdjustmentReasonKind('تلف وفساد', -10)).toBe('loss');
    expect(resolveAdjustmentReasonKind('رفض جودة', -5)).toBe('loss');
    expect(resolveAdjustmentReasonKind('جرد فعلي (نقص)', -8)).toBe('correction');
    expect(resolveAdjustmentReasonKind('تصحيح إدخال', -3)).toBe('correction');
    expect(resolveAdjustmentReasonKind('أي سبب', 10)).toBe('correction');
  });
});

describe('inventory waste as non-cash expense', () => {
  const wasteSession: Session = {
    id: 'sw', label: 'يونيو', periodFrom: '2026-06-01', periodTo: '2026-06-30',
    status: 'open', openingStock: 0, openingAvgCost: 2, openingPayables: 0, openingReceivables: 0,
    createdAt: '2026-06-01',
  };
  const supplies: SupplyTransaction[] = [{
    id: 'sup1', ref: 'SUP-1', farmerId: 'f1', sessionId: 'sw', date: '2026-06-01',
    quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-01',
  }];
  const wasteAdj: InventoryAdjustment = {
    id: 'adj-w', ref: 'ADJ-1', sessionId: 'sw', date: '2026-06-05',
    quantity: -10, unitCost: 2, reason: 'تلف وفساد', reasonKind: 'loss', createdAt: '2026-06-05',
  };
  const wasteExpense: Expense = {
    id: 'exp-w', ref: 'EXP-1', categoryId: 'cat-waste', amount: 20, description: 'هدر مخزون',
    date: '2026-06-05', sessionId: 'sw', status: 'approved', nonCash: true, sourceAdjustmentId: 'adj-w',
    createdAt: '2026-06-05',
  };

  function build(extraExpenses: Expense[]) {
    return computeDerived({
      sessions: [wasteSession], activeSessionId: 'sw',
      farmers: [farmer], customers: [], employees: [],
      supplies, sales: [], payments: [], debtEntries: [],
      adjustments: [wasteAdj], expenses: extraExpenses, payrollBatches: [],
      vaults: [], banks: [], cashMovements: [], externalIncomes: [],
      settings: { minStockThreshold: 0, defaultBuyPrice: 2, defaultSellPrice: 2.5 },
    });
  }

  it('deducts waste from stock and value', () => {
    const d = build([wasteExpense]);
    expect(d.activeSummary.closingStock).toBe(90);
    expect(d.totals.inventoryValue).toBe(180);
  });

  it('does not double-count: non-cash expense produces no separate expense journal', () => {
    const d = build([wasteExpense]);
    const expenseJournals = d.journals.filter((j) => j.kind === 'expense');
    const adjustmentJournals = d.journals.filter((j) => j.kind === 'adjustment');
    expect(expenseJournals).toHaveLength(0);
    expect(adjustmentJournals).toHaveLength(1);
  });

  it('keeps the trial balance balanced with a non-cash waste expense', () => {
    const d = build([wasteExpense]);
    expect(d.trialBalance.balanced).toBe(true);
    expect(Math.round(d.trialBalance.totalDebit)).toBe(Math.round(d.trialBalance.totalCredit));
  });

  it('surfaces waste as a loss that lowers net profit without touching cash', () => {
    const d = build([wasteExpense]);
    expect(d.incomeStatement.wasteLosses).toBe(20);
    expect(d.incomeStatement.netProfit).toBe(-20);
    expect(d.totals.netCash).toBe(0);
  });
});

describe('income statement — net profit after waste, expenses, and salaries', () => {
  const session: Session = {
    id: 'si', label: 'يونيو', periodFrom: '2026-06-01', periodTo: '2026-06-30',
    status: 'open', openingStock: 0, openingAvgCost: 2, openingPayables: 0, openingReceivables: 0,
    createdAt: '2026-06-01',
  };
  const supplies: SupplyTransaction[] = [{
    id: 'sup1', ref: 'SUP-1', farmerId: 'f1', sessionId: 'si', date: '2026-06-01',
    quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-01',
  }];
  const sales: SaleTransaction[] = [{
    id: 'sal1', ref: 'SAL-1', customerId: 'c1', sessionId: 'si', date: '2026-06-10',
    quantity: 50, unitPrice: 3, total: 150, dueDate: '2026-06-20', createdAt: '2026-06-10',
  }];
  const cashExpense: Expense = {
    id: 'exp-c', ref: 'EXP-2', categoryId: 'cat-fuel', amount: 30, description: 'وقود',
    date: '2026-06-08', sessionId: 'si', status: 'approved', paidFromType: 'vault', paidFromId: 'v1',
    createdAt: '2026-06-08',
  };
  const payroll: PayrollBatch[] = [{
    id: 'pr1', ref: 'PR-1', label: 'رواتب', payrollType: 'monthly', periodFrom: '2026-06-01',
    periodTo: '2026-06-30', lines: [], totalAmount: 40, status: 'paid', sessionId: 'si', createdAt: '2026-06-30',
  }];
  const wasteAdj: InventoryAdjustment = {
    id: 'adj-w2', ref: 'ADJ-2', sessionId: 'si', date: '2026-06-05',
    quantity: -10, unitCost: 2, reason: 'تلف وفساد', reasonKind: 'loss', createdAt: '2026-06-05',
  };
  const wasteExpense: Expense = {
    id: 'exp-w2', ref: 'EXP-3', categoryId: 'cat-waste', amount: 20, description: 'هدر مخزون',
    date: '2026-06-05', sessionId: 'si', status: 'approved', nonCash: true, sourceAdjustmentId: 'adj-w2',
    createdAt: '2026-06-05',
  };

  function build(withWaste: boolean) {
    return computeDerived({
      sessions: [session], activeSessionId: 'si',
      farmers: [farmer], customers: [], employees: [],
      supplies, sales, payments: [], debtEntries: [],
      adjustments: withWaste ? [wasteAdj] : [],
      expenses: withWaste ? [cashExpense, wasteExpense] : [cashExpense],
      payrollBatches: payroll,
      vaults: [], banks: [], cashMovements: [], externalIncomes: [],
      settings: { minStockThreshold: 0, defaultBuyPrice: 2, defaultSellPrice: 3 },
    });
  }

  it('subtracts operating expenses and salaries from gross profit', () => {
    const is = build(false).incomeStatement;
    expect(is.revenue).toBe(150);
    expect(is.grossProfit).toBe(50);
    expect(is.wasteLosses).toBe(0);
    expect(is.operatingExpenses).toBe(30);
    expect(is.salaries).toBe(40);
    expect(is.netProfit).toBe(-20);
  });

  it('waste lowers net profit by exactly its value', () => {
    const base = build(false);
    const withWaste = build(true);
    expect(withWaste.incomeStatement.wasteLosses).toBe(20);
    expect(base.incomeStatement.netProfit - withWaste.incomeStatement.netProfit).toBe(20);
  });

  it('waste is a non-cash loss: cash is identical with or without it', () => {
    expect(build(true).totals.netCash).toBe(build(false).totals.netCash);
  });
});

describe('computeWasteSummary and alerts', () => {
  const session: Session = {
    id: 'sw2', label: 'يونيو', periodFrom: '2026-06-01', periodTo: '2026-06-30',
    status: 'open', openingStock: 0, openingAvgCost: 2, openingPayables: 0, openingReceivables: 0,
    createdAt: '2026-06-01',
  };
  const lossAdj: InventoryAdjustment = {
    id: 'adj-l', ref: 'ADJ-L', sessionId: 'sw2', date: '2026-06-05',
    quantity: -15, unitCost: 2, reason: 'تلف وفساد', reasonKind: 'loss', createdAt: '2026-06-05',
  };
  const correctionAdj: InventoryAdjustment = {
    id: 'adj-c', ref: 'ADJ-C', sessionId: 'sw2', date: '2026-06-06',
    quantity: -5, unitCost: 2, reason: 'تصحيح جرد', reasonKind: 'correction', createdAt: '2026-06-06',
  };

  it('counts only loss adjustments, not corrections', () => {
    const w = computeWasteSummary([lossAdj, correctionAdj], 'sw2');
    expect(w.sessionQty).toBe(15);
    expect(w.sessionValue).toBe(30);
    expect(w.byReason).toHaveLength(1);
    expect(w.byReason[0].reason).toBe('تلف وفساد');
  });

  it('records exactly one liter of waste as one liter', () => {
    const oneLiterLoss: InventoryAdjustment = {
      ...lossAdj,
      id: 'adj-1l',
      ref: 'ADJ-1L',
      quantity: -1,
    };
    const supplies: SupplyTransaction[] = [
      {
        id: 'sup-a', ref: 'SUP-A', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-01',
        quantity: 50, unitPrice: 2, total: 100, qualityTier: 'A', createdAt: '2026-06-01',
      },
    ];
    const inv = buildInventoryLedger(supplies, [], [oneLiterLoss], [session]);
    const w = computeWasteSummary([oneLiterLoss], 'sw2', inv);
    expect(w.sessionQty).toBe(1);
    expect(inv.currentStock).toBe(49);
  });

  it('dedupes duplicate adjustment rows so waste is not doubled', () => {
    const dup: InventoryAdjustment = {
      ...lossAdj,
      id: 'adj-dup',
      ref: 'ADJ-DUP',
      quantity: -1,
    };
    const supplies: SupplyTransaction[] = [
      {
        id: 'sup-b', ref: 'SUP-B', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-01',
        quantity: 20, unitPrice: 2, total: 40, qualityTier: 'A', createdAt: '2026-06-01',
      },
    ];
    const inv = buildInventoryLedger(supplies, [], [dup, dup], [session]);
    const w = computeWasteSummary([dup, dup], 'sw2', inv);
    expect(w.sessionQty).toBe(1);
    expect(inv.currentStock).toBe(19);
  });

  it('does not double-count opening stock with opening adjustment after supplies exist', () => {
    const openingAdj: InventoryAdjustment = {
      id: 'adj-open', ref: 'ADJ-O', sessionId: 'sw2', date: '2026-06-01',
      quantity: 500, unitCost: 2, reason: 'رصيد افتتاحي للدورة — متبقي من الدورة السابقة',
      reasonKind: 'correction', createdAt: '2026-06-01',
    };
    const sessionWithOpening: Session = {
      ...session,
      openingStock: 1000,
      openingAvgCost: 2,
    };
    const supplies: SupplyTransaction[] = [
      {
        id: 'sup-c', ref: 'SUP-C', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-02',
        quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-02',
      },
    ];
    const inv = buildInventoryLedger(supplies, [], [openingAdj], [sessionWithOpening]);
    expect(inv.currentStock).toBe(600);
  });

  it('uses ledger WAC for waste value when stored unitCost differs', () => {
    const supplies: SupplyTransaction[] = [
      {
        id: 'sup-a', ref: 'SUP-A', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-01',
        quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-01',
      },
      {
        id: 'sup-b', ref: 'SUP-B', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-02',
        quantity: 100, unitPrice: 4, total: 400, qualityTier: 'A', createdAt: '2026-06-02',
      },
    ];
    const staleUnitCostAdj: InventoryAdjustment = {
      ...lossAdj,
      id: 'adj-stale',
      quantity: -10,
      unitCost: 2,
    };
    const inv = buildInventoryLedger(supplies, [], [staleUnitCostAdj], [session]);
    const w = computeWasteSummary([staleUnitCostAdj], 'sw2', inv);
    expect(w.sessionQty).toBe(10);
    expect(w.sessionValue).toBe(30);
  });

  it('waste expense matches ledger cost — never inflated by stored unitCost', () => {
    const supplies: SupplyTransaction[] = [
      {
        id: 'sup-a', ref: 'SUP-A', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-01',
        quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-01',
      },
      {
        id: 'sup-b', ref: 'SUP-B', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-02',
        quantity: 100, unitPrice: 4, total: 400, qualityTier: 'A', createdAt: '2026-06-02',
      },
    ];
    const staleAdj: InventoryAdjustment = {
      ...lossAdj,
      id: 'adj-stale2',
      quantity: -10,
      unitCost: 99,
    };
    const inv = buildInventoryLedger(supplies, [], [staleAdj], [session]);
    const inflatedExpense: Expense = {
      id: 'exp-bad', ref: 'EXP-BAD', categoryId: 'cat-waste', amount: 990,
      description: 'هدر', date: '2026-06-05', sessionId: 'sw2', status: 'approved',
      nonCash: true, sourceAdjustmentId: 'adj-stale2', createdAt: '2026-06-05',
    };
    const d = computeDerived({
      sessions: [session], activeSessionId: 'sw2',
      farmers: [farmer], customers: [], employees: [],
      supplies, sales: [], payments: [], debtEntries: [],
      adjustments: [staleAdj], expenses: [inflatedExpense], payrollBatches: [],
      vaults: [], banks: [], cashMovements: [], externalIncomes: [],
      settings: { minStockThreshold: 0, defaultBuyPrice: 2, defaultSellPrice: 2.5 },
    });
    const w = computeWasteSummary([staleAdj], 'sw2', inv);
    expect(w.sessionValue).toBe(30);
    expect(d.incomeStatement.wasteLosses).toBe(30);
    const adjJournal = d.journals.find((j) => j.sourceId === 'adj-stale2');
    expect(adjJournal?.lines.find((l) => l.account === 'operating_expense')?.debit).toBe(30);
  });

  it('aggregates all sessions when sessionId is null', () => {
    const otherLoss: InventoryAdjustment = {
      ...lossAdj,
      id: 'adj-other',
      sessionId: 'sw3',
      quantity: -5,
    };
    const w = computeWasteSummary([lossAdj, otherLoss], null);
    expect(w.sessionQty).toBe(20);
    expect(w.sessionValue).toBe(40);
    expect(w.totalQty).toBe(20);
  });

  it('surfaces milk-waste alert when session has waste', () => {
    const d = computeDerived({
      sessions: [session], activeSessionId: 'sw2',
      farmers: [farmer], customers: [], employees: [],
      supplies: [], sales: [], payments: [], debtEntries: [],
      adjustments: [lossAdj], expenses: [], payrollBatches: [],
      vaults: [], banks: [], cashMovements: [], externalIncomes: [],
      settings: { minStockThreshold: 0, defaultBuyPrice: 2.85, defaultSellPrice: 2.55 },
    });
    expect(d.wasteSummary.sessionQty).toBe(15);
    expect(d.alerts.some((a) => a.id === 'milk-waste')).toBe(true);
  });

  it('fires low-stock alert when below threshold', () => {
    const d = computeDerived({
      sessions: [session], activeSessionId: 'sw2',
      farmers: [farmer], customers: [], employees: [],
      supplies: [{
        id: 'sup1', ref: 'SUP-1', farmerId: 'f1', sessionId: 'sw2', date: '2026-06-01',
        quantity: 100, unitPrice: 2, total: 200, qualityTier: 'A', createdAt: '2026-06-01',
      }],
      sales: [{
        id: 'sal1', ref: 'SAL-1', customerId: 'c1', sessionId: 'sw2', date: '2026-06-10',
        quantity: 95, unitPrice: 3, total: 285, dueDate: '2026-06-20', createdAt: '2026-06-10',
      }],
      payments: [], debtEntries: [], adjustments: [], expenses: [], payrollBatches: [],
      vaults: [], banks: [], cashMovements: [], externalIncomes: [],
      settings: { minStockThreshold: 10, defaultBuyPrice: 2.85, defaultSellPrice: 2.55 },
    });
    expect(d.alerts.some((a) => a.id === 'low-stock')).toBe(true);
  });
});
