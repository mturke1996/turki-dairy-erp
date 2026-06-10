/**
 * طبقة المشتقّات والتحليلات — تحوّل البيانات الخام إلى أرصدة ومؤشرات وتقارير.
 * كل الدوال نقية (pure) لإعادة استخدامها في الواجهة وفي مستندات الـ PDF.
 */

import {
  buildTrialBalance,
  computePnL,
  journalForAdjustment,
  journalForDebtEntry,
  journalForDebtSettlement,
  journalForExpense,
  journalForExternalIncome,
  journalForPayment,
  journalForPayroll,
  journalForSale,
  journalForSupply,
  type ProfitAndLoss,
} from './accounting';
import { resolveAdjustmentReasonKind } from './constants';
import { adjustmentLossValueFromLedger, adjustmentOutQtyFromLedger, buildInventoryLedger, round, uniqueAdjustments, type InventoryResult } from './inventory';
import { computeTreasury, computeAdjustedNetPosition, type AdjustedNetPosition } from './treasury';
import { debtBalanceContribution, paymentNetOfDebtSettlement, resolveDebtDirection } from './debt';
import type {
  BankAccount,
  CashMovement,
  CashVault,
  Customer,
  DebtEntry,
  DebtPartyKind,
  Employee,
  Expense,
  ExternalIncome,
  Farmer,
  InventoryAdjustment,
  JournalEntry,
  Payment,
  PayrollBatch,
  SaleTransaction,
  Session,
  SessionCarryForwardBalances,
  SupplyTransaction,
  SystemAlert,
} from './types';

export interface ErpData {
  sessions: Session[];
  activeSessionId: string;
  farmers: Farmer[];
  customers: Customer[];
  employees: Employee[];
  supplies: SupplyTransaction[];
  sales: SaleTransaction[];
  payments: Payment[];
  debtEntries: DebtEntry[];
  adjustments: InventoryAdjustment[];
  expenses: Expense[];
  payrollBatches: PayrollBatch[];
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  externalIncomes?: ExternalIncome[];
  settings: { minStockThreshold: number; defaultBuyPrice: number; defaultSellPrice: number };
}

export interface FarmerStats extends Farmer {
  creditBalance: number;
  totalSupplied: number;
  totalSupplyValue: number;
  paidTotal: number;
  avgPrice: number;
  supplyCount: number;
  lastSupplyDate?: string;
}

export interface CustomerStats extends Customer {
  outstanding: number;
  totalPurchased: number;
  totalRevenue: number;
  receivedTotal: number;
  avgPrice: number;
  saleCount: number;
  overdueAmount: number;
  creditUtilization: number;
  lastSaleDate?: string;
}

export interface EmployeeStats extends Employee {
  grossSalary: number;
  advanceBalance: number;
  advancesTotal: number;
  advancesRecovered: number;
  ytdPaid: number;
  lastPayrollDate?: string;
  payrollCount: number;
}

export type { DebtPartyKind };

/** صف موحّد في مركز الديون */
export interface DebtLedgerRow {
  id: string;
  kind: DebtPartyKind;
  code: string;
  name: string;
  subtitle: string;
  balance: number;
  /** payable = علينا للطرف، receivable = على الطرف لنا */
  direction: 'payable' | 'receivable';
  statusLabel: string;
  phone?: string;
}

export interface DebtSummary {
  farmerPayables: number;
  customerReceivables: number;
  employeeAdvances: number;
  externalPayables: number;
  externalReceivables: number;
  totalPayables: number;
  totalReceivables: number;
  netPosition: number;
  rows: DebtLedgerRow[];
  entries: DebtEntry[];
}

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
}

const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);

// ============================================================
// الفلاحون
// ============================================================
export function computeFarmerStats(
  farmer: Farmer,
  supplies: SupplyTransaction[],
  payments: Payment[],
  debtEntries: DebtEntry[] = [],
): FarmerStats {
  const fs = supplies.filter((s) => s.farmerId === farmer.id);
  const ps = payments.filter((p) => p.kind === 'farmer_payment' && p.partyId === farmer.id);
  const manualDebt = sum(
    debtEntries
      .filter((d) => d.partyKind === 'farmer' && d.partyId === farmer.id)
      .map((d) => debtBalanceContribution(d)),
  );
  const totalSupplyValue = sum(fs.map((s) => s.total));
  const totalSupplied = sum(fs.map((s) => s.quantity));
  const paidToSupply = sum(ps.map((p) => paymentNetOfDebtSettlement(p)));
  const lastSupplyDate = fs.length
    ? fs.reduce((m, s) => (s.date > m ? s.date : m), fs[0].date)
    : undefined;
  return {
    ...farmer,
    creditBalance: round(totalSupplyValue - paidToSupply + manualDebt),
    totalSupplied: round(totalSupplied),
    totalSupplyValue: round(totalSupplyValue),
    paidTotal: round(sum(ps.map((p) => p.amount))),
    avgPrice: totalSupplied > 0 ? round(totalSupplyValue / totalSupplied, 3) : farmer.defaultBuyPrice,
    supplyCount: fs.length,
    lastSupplyDate,
  };
}

export function allFarmerStats(data: ErpData): FarmerStats[] {
  return data.farmers.map((f) => computeFarmerStats(f, data.supplies, data.payments, data.debtEntries ?? []));
}

