import { cycleForDate } from './cycle';
import {
  allCustomerSessionStats,
  allFarmerSessionStats,
  buildSessionCarryForwardSnapshot,
  type CustomerSessionStats,
  type ErpData,
  type FarmerSessionStats,
  type SessionSummary,
} from './calculations';
import { buildInventoryLedger, round } from './inventory';
import type { Session } from './types';

export type SessionClosingPartyRow = {
  name: string;
  obligation: number;
  settled: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'none';
};

export type SessionClosingFarmerRow = SessionClosingPartyRow & {
  suppliedQty: number;
};

export type SessionClosingCustomerRow = SessionClosingPartyRow & {
  soldQty: number;
  carriedForward: number;
};

export type SessionClosingSettlement = {
  farmerObligation: number;
  farmerSettled: number;
  farmerRemaining: number;
  farmerSettlementPct: number;
  farmerPaidCount: number;
  farmerTotalCount: number;
  customerObligation: number;
  customerCollected: number;
  customerRemaining: number;
  customerCollectionPct: number;
  customerPaidCount: number;
  customerTotalCount: number;
};

export type SessionClosingReportProps = {
  summary: SessionSummary;
  carryForward: { openingStock: number; payables: number; receivables: number };
  closedAtIso?: string;
  nextSessionLabel?: string;
  settlement: SessionClosingSettlement;
  farmers: SessionClosingFarmerRow[];
  customers: SessionClosingCustomerRow[];
  employees: { name: string; balance: number }[];
  external: { name: string; balance: number; direction: 'payable' | 'receivable' }[];
  /** المخزون الفعلي لحظة التقرير — يُرحَّل للدورة التالية */
  inventorySnapshot: {
    currentStock: number;
    inventoryCostValue: number;
    inventorySellValue: number;
    wac: number;
    avgSellPrice: number;
  };
};

function pct(settled: number, obligation: number): number {
  if (obligation <= 0.01) return settled <= 0.01 ? 100 : 0;
  return Math.round(Math.min(100, (settled / obligation) * 100));
}

function farmerRowsFromStats(rows: FarmerSessionStats[]): SessionClosingFarmerRow[] {
  return rows.map((r) => ({
    name: r.fullName,
    suppliedQty: r.suppliedQty,
    obligation: r.carriedForward + r.suppliedValue,
    settled: r.paidAmount,
    balance: r.balance,
    status: r.status,
  }));
}

function customerRowsFromStats(rows: CustomerSessionStats[]): SessionClosingCustomerRow[] {
  return rows.map((r) => ({
    name: r.entityName,
    soldQty: r.soldQty,
    carriedForward: r.carriedForward,
    obligation: r.carriedForward + r.soldValue,
    settled: r.receivedAmount,
    balance: r.balance,
    status: r.status,
  }));
}

function settlementFromFarmerRows(farmers: SessionClosingFarmerRow[]): Pick<
  SessionClosingSettlement,
  'farmerObligation' | 'farmerSettled' | 'farmerRemaining' | 'farmerSettlementPct' | 'farmerPaidCount' | 'farmerTotalCount'
> {
  const active = farmers.filter((f) => f.status !== 'none');
  const farmerObligation = active.reduce((s, f) => s + f.obligation, 0);
  const farmerSettled = active.reduce((s, f) => s + f.settled, 0);
  const farmerRemaining = active.reduce((s, f) => s + f.balance, 0);
  return {
    farmerObligation,
    farmerSettled,
    farmerRemaining,
    farmerSettlementPct: pct(farmerSettled, farmerObligation),
    farmerPaidCount: active.filter((f) => f.status === 'paid').length,
    farmerTotalCount: active.length,
  };
}

function settlementFromCustomerRows(customers: SessionClosingCustomerRow[]): Pick<
  SessionClosingSettlement,
  'customerObligation' | 'customerCollected' | 'customerRemaining' | 'customerCollectionPct' | 'customerPaidCount' | 'customerTotalCount'
> {
  const active = customers.filter((c) => c.status !== 'none');
  const customerObligation = active.reduce((s, c) => s + c.obligation, 0);
  const customerCollected = active.reduce((s, c) => s + c.settled, 0);
  const customerRemaining = active.reduce((s, c) => s + c.balance, 0);
  return {
    customerObligation,
    customerCollected,
    customerRemaining,
    customerCollectionPct: pct(customerCollected, customerObligation),
    customerPaidCount: active.filter((c) => c.status === 'paid').length,
    customerTotalCount: active.length,
  };
}