/** إحصاءات فلاح ضمن دورة (فترة) محددة — للتسوية نصف الشهرية. */
export interface FarmerSessionStats {
  farmerId: string;
  sessionId: string;
  fullName: string;
  code: string;
  /** رصيد مُرحّل من الدورة السابقة */
  carriedForward: number;
  suppliedQty: number;
  sampleQty: number;
  billableQty: number;
  suppliedValue: number;
  paidAmount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'none';
  supplyCount: number;
  paymentCount: number;
}

type SessionScope = Pick<Session, 'id' | 'carryForwardBalances'>;

function sessionScope(session: SessionScope | string): SessionScope {
  return typeof session === 'string' ? { id: session } : session;
}

function carriedFarmerBalance(session: SessionScope, farmerId: string): number {
  return round(session.carryForwardBalances?.farmers.find((f) => f.id === farmerId)?.balance ?? 0);
}

function carriedCustomerBalance(session: SessionScope, customerId: string): number {
  return round(session.carryForwardBalances?.customers.find((c) => c.id === customerId)?.balance ?? 0);
}

export function computeFarmerSessionStats(
  farmer: Farmer,
  session: SessionScope | string,
  supplies: SupplyTransaction[],
  payments: Payment[],
  debtEntries: DebtEntry[] = [],
): FarmerSessionStats {
  const scope = sessionScope(session);
  const sessionId = scope.id;
  const carried = carriedFarmerBalance(scope, farmer.id);
  const fs = supplies.filter((s) => s.farmerId === farmer.id && s.sessionId === sessionId);
  const ps = payments.filter(
    (p) => p.kind === 'farmer_payment' && p.partyId === farmer.id && p.sessionId === sessionId,
  );
  const manualDebt = sum(
    debtEntries
      .filter((d) => d.partyKind === 'farmer' && d.partyId === farmer.id && d.sessionId === sessionId)
      .map((d) => debtBalanceContribution(d)),
  );
  const suppliedQty = sum(fs.map((s) => s.quantity));
  const sampleQty = sum(fs.map((s) => s.sampleQty ?? 0));
  const billableQty = round(suppliedQty - sampleQty);
  const suppliedValue = sum(fs.map((s) => s.total));
  const paidAmount = sum(ps.map((p) => paymentNetOfDebtSettlement(p)));
  const balance = round(Math.max(0, carried + suppliedValue - paidAmount + manualDebt));

  let status: FarmerSessionStats['status'] = 'none';
  if (suppliedValue > 0.01 || carried > 0.01) {
    if (balance <= 0.01 || ps.some((p) => p.settlementComplete)) status = 'paid';
    else if (sum(ps.map((p) => p.amount)) > 0.01) status = 'partial';
    else status = 'pending';
  }

  return {
    farmerId: farmer.id,
    sessionId,
    fullName: farmer.fullName,
    code: farmer.code,
    carriedForward: carried,
    suppliedQty: round(suppliedQty),
    sampleQty: round(sampleQty),
    billableQty,
    suppliedValue: round(suppliedValue),
    paidAmount: round(sum(ps.map((p) => p.amount))),
    balance,
    status,
    supplyCount: fs.length,
    paymentCount: ps.length,
  };
}

export function allFarmerSessionStats(data: ErpData, session: SessionScope | string): FarmerSessionStats[] {
  const scope = sessionScope(session);
  return data.farmers
    .map((f) => computeFarmerSessionStats(f, scope, data.supplies, data.payments, data.debtEntries ?? []))
    .filter((s) => s.supplyCount > 0 || s.paymentCount > 0 || s.carriedForward > 0.01)
    .sort((a, b) => b.balance - a.balance);
}

/** إحصاءات عميل ضمن دورة — للتسوية وترحيل الذمم. */
export interface CustomerSessionStats {
  customerId: string;
  sessionId: string;
  entityName: string;
  code: string;
  carriedForward: number;
  soldQty: number;
  soldValue: number;
  receivedAmount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'none';
  saleCount: number;
  paymentCount: number;
}

export function computeCustomerSessionStats(
  customer: Customer,
  session: SessionScope | string,
  sales: SaleTransaction[],
  payments: Payment[],
  debtEntries: DebtEntry[] = [],
): CustomerSessionStats {
  const scope = sessionScope(session);
  const sessionId = scope.id;
  const carried = carriedCustomerBalance(scope, customer.id);
  const ss = sales.filter((s) => s.customerId === customer.id && s.sessionId === sessionId);
  const ps = payments.filter(
    (p) => p.kind === 'customer_payment' && p.partyId === customer.id && p.sessionId === sessionId,
  );
  const manualDebt = sum(
    debtEntries
      .filter((d) => d.partyKind === 'customer' && d.partyId === customer.id && d.sessionId === sessionId)
      .map((d) => debtBalanceContribution(d)),
  );
  const soldQty = sum(ss.map((s) => s.quantity));
  const soldValue = sum(ss.map((s) => s.total));
  const receivedToSales = sum(ps.map((p) => paymentNetOfDebtSettlement(p)));
  const balance = round(Math.max(0, carried + soldValue - receivedToSales + manualDebt));

  let status: CustomerSessionStats['status'] = 'none';
  if (soldValue > 0.01 || carried > 0.01) {
    if (balance <= 0.01) status = 'paid';
    else if (sum(ps.map((p) => p.amount)) > 0.01) status = 'partial';
    else status = 'pending';
  }

  return {
    customerId: customer.id,
    sessionId,
    entityName: customer.entityName,
    code: customer.code,
    carriedForward: carried,
    soldQty: round(soldQty),
    soldValue: round(soldValue),
    receivedAmount: round(sum(ps.map((p) => p.amount))),
    balance,
    status,
    saleCount: ss.length,
    paymentCount: ps.length,
  };
}

export function allCustomerSessionStats(data: ErpData, session: SessionScope | string): CustomerSessionStats[] {
  const scope = sessionScope(session);
  return data.customers
    .map((c) => computeCustomerSessionStats(c, scope, data.sales, data.payments, data.debtEntries ?? []))
    .filter((s) => s.saleCount > 0 || s.paymentCount > 0 || s.carriedForward > 0.01)
    .sort((a, b) => b.balance - a.balance);
}

/** لقطة أرصدة للترحيل عند إغلاق الدورة. */
export function buildSessionCarryForwardSnapshot(
  data: ErpData,
  closingSession: Session,
  closingStock: number,
): SessionCarryForwardBalances {
  const farmers = data.farmers
    .map((f) => ({
      id: f.id,
      name: f.fullName,
      balance: round(Math.max(0, computeFarmerStats(f, data.supplies, data.payments, data.debtEntries).creditBalance)),
    }))
    .filter((f) => f.balance > 0.01);

  const customers = data.customers
    .map((c) => ({
      id: c.id,
      name: c.entityName,
      balance: round(Math.max(0, computeCustomerStats(c, data.sales, data.payments, data.debtEntries).outstanding)),
    }))
    .filter((c) => c.balance > 0.01);

  const employees = data.employees
    .map((e) => ({
      id: e.id,
      name: e.fullName,
      balance: round(Math.max(0, computeEmployeeAdvanceBalance(e.id, data.payments, data.payrollBatches, data.debtEntries))),
    }))
    .filter((e) => e.balance > 0.01);

  const externalAgg = new Map<string, { id: string; name: string; balance: number; direction: 'payable' | 'receivable' }>();
  for (const d of data.debtEntries.filter((e) => e.partyKind === 'external')) {
    const remaining = debtBalanceContribution(d);
    if (Math.abs(remaining) <= 0.01) continue;
    const key = d.partyId ?? d.id;
    const name = d.partyName?.trim() || 'طرف خارجي';
    const dir = resolveDebtDirection(d);
    const abs = round(Math.abs(remaining));
    const prev = externalAgg.get(key);
    if (prev) {
      prev.balance = round(prev.balance + abs);
    } else {
      externalAgg.set(key, { id: key, name, balance: abs, direction: dir });
    }
  }
  const external = [...externalAgg.values()].filter((e) => e.balance > 0.01);

  const farmerPayables = round(sum(farmers.map((f) => f.balance)));
  const customerReceivables = round(sum(customers.map((c) => c.balance)));
  const employeeReceivables = round(sum(employees.map((e) => e.balance)));
  const externalPayables = round(sum(external.filter((e) => e.direction === 'payable').map((e) => e.balance)));
  const externalReceivables = round(sum(external.filter((e) => e.direction === 'receivable').map((e) => e.balance)));

  return {
    fromSessionId: closingSession.id,
    fromSessionLabel: closingSession.label,
    closedAt: new Date().toISOString(),
    farmers,
    customers,
    employees,
    external,
    totals: {
      openingStock: round(closingStock),
      payables: round(farmerPayables + externalPayables),
      receivables: round(customerReceivables + employeeReceivables + externalReceivables),
    },
  };
}

// ============================================================
// العملاء + أعمار الديون
// ============================================================
export function computeAging(sales: SaleTransaction[], received: number, asOf = new Date()): AgingBuckets {
  const sorted = [...sales].sort((a, b) => a.date.localeCompare(b.date));
  let remaining = received;
  const buckets: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
  for (const s of sorted) {
    let owed = s.total;
    if (remaining > 0) {
      const applied = Math.min(remaining, owed);
      owed -= applied;
      remaining -= applied;
    }
    if (owed <= 0.01) continue;
    const daysPast = Math.floor((asOf.getTime() - new Date(s.dueDate).getTime()) / 86_400_000);
    if (daysPast <= 0) buckets.current += owed;
    else if (daysPast <= 30) buckets.d1_30 += owed;
    else if (daysPast <= 60) buckets.d31_60 += owed;
    else if (daysPast <= 90) buckets.d61_90 += owed;
    else buckets.d90_plus += owed;
  }
  return {
    current: round(buckets.current),
    d1_30: round(buckets.d1_30),
    d31_60: round(buckets.d31_60),
    d61_90: round(buckets.d61_90),
    d90_plus: round(buckets.d90_plus),
  };
}