function nextCycleLabel(periodTo: string): string {
  const dayAfter = new Date(`${periodTo}T00:00:00`);
  dayAfter.setDate(dayAfter.getDate() + 1);
  return cycleForDate(dayAfter).label;
}

function buildInventorySnapshot(data: ErpData, session: Session) {
  const inv = buildInventoryLedger(data.supplies, data.sales, data.adjustments, data.sessions);
  const sessionSales = data.sales.filter((s) => s.sessionId === session.id);
  const soldQty = sessionSales.reduce((s, x) => s + x.quantity, 0);
  const soldRevenue = sessionSales.reduce((s, x) => s + x.total, 0);
  const avgSellPrice =
    soldQty > 0 ? round(soldRevenue / soldQty, 3) : round(data.settings.defaultSellPrice, 3);
  const currentStock = round(inv.currentStock);
  return {
    currentStock,
    inventoryCostValue: round(inv.currentValue),
    inventorySellValue: round(currentStock * avgSellPrice),
    wac: round(inv.currentWac, 3),
    avgSellPrice,
  };
}

/** بيانات تقرير إغلاق الدورة — للمعاينة والأرشيف. */
export function buildSessionClosingReportProps(
  data: ErpData,
  session: Session,
  summary: SessionSummary,
): SessionClosingReportProps {
  const inventorySnapshot = buildInventorySnapshot(data, session);

  if (session.archive) {
    const snap = session.archive.balancesSnapshot;
    const farmers: SessionClosingFarmerRow[] = snap.farmers.map((f) => {
      const settled = f.paidAmount ?? 0;
      const obligation = settled + f.balance;
      const status = (f.status ?? (f.balance <= 0.01 ? 'paid' : 'pending')) as SessionClosingFarmerRow['status'];
      return {
        name: f.name,
        suppliedQty: f.suppliedQty ?? 0,
        obligation,
        settled,
        balance: f.balance,
        status,
      };
    });
    const customers: SessionClosingCustomerRow[] = snap.customers.map((c) => {
      const carriedForward = c.carriedForward ?? 0;
      const soldValue = c.soldValue ?? 0;
      const settled = c.receivedAmount ?? 0;
      const obligation = carriedForward + soldValue;
      const status = (c.status ??
        (c.balance <= 0.01 ? 'paid' : obligation > 0.01 ? 'pending' : 'none')) as SessionClosingCustomerRow['status'];
      return {
        name: c.name,
        soldQty: 0,
        carriedForward,
        obligation: obligation > 0.01 ? obligation : c.balance,
        settled,
        balance: c.balance,
        status,
      };
    });
    const employees = (snap.employees ?? []).map((e) => ({ name: e.name, balance: e.balance }));
    const external = (snap.external ?? []).map((e) => ({
      name: e.name,
      balance: e.balance,
      direction: e.direction,
    }));

    return {
      summary,
      carryForward: session.archive.carryForward,
      closedAtIso: session.closedAt,
      nextSessionLabel: nextCycleLabel(session.periodTo),
      settlement: {
        ...settlementFromFarmerRows(farmers),
        ...settlementFromCustomerRows(customers),
      },
      farmers,
      customers,
      employees,
      external,
      inventorySnapshot: {
        ...inventorySnapshot,
        currentStock: session.archive.carryForward.openingStock,
        inventoryCostValue: round(
          session.archive.carryForward.openingStock * inventorySnapshot.wac,
        ),
        inventorySellValue: round(
          session.archive.carryForward.openingStock * inventorySnapshot.avgSellPrice,
        ),
      },
    };
  }

  const preview = buildSessionCarryForwardSnapshot(data, session, inventorySnapshot.currentStock);
  const farmers = farmerRowsFromStats(allFarmerSessionStats(data, session));
  const customers = customerRowsFromStats(allCustomerSessionStats(data, session));

  return {
    summary,
    carryForward: preview.totals,
    nextSessionLabel: nextCycleLabel(session.periodTo),
    settlement: {
      ...settlementFromFarmerRows(farmers),
      ...settlementFromCustomerRows(customers),
    },
    farmers,
    customers,
    employees: preview.employees.map((e) => ({ name: e.name, balance: e.balance })),
    external: preview.external.map((e) => ({
      name: e.name,
      balance: e.balance,
      direction: e.direction,
    })),
    inventorySnapshot,
  };
}