export function computeCustomerStats(
  customer: Customer,
  sales: SaleTransaction[],
  payments: Payment[],
  debtEntries: DebtEntry[] = [],
): CustomerStats {
  const cs = sales.filter((s) => s.customerId === customer.id);
  const ps = payments.filter((p) => p.kind === 'customer_payment' && p.partyId === customer.id);
  const manualDebt = sum(
    debtEntries
      .filter((d) => d.partyKind === 'customer' && d.partyId === customer.id)
      .map((d) => debtBalanceContribution(d)),
  );
  const totalRevenue = sum(cs.map((s) => s.total));
  const totalPurchased = sum(cs.map((s) => s.quantity));
  const receivedToSales = sum(ps.map((p) => paymentNetOfDebtSettlement(p)));
  const outstanding = round(totalRevenue - receivedToSales + manualDebt);
  const aging = computeAging(cs, receivedToSales);
  const overdueAmount = round(aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d90_plus);
  const lastSaleDate = cs.length
    ? cs.reduce((m, s) => (s.date > m ? s.date : m), cs[0].date)
    : undefined;
  return {
    ...customer,
    outstanding,
    totalPurchased: round(totalPurchased),
    totalRevenue: round(totalRevenue),
    receivedTotal: round(sum(ps.map((p) => p.amount))),
    avgPrice: totalPurchased > 0 ? round(totalRevenue / totalPurchased, 3) : customer.defaultSellPrice,
    saleCount: cs.length,
    overdueAmount,
    creditUtilization: customer.creditLimit > 0 ? round((outstanding / customer.creditLimit) * 100) : 0,
    lastSaleDate,
  };
}

export function allCustomerStats(data: ErpData): CustomerStats[] {
  return data.customers.map((c) => computeCustomerStats(c, data.sales, data.payments, data.debtEntries ?? []));
}

// ============================================================
// الموظفون — سلف ورواتب
// ============================================================

/** مجموع المخصوم من السلف/الدين عبر كشوف الرواتب — المُصروفة فقط. */
export function sumPayrollAdvanceRecovered(
  employeeId: string,
  payrollBatches: PayrollBatch[],
  paidOnly = true,
): number {
  return round(
    sum(
      payrollBatches
        .filter((b) => !paidOnly || b.status === 'paid')
        .flatMap((b) => b.lines)
        .filter((l) => l.employeeId === employeeId)
        .map((l) => l.advanceDeducted),
    ),
  );
}

export interface EmployeeDebtBreakdown {
  advancesTotal: number;
  advancesRecovered: number;
  advancesRemaining: number;
  registeredDebt: number;
  totalOwed: number;
}

/** تفصيل دين الموظف: سلف نقدية + ديون مسجّلة − ما استُرد من الراتب. */
export function computeEmployeeDebtBreakdown(
  employeeId: string,
  payments: Payment[],
  payrollBatches: PayrollBatch[],
  debtEntries: DebtEntry[] = [],
): EmployeeDebtBreakdown {
  const advancesTotal = round(
    sum(
      payments
        .filter((p) => p.kind === 'employee_advance' && p.partyId === employeeId)
        .map((p) => p.amount),
    ),
  );
  const advancesRecovered = sumPayrollAdvanceRecovered(employeeId, payrollBatches, true);
  const registeredDebt = round(
    sum(
      debtEntries
        .filter((d) => d.partyKind === 'employee' && d.partyId === employeeId)
        .map((d) => Math.max(0, debtBalanceContribution(d))),
    ),
  );
  const advancesRemaining = round(Math.max(0, advancesTotal - advancesRecovered));
  const totalOwed = round(Math.max(0, advancesRemaining + registeredDebt));
  return {
    advancesTotal,
    advancesRecovered,
    advancesRemaining,
    registeredDebt,
    totalOwed,
  };
}

export function computeEmployeeAdvanceBalance(
  employeeId: string,
  payments: Payment[],
  payrollBatches: PayrollBatch[],
  debtEntries: DebtEntry[] = [],
): number {
  return computeEmployeeDebtBreakdown(
    employeeId,
    payments,
    payrollBatches,
    debtEntries,
  ).totalOwed;
}

export function computeEmployeeStats(
  employee: Employee,
  payments: Payment[],
  payrollBatches: PayrollBatch[],
  debtEntries: DebtEntry[] = [],
): EmployeeStats {
  const grossSalary = round(
    employee.baseSalary + employee.allowances.housing + employee.allowances.transport + employee.allowances.food,
  );
  const advancesTotal = round(
    sum(payments.filter((p) => p.kind === 'employee_advance' && p.partyId === employee.id).map((p) => p.amount)),
  );
  const advancesRecovered = sumPayrollAdvanceRecovered(employee.id, payrollBatches, true);
  const advanceBalance = computeEmployeeAdvanceBalance(employee.id, payments, payrollBatches, debtEntries);
  const paidBatches = payrollBatches.filter((b) => b.status === 'paid');
  const paidLines = paidBatches.flatMap((b) => b.lines).filter((l) => l.employeeId === employee.id);
  const ytdPaid = round(sum(paidLines.map((l) => l.netSalary)));
  const lastPayrollDate = paidBatches
    .filter((b) => b.lines.some((l) => l.employeeId === employee.id))
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))[0]?.paidAt;
  return {
    ...employee,
    grossSalary,
    advanceBalance,
    advancesTotal,
    advancesRecovered,
    ytdPaid,
    lastPayrollDate,
    payrollCount: paidLines.length,
  };
}

export function allEmployeeStats(data: ErpData): EmployeeStats[] {
  return data.employees.map((e) => computeEmployeeStats(e, data.payments, data.payrollBatches, data.debtEntries ?? []));
}

export function buildDebtSummary(
  farmers: FarmerStats[],
  customers: CustomerStats[],
  employees: EmployeeStats[],
  debtEntries: DebtEntry[] = [],
): DebtSummary {
  const farmerPayables = round(sum(farmers.map((f) => Math.max(0, f.creditBalance))));
  const farmerReceivables = round(sum(farmers.map((f) => Math.max(0, -f.creditBalance))));
  const customerReceivables = round(sum(customers.map((c) => Math.max(0, c.outstanding))));
  const customerPayables = round(sum(customers.map((c) => Math.max(0, -c.outstanding))));
  const employeeAdvances = round(sum(employees.map((e) => Math.max(0, e.advanceBalance))));
  const employeePayables = round(sum(employees.map((e) => Math.max(0, -e.advanceBalance))));

  // تجميع الديون الخارجية حسب الطرف
  const externalAgg = new Map<string, { name: string; balance: number }>();
  for (const d of debtEntries.filter((e) => e.partyKind === 'external')) {
    const key = d.partyId ?? d.id;
    const name = d.partyName?.trim() || 'طرف خارجي';
    const prev = externalAgg.get(key) ?? { name, balance: 0 };
    prev.balance += debtBalanceContribution(d);
    externalAgg.set(key, prev);
  }
  let externalPayables = 0;
  let externalReceivables = 0;
  const externalRows: DebtLedgerRow[] = [];
  for (const [id, { name, balance }] of externalAgg) {
    if (Math.abs(balance) <= 0.01) continue;
    const direction = balance >= 0 ? 'receivable' : 'payable';
    const abs = Math.abs(balance);
    if (direction === 'payable') externalPayables += abs;
    else externalReceivables += abs;
    externalRows.push({
      id,
      kind: 'external',
      code: 'EXT',
      name,
      subtitle: 'دين خارجي',
      balance: abs,
      direction,
      statusLabel: 'external',
    });
  }
  externalPayables = round(externalPayables);
  externalReceivables = round(externalReceivables);

  const rows: DebtLedgerRow[] = [
    ...farmers
      .filter((f) => Math.abs(f.creditBalance) > 0.01)
      .map((f) => ({
        id: f.id,
        kind: 'farmer' as const,
        code: f.code,
        name: f.fullName,
        subtitle: f.region,
        balance: Math.abs(f.creditBalance),
        direction: f.creditBalance >= 0 ? ('payable' as const) : ('receivable' as const),
        statusLabel: f.status,
        phone: f.phone,
      })),
    ...customers
      .filter((c) => Math.abs(c.outstanding) > 0.01)
      .map((c) => ({
        id: c.id,
        kind: 'customer' as const,
        code: c.code,
        name: c.entityName,
        subtitle: c.entityType,
        balance: Math.abs(c.outstanding),
        direction: c.outstanding >= 0 ? ('receivable' as const) : ('payable' as const),
        statusLabel: c.onHold ? 'on_hold' : 'active',
        phone: c.phone,
      })),
    ...employees
      .filter((e) => Math.abs(e.advanceBalance) > 0.01)
      .map((e) => ({
        id: e.id,
        kind: 'employee' as const,
        code: e.code,
        name: e.fullName,
        subtitle: e.jobTitle,
        balance: Math.abs(e.advanceBalance),
        direction: e.advanceBalance >= 0 ? ('receivable' as const) : ('payable' as const),
        statusLabel: e.status,
        phone: e.phone,
      })),
    ...externalRows,
  ].sort((a, b) => b.balance - a.balance);

  const totalPayables = round(farmerPayables + customerPayables + employeePayables + externalPayables);
  const totalReceivables = round(
    farmerReceivables + customerReceivables + employeeAdvances + externalReceivables,
  );

  return {
    farmerPayables,
    customerReceivables,
    employeeAdvances,
    externalPayables,
    externalReceivables,
    totalPayables,
    totalReceivables,
    netPosition: round(totalReceivables - totalPayables),
    rows,
    entries: [...debtEntries].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

// ============================================================
// القيود المحاسبية الكاملة
// ============================================================
export function buildAllJournals(data: ErpData, saleCogs: Record<string, number>): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (const s of data.supplies) entries.push(journalForSupply(s));
  for (const s of data.sales) entries.push(journalForSale(s, saleCogs[s.id] ?? 0));
  for (const p of data.payments) {
    const je = journalForPayment(p);
    if (je) entries.push(je);
  }
  for (const e of data.expenses) {
    // المصاريف غير النقدية (هدر مخزون) محسوبة فعلاً ضمن قيد التسوية — تفادياً للازدواج.
    if (e.status === 'approved' && !isNonCashExpense(e)) entries.push(journalForExpense(e));
  }
  for (const b of data.payrollBatches) {
    if (b.status === 'paid') entries.push(journalForPayroll(b));
  }
  for (const a of data.adjustments) entries.push(journalForAdjustment(a));
  for (const d of data.debtEntries ?? []) {
    const advanceDisburse = (data.cashMovements ?? []).some(
      (cm) =>
        cm.referenceType === 'debt' &&
        cm.referenceId === d.id &&
        cm.direction === 'out' &&
        resolveDebtDirection(d) === 'receivable',
    );
    if (advanceDisburse) continue;
    const je = journalForDebtEntry(d);
    if (je) entries.push(je);
  }
  for (const inc of data.externalIncomes ?? []) entries.push(journalForExternalIncome(inc));
  const debtById = new Map((data.debtEntries ?? []).map((d) => [d.id, d]));
  for (const cm of data.cashMovements ?? []) {
    if (cm.referenceType !== 'debt' || !cm.referenceId) continue;
    const je = journalForDebtSettlement(cm, debtById.get(cm.referenceId));
    if (je) entries.push(je);
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// ملخّص فترة
// ============================================================
export interface SessionSummary {
  session: Session;
  supplyQty: number;
  supplyCost: number;
  supplyCount: number;
  salesQty: number;
  salesRevenue: number;
  externalIncome: number;
  salesCount: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  wasteLosses: number;
  operatingExpenses: number;
  salaries: number;
  netProfit: number;
  netMarginPct: number;
  farmerPayments: number;
  customerReceipts: number;
  openingStock: number;
  closingStock: number;
}

export function computeSessionSummary(
  session: Session,
  data: ErpData,
  inv: InventoryResult,
): SessionSummary {
  const sup = data.supplies.filter((s) => s.sessionId === session.id);
  const sal = data.sales.filter((s) => s.sessionId === session.id);
  const supplyQty = sum(sup.map((s) => s.quantity));
  const supplyCost = sum(sup.map((s) => s.total));
  const salesQty = sum(sal.map((s) => s.quantity));
  const salesRevenue = sum(sal.map((s) => s.total));
  const externalIncome = sum(
    (data.externalIncomes ?? []).filter((i) => i.sessionId === session.id).map((i) => i.amount),
  );
  const cogs = sum(sal.map((s) => inv.saleCogs[s.id] ?? 0));
  const approvedExpenses = data.expenses.filter((e) => e.sessionId === session.id && e.status === 'approved');
  const wasteLosses = sum(approvedExpenses.filter((e) => isNonCashExpense(e)).map((e) => e.amount));
  const operatingExpenses = sum(approvedExpenses.filter((e) => !isNonCashExpense(e)).map((e) => e.amount));
  const salaries = sum(
    data.payrollBatches.filter((b) => b.sessionId === session.id && b.status === 'paid').map((b) => b.totalAmount),
  );
  const pnl = computePnL(salesRevenue, cogs, { wasteLosses, operatingExpenses, salaries }, externalIncome);
  const farmerPayments = sum(
    data.payments.filter((p) => p.kind === 'farmer_payment' && p.sessionId === session.id).map((p) => p.amount),
  );
  const customerReceipts = sum(
    data.payments.filter((p) => p.kind === 'customer_payment' && p.sessionId === session.id).map((p) => p.amount),
  );
  const adjQty = sum(uniqueAdjustments(data.adjustments.filter((a) => a.sessionId === session.id)).map((a) => a.quantity));
  const closingStock = round(Math.max(0, session.openingStock + supplyQty - salesQty + adjQty));
  return {
    session,
    supplyQty: round(supplyQty),
    supplyCost: round(supplyCost),
    supplyCount: sup.length,
    salesQty: round(salesQty),
    salesRevenue: round(salesRevenue),
    externalIncome: round(externalIncome),
    salesCount: sal.length,
    cogs: round(cogs),
    grossProfit: pnl.grossProfit,
    marginPct: pnl.marginPct,
    wasteLosses: pnl.wasteLosses,
    operatingExpenses: pnl.operatingExpenses,
    salaries: pnl.salaries,
    netProfit: pnl.netProfit,
    netMarginPct: pnl.netMarginPct,
    farmerPayments: round(farmerPayments),
    customerReceipts: round(customerReceipts),
    openingStock: round(session.openingStock),
    closingStock,
  };
}

// ============================================================
// هدر وتلف الحليب
// ============================================================

export interface WasteLineItem {
  id: string;
  ref: string;
  date: string;
  sessionId: string;
  quantity: number;
  value: number;
  reason: string;
}

export interface WasteReasonBreakdown {
  reason: string;
  qty: number;
  value: number;
}

export interface WasteSummary {
  sessionQty: number;
  sessionValue: number;
  totalQty: number;
  totalValue: number;
  byReason: WasteReasonBreakdown[];
  recent: WasteLineItem[];
}

function adjustmentIsLoss(a: InventoryAdjustment): boolean {
  if (a.quantity >= 0) return false;
  const kind = a.reasonKind ?? resolveAdjustmentReasonKind(a.reason, a.quantity);
  return kind === 'loss';
}

/** مصروف هدر غير نقدي — أو مرتبط بتسوية مخزون حتى لو فُقد علم nonCash. */
export function isNonCashExpense(e: Expense): boolean {
  return e.nonCash === true || !!e.sourceAdjustmentId;
}

function toWasteLine(a: InventoryAdjustment, inv?: InventoryResult): WasteLineItem {
  const ledgerQty = inv ? adjustmentOutQtyFromLedger(inv, a.id) : null;
  const quantity = ledgerQty ?? round(Math.abs(a.quantity));
  const ledgerValue = inv ? adjustmentLossValueFromLedger(inv, a.id) : null;
  return {
    id: a.id,
    ref: a.ref,
    date: a.date,
    sessionId: a.sessionId,
    quantity,
    value: ledgerValue ?? round(quantity * a.unitCost),
    reason: a.reason,
  };
}

/** sessionId = null → إحصاء كل الفترات (لعرض «الكل» في المخزون). */
export function computeWasteSummary(
  adjustments: InventoryAdjustment[],
  sessionId: string | null,
  inv?: InventoryResult,
): WasteSummary {
  const lossLines = uniqueAdjustments(adjustments)
    .filter(adjustmentIsLoss)
    .map((a) => toWasteLine(a, inv));
  const sessionLines =
    sessionId === null ? lossLines : lossLines.filter((l) => l.sessionId === sessionId);

  const byReasonMap = new Map<string, { qty: number; value: number }>();
  for (const l of sessionLines) {
    const prev = byReasonMap.get(l.reason) ?? { qty: 0, value: 0 };
    byReasonMap.set(l.reason, {
      qty: round(prev.qty + l.quantity),
      value: round(prev.value + l.value),
    });
  }

  return {
    sessionQty: round(sum(sessionLines.map((l) => l.quantity))),
    sessionValue: round(sum(sessionLines.map((l) => l.value))),
    totalQty: round(sum(lossLines.map((l) => l.quantity))),
    totalValue: round(sum(lossLines.map((l) => l.value))),
    byReason: [...byReasonMap.entries()]
      .map(([reason, v]) => ({ reason, qty: v.qty, value: v.value }))
      .sort((a, b) => b.value - a.value),
    recent: [...lossLines].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
  };
}

// ============================================================
// الحركة اليومية للمخزون
// ============================================================
export interface DailyFlowPoint {
  date: string;
  inQty: number;
  outQty: number;
  balance: number;
}

export function computeDailyFlow(sessionId: string, inv: InventoryResult): DailyFlowPoint[] {
  const byDay = new Map<string, { in: number; out: number; balance: number }>();
  for (const e of inv.entries) {
    if (sessionId !== 'all' && e.sessionId !== sessionId) continue;
    const day = e.date.slice(0, 10);
    const cur = byDay.get(day) ?? { in: 0, out: 0, balance: 0 };
    cur.in += e.quantityIn;
    cur.out += e.quantityOut;
    cur.balance = e.balanceAfter;
    byDay.set(day, cur);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, inQty: round(v.in), outQty: round(v.out), balance: round(v.balance) }));
}

// ============================================================
// الحزمة الكاملة المشتقّة
// ============================================================
export interface DerivedData {
  inv: InventoryResult;
  journals: JournalEntry[];
  trialBalance: ReturnType<typeof buildTrialBalance>;
  farmers: FarmerStats[];
  customers: CustomerStats[];
  employees: EmployeeStats[];
  debts: DebtSummary;
  activeSession: Session;
  activeSummary: SessionSummary;
  sessionSummaries: SessionSummary[];
  totals: {
    currentStock: number;
    inventoryValue: number;
    wac: number;
    payables: number;
    receivables: number;
    employeeAdvances: number;
    overdue: number;
    netCash: number;
    finalNetPosition: number;
  };
  /** الرصيد النهائي = نقد + لنا + مخزون − علينا (حساب متسلسل) */
  adjustedNetPosition: AdjustedNetPosition;
  /** قائمة الدخل التراكمية: إيراد − تكلفة مبيعات − هدر − مصاريف − رواتب = صافي الربح */
  incomeStatement: ProfitAndLoss;
  /** ملخص هدر وتلف الحليب — فترة نشطة وتراكمي */
  wasteSummary: WasteSummary;
  alerts: SystemAlert[];
}

export function computeDerived(data: ErpData): DerivedData {
  const inv = buildInventoryLedger(data.supplies, data.sales, data.adjustments, data.sessions);
  const journals = buildAllJournals(data, inv.saleCogs);
  const trialBalance = buildTrialBalance(journals);
  const farmers = allFarmerStats(data);
  const customers = allCustomerStats(data);
  const employees = allEmployeeStats(data);
  const debts = buildDebtSummary(farmers, customers, employees, data.debtEntries ?? []);
  const activeSession =
    data.sessions.find((s) => s.id === data.activeSessionId) ?? data.sessions[data.sessions.length - 1];
  const sessionSummaries = data.sessions.map((s) => computeSessionSummary(s, data, inv));
  const activeSummary =
    sessionSummaries.find((s) => s.session.id === activeSession?.id) ?? sessionSummaries[0];

  const payables = debts.totalPayables;
  const receivables = debts.totalReceivables;
  const overdue = round(sum(customers.map((c) => c.overdueAmount)));
  const treasury = computeTreasury(data.vaults, data.banks, data.cashMovements);
  const adjustedNetPosition = computeAdjustedNetPosition({
    cash: treasury.total,
    receivables,
    inventoryValue: inv.currentValue,
    payables,
  });

  const incomeStatement = computePnL(
    sum(sessionSummaries.map((s) => s.salesRevenue)),
    sum(sessionSummaries.map((s) => s.cogs)),
    {
      wasteLosses: sum(sessionSummaries.map((s) => s.wasteLosses)),
      operatingExpenses: sum(sessionSummaries.map((s) => s.operatingExpenses)),
      salaries: sum(sessionSummaries.map((s) => s.salaries)),
    },
    sum(sessionSummaries.map((s) => s.externalIncome)),
  );

  const wasteSummary = computeWasteSummary(data.adjustments, data.activeSessionId, inv);

  const alerts = buildAlerts({
    inv,
    customers,
    farmers,
    data,
    waste: wasteSummary,
    netCash: treasury.total,
    payables,
    finalNetPosition: adjustedNetPosition.finalBalance,
    activeSession,
  });

  return {
    inv,
    journals,
    trialBalance,
    farmers,
    customers,
    employees,
    debts,
    activeSession,
    activeSummary,
    sessionSummaries,
    totals: {
      currentStock: inv.currentStock,
      inventoryValue: inv.currentValue,
      wac: round(inv.currentWac, 3),
      payables,
      receivables,
      employeeAdvances: debts.employeeAdvances,
      overdue,
      netCash: treasury.total,
      finalNetPosition: adjustedNetPosition.finalBalance,
    },
    adjustedNetPosition,
    incomeStatement,
    wasteSummary,
    alerts,
  };
}

function buildAlerts(ctx: {
  inv: InventoryResult;
  customers: CustomerStats[];
  farmers: FarmerStats[];
  data: ErpData;
  waste: WasteSummary;
  netCash: number;
  payables: number;
  finalNetPosition: number;
  activeSession?: Session;
}): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const { settings } = ctx.data;

  if (settings.minStockThreshold > 0 && ctx.inv.currentStock <= settings.minStockThreshold) {
    alerts.push({
      id: 'low-stock',
      level: ctx.inv.currentStock <= settings.minStockThreshold * 0.5 ? 'danger' : 'warning',
      title: 'مخزون منخفض',
      detail: `المخزون الحالي ${Math.round(ctx.inv.currentStock).toLocaleString('ar-LY')} لتر — أقل من حد التنبيه (${Math.round(settings.minStockThreshold).toLocaleString('ar-LY')} لتر).`,
      href: '/inventory',
    });
  }

  if (ctx.waste.sessionValue > 0) {
    alerts.push({
      id: 'milk-waste',
      level: 'warning',
      title: 'هدر حليب في الفترة',
      detail: `${Math.round(ctx.waste.sessionQty).toLocaleString('ar-LY')} لتر تالف بقيمة ${Math.round(ctx.waste.sessionValue).toLocaleString('ar-LY')} د.ل — خسارة غير نقدية تُخصم من صافي الربح.`,
      href: '/inventory',
    });
  }

  const pendingExpenses = ctx.data.expenses.filter((e) => e.status === 'pending');
  if (pendingExpenses.length) {
    const pendingTotal = sum(pendingExpenses.map((e) => e.amount));
    alerts.push({
      id: 'pending-expenses',
      level: 'info',
      title: 'مصاريف بانتظار الموافقة',
      detail: `${pendingExpenses.length} مصروف بمجموع ${Math.round(pendingTotal).toLocaleString('ar-LY')} د.ل يحتاج مراجعة.`,
      href: '/expenses',
    });
  }

  if (ctx.netCash < 0) {
    alerts.push({
      id: 'negative-cash',
      level: 'danger',
      title: 'رصيد نقدي سالب',
      detail: `إجمالي الخزائن والبنوك ${Math.round(ctx.netCash).toLocaleString('ar-LY')} د.ل — راجع الحركات والصرف.`,
      href: '/treasury',
    });
  }

  if (ctx.finalNetPosition < 0) {
    alerts.push({
      id: 'negative-position',
      level: 'danger',
      title: 'مركز مالي سالب بعد التسويات',
      detail: `الرصيد النهائي (نقد + لنا + مخزون − علينا) = ${Math.round(ctx.finalNetPosition).toLocaleString('ar-LY')} د.ل.`,
      href: '/treasury',
    });
  }

  const overdueCustomers = ctx.customers.filter((c) => c.overdueAmount > 0);
  if (overdueCustomers.length) {
    alerts.push({
      id: 'overdue',
      level: 'warning',
      title: 'مستحقات متأخرة',
      detail: `${overdueCustomers.length} عميل لديه مبالغ متأخرة عن السداد.`,
      href: '/debts',
    });
  }

  const overLimit = ctx.customers.filter((c) => c.creditLimit > 0 && c.outstanding > c.creditLimit);
  if (overLimit.length) {
    alerts.push({
      id: 'credit-limit',
      level: 'warning',
      title: 'تجاوز حد الائتمان',
      detail: `${overLimit.length} عميل تجاوز حدّ الائتمان الممنوح له.`,
      href: '/customers',
    });
  }

  const highPayableFarmers = ctx.farmers.filter((f) => f.creditBalance > 10_000);
  if (highPayableFarmers.length) {
    alerts.push({
      id: 'farmer-payables',
      level: 'info',
      title: 'ديون فلاحين مرتفعة',
      detail: `${highPayableFarmers.length} فلاح لديه مستحقات تتجاوز 10,000 د.ل — راجع جدول الدفع.`,
      href: '/debts',
    });
  }

  const onHold = ctx.data.customers.filter((c) => c.onHold);
  if (onHold.length) {
    alerts.push({
      id: 'on-hold',
      level: 'info',
      title: 'حسابات مجمّدة',
      detail: `${onHold.length} حساب عميل مجمّد حالياً.`,
      href: '/customers',
    });
  }

  if (ctx.activeSession?.status === 'open' && ctx.activeSession.periodTo) {
    const daysLeft = Math.ceil(
      (new Date(ctx.activeSession.periodTo + 'T23:59:59').getTime() - Date.now()) / 86_400_000,
    );
    if (daysLeft >= 0 && daysLeft <= 3) {
      alerts.push({
        id: 'session-ending',
        level: daysLeft === 0 ? 'danger' : 'warning',
        title: daysLeft === 0 ? 'الفترة تنتهي اليوم' : `الفترة تنتهي خلال ${daysLeft} يوم`,
        detail: `فترة «${ctx.activeSession.label}» تنتهي ${ctx.activeSession.periodTo} — راجع الإقفال والترحيل.`,
        href: '/sessions',
      });
    }
  }

  const levelOrder: Record<SystemAlert['level'], number> = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
}
